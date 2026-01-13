'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Minimize2,
  Maximize2,
  Loader2,
  MessageSquare,
  Sparkles,
  Lightbulb,
  HelpCircle,
  RefreshCw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface SuggestedQuestion {
  text: string;
  category: string;
}

// Knowledge base categories and common questions
const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { text: 'מהי פוליסת ביטוח חיים?', category: 'ביטוח' },
  { text: 'איך מחשבים עמלת סוכן?', category: 'עמלות' },
  { text: 'מה ההבדל בין קרן פנסיה לביטוח מנהלים?', category: 'פנסיה' },
  { text: 'איך מוסיפים ליד חדש למערכת?', category: 'מערכת' },
  { text: 'מהי פוליסת אובדן כושר עבודה?', category: 'ביטוח' },
  { text: 'איך מייצאים דוח לקוחות?', category: 'מערכת' },
];

// Simple knowledge base for demo (in production would use RAG/vector search)
const KNOWLEDGE_BASE: Record<string, string> = {
  'פוליסת ביטוח חיים': `
**פוליסת ביטוח חיים** היא חוזה ביטוח המספק פיצוי כספי למוטבים במקרה של פטירת המבוטח.

**סוגי פוליסות עיקריים:**
1. **ריסק (טהורה)** - כיסוי למקרה מוות בלבד, ללא מרכיב חיסכון
2. **עם מרכיב חיסכון** - משלבת כיסוי ביטוחי עם צבירת ערך
3. **משכנתא** - מיועדת לכיסוי יתרת משכנתא

**יתרונות:**
- הגנה כלכלית למשפחה
- גמישות בבחירת סכום ביטוח
- אפשרות להוסיף כיסויים נוספים (נכות, מחלות קשות)
  `,
  'עמלת סוכן': `
**חישוב עמלת סוכן** מבוסס על מספר פרמטרים:

**סוגי עמלות:**
1. **עמלת היקף (scope)** - אחוז מהפרמיה הראשונית
2. **עמלת נפרעים** - עמלה על פרמיות מתמשכות
3. **בונוס יעדים** - תגמול על עמידה ביעדים

**דוגמה לחישוב:**
- פרמיה חודשית: 1,000 ₪
- עמלת היקף: 20% = 200 ₪
- עמלת נפרעים שנתית: 5% = 600 ₪/שנה

**טיפ:** ניתן לצפות בדוחות עמלות מפורטים בדשבורד העמלות
  `,
  'קרן פנסיה': `
**קרן פנסיה vs ביטוח מנהלים**

| פרמטר | קרן פנסיה | ביטוח מנהלים |
|-------|----------|--------------|
| דמי ניהול | עד 0.5% מהצבירה + 4% מההפקדה | עד 1.05% מהצבירה |
| גמישות | פחות גמיש | יותר גמיש |
| כיסויים | כלולים | נוספים בתשלום |
| מיסוי | פטור | תלוי מסלול |

**מתי להעדיף קרן פנסיה?**
- עובדים שכירים
- מעדיפים דמי ניהול נמוכים
- לא צריכים כיסויים מותאמים אישית

**מתי להעדיף ביטוח מנהלים?**
- עצמאים
- צריכים גמישות בכיסויים
- מעדיפים בחירה במסלול השקעה
  `,
  'ליד חדש': `
**הוספת ליד חדש למערכת**

1. **גישה מהירה:**
   - לחץ על "+" בדף הבית
   - או עבור ללידים > "ליד חדש"

2. **שדות חובה:**
   - שם מלא
   - טלפון או אימייל
   - מקור הליד

3. **שדות מומלצים:**
   - תאריך לידה
   - סטטוס משפחתי
   - הערות ראשוניות

4. **לאחר היצירה:**
   - הליד יופיע בלוח הקאנבן
   - ניתן לשייך לסוכן
   - ניתן להמיר לאיש קשר

**טיפ:** השתמש בייבוא Excel להוספת לידים מרובים
  `,
  'אובדן כושר עבודה': `
**ביטוח אובדן כושר עבודה (אכ"ע)**

מספק פיצוי חודשי כאשר המבוטח לא יכול לעבוד עקב מחלה או תאונה.

**מאפיינים עיקריים:**
- פיצוי עד 75% מההכנסה
- תקופת המתנה (בדר"כ 30-90 יום)
- תקופת ביטוח עד גיל 67

**סוגי הגדרות:**
1. **עיסוקי** - לא יכול לעסוק במקצועו
2. **כללי** - לא יכול לעסוק בכל עבודה
3. **משולב** - שנתיים עיסוקי, אח"כ כללי

**שיקולים בבחירת פוליסה:**
- גובה הפיצוי החודשי
- הגדרת אכ"ע
- החרגות ותנאים
  `,
  'ייצוא דוח': `
**ייצוא דוחות במערכת**

**שלבים לייצוא:**
1. עבור לאזור הדוחות
2. בחר את סוג הדוח
3. הגדר פילטרים (תאריכים, סוכנים וכו')
4. לחץ על "ייצוא"
5. בחר פורמט (Excel/PDF/CSV)

**סוגי דוחות זמינים:**
- דוח לקוחות
- דוח לידים
- דוח עסקאות
- דוח עמלות
- דוח פעילות סוכנים

**טיפ:** ניתן לתזמן שליחת דוחות אוטומטית לאימייל
  `,
};

