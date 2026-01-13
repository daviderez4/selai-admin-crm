'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Send,
  X,
  MessageCircle,
  Minimize2,
  Maximize2,
  Loader2,
  Home,
  Users,
  FileText,
  Settings,
  BarChart3,
  Calendar,
  MessageSquare,
  Shield,
  Target,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: NavigationSuggestion[];
}

interface NavigationSuggestion {
  label: string;
  path: string;
  icon: string;
  description: string;
}

// Navigation knowledge base
const NAVIGATION_MAP: Record<string, NavigationSuggestion> = {
  home: { label: 'דף הבית', path: '/', icon: 'home', description: 'דף הבית הראשי' },
  dashboard: { label: 'לוח בקרה', path: '/dashboard', icon: 'chart', description: 'צפה בסטטיסטיקות ונתונים' },
  contacts: { label: 'אנשי קשר', path: '/contacts', icon: 'users', description: 'ניהול אנשי קשר ולקוחות' },
  leads: { label: 'לידים', path: '/leads', icon: 'target', description: 'ניהול לידים והזדמנויות' },
  deals: { label: 'עסקאות', path: '/deals', icon: 'briefcase', description: 'מעקב אחר עסקאות' },
  tasks: { label: 'משימות', path: '/tasks', icon: 'file', description: 'ניהול משימות יומיומיות' },
  calendar: { label: 'יומן', path: '/calendar', icon: 'calendar', description: 'לוח שנה ופגישות' },
  messages: { label: 'הודעות', path: '/messages', icon: 'message', description: 'צ׳אט והודעות' },
  settings: { label: 'הגדרות', path: '/settings', icon: 'settings', description: 'אזור אישי והגדרות' },
  admin: { label: 'ניהול', path: '/admin', icon: 'shield', description: 'פאנל ניהול מערכת' },
  projects: { label: 'פרויקטים', path: '/projects', icon: 'briefcase', description: 'ניהול פרויקטים' },
};

// Keywords mapping to navigation
const KEYWORD_MAP: Record<string, string[]> = {
  home: ['בית', 'ראשי', 'התחלה', 'home'],
  dashboard: ['דשבורד', 'לוח בקרה', 'סטטיסטיקות', 'נתונים', 'dashboard', 'analytics'],
  contacts: ['אנשי קשר', 'לקוחות', 'contacts', 'customers', 'clients'],
  leads: ['לידים', 'leads', 'prospects', 'הזדמנויות'],
  deals: ['עסקאות', 'deals', 'מכירות', 'sales'],
  tasks: ['משימות', 'tasks', 'todos', 'מטלות'],
  calendar: ['יומן', 'לוח שנה', 'פגישות', 'calendar', 'meetings'],
  messages: ['הודעות', 'צאט', 'chat', 'messages'],
  settings: ['הגדרות', 'settings', 'אישי', 'profile', 'פרופיל', 'אינטגרציות'],
  admin: ['ניהול', 'admin', 'מנהל', 'משתמשים', 'users'],
  projects: ['פרויקטים', 'projects'],
};

export default function NavigationAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'שלום! אני העוזר שלך. איך אפשר לעזור? תוכל לשאול אותי לאן לנווט או מה ניתן לעשות במערכת.',
      suggestions: [
        NAVIGATION_MAP.dashboard,
        NAVIGATION_MAP.contacts,
        NAVIGATION_MAP.leads,
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const findRelevantNavigation = (query: string): NavigationSuggestion[] => {
    const lowerQuery = query.toLowerCase();
    const results: NavigationSuggestion[] = [];

    for (const [key, keywords] of Object.entries(KEYWORD_MAP)) {
      if (keywords.some(kw => lowerQuery.includes(kw.toLowerCase()))) {
        results.push(NAVIGATION_MAP[key]);
      }
    }

    // If no specific matches, provide general suggestions
    if (results.length === 0) {
      return [
        NAVIGATION_MAP.dashboard,
        NAVIGATION_MAP.contacts,
        NAVIGATION_MAP.settings,
      ];
    }

    return results.slice(0, 3);
  };

  const generateResponse = (query: string): { content: string; suggestions: NavigationSuggestion[] } => {
    const suggestions = findRelevantNavigation(query);

    if (suggestions.length === 0) {
      return {
        content: 'לא מצאתי התאמה מדויקת. הנה כמה אפשרויות שיכולות לעזור:',
        suggestions: [NAVIGATION_MAP.home, NAVIGATION_MAP.dashboard, NAVIGATION_MAP.settings],
      };
    }

    const suggestionNames = suggestions.map(s => s.label).join(', ');
    return {
      content: `מצאתי! הנה מה שחיפשת: ${suggestionNames}. לחץ על אחת האפשרויות למעבר מהיר:`,
      suggestions,
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    const response = generateResponse(input);
    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content,
      suggestions: response.suggestions,
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleNavigate = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const getIcon = (iconName: string) => {
    const icons: Record<string, React.ReactNode> = {
      home: <Home className="h-4 w-4" />,
      chart: <BarChart3 className="h-4 w-4" />,
      users: <Users className="h-4 w-4" />,
      target: <Target className="h-4 w-4" />,
      briefcase: <Briefcase className="h-4 w-4" />,
      file: <FileText className="h-4 w-4" />,
      calendar: <Calendar className="h-4 w-4" />,
      message: <MessageSquare className="h-4 w-4" />,
      settings: <Settings className="h-4 w-4" />,
      shield: <Shield className="h-4 w-4" />,
    };
    return icons[iconName] || <FileText className="h-4 w-4" />;
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
            className="fixed bottom-6 left-6 z-50"
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
            >
              <Bot className="h-6 w-6" />
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
            className="fixed bottom-6 left-6 z-50"
          >
            <Card className={`bg-white shadow-2xl border-slate-200 ${isMinimized ? 'w-72' : 'w-96'}`}>
              <CardHeader className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Bot className="h-5 w-5" />
                    <CardTitle className="text-sm font-medium">עוזר ניווט</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
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
                  {/* Messages */}
                  <div className="h-80 overflow-y-auto p-4 space-y-4" dir="rtl">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-slate-100 text-slate-900'
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {message.suggestions.map((suggestion, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-right"
                                  onClick={() => handleNavigate(suggestion.path)}
                                >
                                  <span className="ml-2">{getIcon(suggestion.icon)}</span>
                                  <span>{suggestion.label}</span>
                                  <Badge variant="secondary" className="mr-auto text-xs">
                                    {suggestion.description}
                                  </Badge>
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-end">
                        <div className="bg-slate-100 rounded-lg p-3">
                          <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                        </div>
                      </div>
                    )}
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
                        placeholder="לאן תרצה לנווט?"
                        className="flex-1"
                      />
                      <Button type="submit" size="icon" disabled={isLoading}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
