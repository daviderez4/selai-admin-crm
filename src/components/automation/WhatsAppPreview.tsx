'use client';

import { useState, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  ExternalLink,
  Check,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GeneratedMessage {
  phone: string;
  formattedPhone: string;
  name: string;
  message: string;
  waLink: string;
}

interface WhatsAppPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  messages: GeneratedMessage[];
  templateName?: string;
  onSendAll?: () => void;
}

export function WhatsAppPreview({
  isOpen,
  onClose,
  messages,
  templateName,
  onSendAll,
}: WhatsAppPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openedLinks, setOpenedLinks] = useState<Set<number>>(new Set());

  const currentMessage = messages[currentIndex];

  const handleCopy = async (index: number) => {
    const msg = messages[index];
    try {
      await navigator.clipboard.writeText(msg.message);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenLink = (index: number) => {
    const msg = messages[index];
    window.open(msg.waLink, '_blank');
    setOpenedLinks(prev => new Set(prev).add(index));
  };

  const handleOpenAll = () => {
    // Open links with delay to avoid popup blocking
    messages.forEach((msg, index) => {
      setTimeout(() => {
        window.open(msg.waLink, '_blank');
        setOpenedLinks(prev => new Set(prev).add(index));
      }, index * 500); // 500ms delay between each
    });
  };

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(messages.length - 1, prev + 1));
  };

  const stats = useMemo(() => ({
    total: messages.length,
    opened: openedLinks.size,
    remaining: messages.length - openedLinks.size,
  }), [messages.length, openedLinks.size]);

  if (!isOpen || messages.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
          dir="rtl"
        >
          {/* Header */}
          <div className="bg-green-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6" />
              <div>
                <h2 className="text-lg font-bold">תצוגת הודעות WhatsApp</h2>
                {templateName && (
                  <p className="text-green-100 text-sm">תבנית: {templateName}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-green-700"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Stats Bar */}
          <div className="bg-green-50 px-6 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-green-600" />
                <span className="font-medium">{stats.total}</span> נמענים
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-green-600" />
                <span className="font-medium">{stats.opened}</span> נשלחו
              </span>
              {stats.remaining > 0 && (
                <span className="text-slate-500">
                  {stats.remaining} נותרו
                </span>
              )}
            </div>
            {messages.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAll}
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                <ExternalLink className="h-4 w-4 ml-1.5" />
                פתח הכל ({messages.length})
              </Button>
            )}
          </div>

          {/* Message Preview */}
          <div className="p-6 overflow-y-auto max-h-[50vh]">
            {/* Navigation for multiple messages */}
            {messages.length > 1 && (
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentIndex === 0}
                >
                  <ChevronRight className="h-4 w-4" />
                  הקודם
                </Button>
                <span className="text-sm text-slate-500">
                  {currentIndex + 1} מתוך {messages.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={currentIndex === messages.length - 1}
                >
                  הבא
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Current Message Card */}
            <div className="bg-slate-50 rounded-lg p-4 border">
              {/* Recipient Info */}
              <div className="flex items-center justify-between mb-3 pb-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      {currentMessage.name || 'ללא שם'}
                    </p>
                    <p className="text-sm text-slate-500 font-mono" dir="ltr">
                      +{currentMessage.formattedPhone}
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "px-2 py-1 rounded text-xs font-medium",
                  openedLinks.has(currentIndex)
                    ? "bg-green-100 text-green-700"
                    : "bg-slate-200 text-slate-600"
                )}>
                  {openedLinks.has(currentIndex) ? 'נשלח' : 'ממתין'}
                </div>
              </div>

              {/* Message Content - WhatsApp Style */}
              <div className="bg-[#dcf8c6] rounded-lg p-3 shadow-sm relative max-w-[90%] mr-auto">
                <p className="text-slate-800 whitespace-pre-wrap text-right leading-relaxed">
                  {currentMessage.message}
                </p>
                {/* WhatsApp tail */}
                <div className="absolute top-0 left-[-8px] w-0 h-0 border-t-[8px] border-t-[#dcf8c6] border-l-[8px] border-l-transparent" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-slate-50 border-t flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => handleCopy(currentIndex)}
              className="flex items-center gap-2"
            >
              {copiedIndex === currentIndex ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  הועתק!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  העתק הודעה
                </>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={onClose}
              >
                סגור
              </Button>
              <Button
                onClick={() => handleOpenLink(currentIndex)}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                פתח ב-WhatsApp
              </Button>
            </div>
          </div>

          {/* Message List (for bulk) */}
          {messages.length > 3 && (
            <div className="px-6 py-4 border-t bg-white">
              <h3 className="text-sm font-medium text-slate-700 mb-2">כל הנמענים:</h3>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors",
                      currentIndex === index
                        ? "bg-green-100 border border-green-300"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{msg.name || msg.phone}</span>
                      {openedLinks.has(index) && (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLink(index);
                      }}
                      className="text-green-600 hover:text-green-700 text-sm"
                    >
                      שלח
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Hook for managing WhatsApp preview state
export function useWhatsAppPreview() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<GeneratedMessage[]>([]);
  const [templateName, setTemplateName] = useState<string>('');

  const openPreview = (
    newMessages: GeneratedMessage[],
    name?: string
  ) => {
    setMessages(newMessages);
    setTemplateName(name || '');
    setIsOpen(true);
  };

  const closePreview = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    messages,
    templateName,
    openPreview,
    closePreview,
  };
}