export default function KnowledgeChat() {
  const { user } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'faq'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `שלום ${user?.user_metadata?.full_name || 'לך'}! 👋\n\nאני בוט הידע של סלע. אני יכול לעזור לך עם:\n• מידע על מוצרי ביטוח ופנסיה\n• שאלות על שימוש במערכת\n• חישובי עמלות\n• הסברים על תהליכים\n\nאיך אפשר לעזור?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findAnswer = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    // Search knowledge base for relevant answer
    for (const [key, value] of Object.entries(KNOWLEDGE_BASE)) {
      if (lowerQuery.includes(key.toLowerCase()) ||
          key.toLowerCase().split(' ').some(word => lowerQuery.includes(word))) {
        return value;
      }
    }

    // Check for specific patterns
    if (lowerQuery.includes('ליד') || lowerQuery.includes('lead')) {
      return KNOWLEDGE_BASE['ליד חדש'];
    }
    if (lowerQuery.includes('עמלה') || lowerQuery.includes('עמלות')) {
      return KNOWLEDGE_BASE['עמלת סוכן'];
    }
    if (lowerQuery.includes('פנסיה') || lowerQuery.includes('מנהלים')) {
      return KNOWLEDGE_BASE['קרן פנסיה'];
    }
    if (lowerQuery.includes('חיים') || lowerQuery.includes('ביטוח')) {
      return KNOWLEDGE_BASE['פוליסת ביטוח חיים'];
    }
    if (lowerQuery.includes('אובדן') || lowerQuery.includes('כושר')) {
      return KNOWLEDGE_BASE['אובדן כושר עבודה'];
    }
    if (lowerQuery.includes('דוח') || lowerQuery.includes('ייצוא') || lowerQuery.includes('אקסל')) {
      return KNOWLEDGE_BASE['ייצוא דוח'];
    }

    // Default response
    return `לא מצאתי תשובה ספציפית לשאלתך. הנה כמה דברים שאני יכול לעזור בהם:

• **מידע על ביטוח** - פוליסות חיים, בריאות, אכ"ע
• **פנסיה וחיסכון** - קרנות פנסיה, ביטוח מנהלים, קופות גמל
• **שימוש במערכת** - הוספת לידים, ייצוא דוחות, ניהול לקוחות
• **עמלות** - חישובים, דוחות, מעקב

נסה לשאול שאלה ספציפית יותר, או בחר מהשאלות המומלצות.`;
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: typingId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    }]);

    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    const answer = findAnswer(input);

    // Remove typing indicator and add real response
    setMessages(prev => [
      ...prev.filter(m => m.id !== typingId),
      {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      },
    ]);

    setIsLoading(false);
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
    setActiveTab('chat');
    setTimeout(() => handleSend(), 100);
  };

  const handleCopy = async (content: string, id: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    toast.success('הועתק ללוח');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (messageId: string, positive: boolean) => {
    toast.success(positive ? 'תודה על המשוב החיובי!' : 'נרשם. נשתפר!');
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: `שיחה חדשה התחילה. איך אפשר לעזור?`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-24 left-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all"
            >
              <BookOpen className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-50"
          >
            <Card className={`bg-white shadow-2xl border-slate-200 ${isMinimized ? 'w-80' : 'w-[420px]'}`}>
              <CardHeader className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">מרכז הידע</CardTitle>
                      <p className="text-xs text-white/70">שאל אותי הכל על ביטוח ופנסיה</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                      onClick={clearChat}
                      title="שיחה חדשה"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                      onClick={() => setIsMinimized(!isMinimized)}
                    >
                      {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                      onClick={() => setIsOpen(false)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {!isMinimized && (
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'chat' | 'faq')}>
                    <TabsList className="w-full rounded-none border-b">
                      <TabsTrigger value="chat" className="flex-1">
                        <MessageSquare className="h-4 w-4 ml-1" />
                        שיחה
                      </TabsTrigger>
                      <TabsTrigger value="faq" className="flex-1">
                        <HelpCircle className="h-4 w-4 ml-1" />
                        שאלות נפוצות
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="chat" className="m-0">
                      {/* Messages */}
                      <div className="h-80 overflow-y-auto p-4 space-y-4" dir="rtl">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                          >
                            <div
                              className={`max-w-[90%] rounded-lg p-3 ${
                                message.role === 'user'
                                  ? 'bg-emerald-100 text-emerald-900'
                                  : 'bg-slate-100 text-slate-900'
                              }`}
                            >
                              {message.isTyping ? (
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                              ) : (
                                <>
                                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                                  {message.role === 'assistant' && message.content.length > 50 && (
                                    <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-200">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2"
                                        onClick={() => handleCopy(message.content, message.id)}
                                      >
                                        {copiedId === message.id ? (
                                          <Check className="h-3 w-3 text-green-600" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2"
                                        onClick={() => handleFeedback(message.id, true)}
                                      >
                                        <ThumbsUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2"
                                        onClick={() => handleFeedback(message.id, false)}
                                      >
                                        <ThumbsDown className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Input */}
                      <div className="p-3 border-t" dir="rtl">
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                          }}
                          className="flex gap-2"
                        >
                          <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="שאל שאלה..."
                            className="flex-1"
                            disabled={isLoading}
                          />
                          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
                            {isLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </form>
                      </div>
                    </TabsContent>

                    <TabsContent value="faq" className="m-0">
                      <div className="h-96 overflow-y-auto p-4 space-y-3" dir="rtl">
                        <p className="text-sm text-muted-foreground mb-4">
                          לחץ על שאלה כדי לקבל תשובה:
                        </p>
                        {SUGGESTED_QUESTIONS.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestedQuestion(q.text)}
                            className="w-full p-3 text-right rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              <Lightbulb className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-slate-800">{q.text}</p>
                                <Badge variant="secondary" className="mt-1 text-xs">
                                  {q.category}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
