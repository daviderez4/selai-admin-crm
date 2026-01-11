'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Message, MessageChannel, Contact } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
// Note: Using div with overflow for scrolling since scroll-area may not be available
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Send,
  Phone,
  MessageSquare,
  Mail,
  CheckCheck,
  Check,
  Clock,
  AlertCircle,
  Loader2,
  User,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Smile,
} from 'lucide-react';

const channelConfig: Record<MessageChannel, { label: string; icon: React.ElementType; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600' },
  sms: { label: 'SMS', icon: Phone, color: 'text-blue-600' },
  email: { label: 'אימייל', icon: Mail, color: 'text-purple-600' },
  internal: { label: 'פנימי', icon: MessageSquare, color: 'text-gray-600' },
};

interface ConversationPreview {
  contact: Contact;
  lastMessage: Message;
  unreadCount: number;
}

export function MessageInbox() {
  const params = useParams();
  const projectId = params.id as string;

  const {
    messages,
    selectedConversation,
    isLoadingMessages,
    fetchMessages,
    fetchConversation,
    sendMessage,
  } = useCRMStore();

  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChannel, setSelectedChannel] = useState<MessageChannel>('whatsapp');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (selectedContactId) {
      fetchConversation(selectedContactId);
    }
  }, [selectedContactId, fetchConversation]);

  // Group messages by contact to create conversation previews
  const getConversations = (): ConversationPreview[] => {
    const contactMap = new Map<string, ConversationPreview>();

    messages.forEach((message) => {
      if (!message.contact_id || !message.contact) return;

      const existing = contactMap.get(message.contact_id);
      const contact = message.contact as Contact;

      if (!existing || new Date(message.created_at) > new Date(existing.lastMessage.created_at)) {
        contactMap.set(message.contact_id, {
          contact,
          lastMessage: message,
          unreadCount: message.direction === 'inbound' && message.status !== 'read' ? 1 : 0,
        });
      } else if (message.direction === 'inbound' && message.status !== 'read') {
        existing.unreadCount++;
      }
    });

    return Array.from(contactMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime()
    );
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedContactId) return;

    setIsSending(true);
    try {
      await sendMessage({
        contact_id: selectedContactId,
        channel: selectedChannel,
        direction: 'outbound',
        content: newMessage.trim(),
        status: 'pending',
      });
      setNewMessage('');
      fetchConversation(selectedContactId);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'אתמול';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('he-IL', { weekday: 'short' });
    }
    return date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  };

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const conversations = getConversations();
  const filteredConversations = conversations.filter((conv) =>
    conv.contact.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    conv.contact.mobile?.includes(search) ||
    conv.contact.email?.toLowerCase().includes(search.toLowerCase())
  );

  const selectedContact = conversations.find(
    (c) => c.contact.id === selectedContactId
  )?.contact;

  if (isLoadingMessages && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">הודעות</h2>
        <div className="flex items-center gap-2">
          {Object.entries(channelConfig).map(([key, config]) => (
            <Badge
              key={key}
              variant="outline"
              className={`cursor-pointer ${selectedChannel === key ? 'bg-primary/10' : ''}`}
              onClick={() => setSelectedChannel(key as MessageChannel)}
            >
              <config.icon className={`h-3 w-3 ml-1 ${config.color}`} />
              {config.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-250px)] min-h-[500px]">
        {/* Conversations List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש שיחות..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>אין שיחות</p>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const ChannelIcon = channelConfig[conv.lastMessage.channel].icon;
                  return (
                    <div
                      key={conv.contact.id}
                      className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                        selectedContactId === conv.contact.id ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedContactId(conv.contact.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {conv.contact.full_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">
                              {conv.contact.full_name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {formatTime(conv.lastMessage.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <ChannelIcon
                              className={`h-3 w-3 ${
                                channelConfig[conv.lastMessage.channel].color
                              }`}
                            />
                            <span className="text-xs text-gray-500 truncate">
                              {conv.lastMessage.content?.substring(0, 40)}
                              {(conv.lastMessage.content?.length || 0) > 40 ? '...' : ''}
                            </span>
                          </div>
                        </div>
                        {conv.unreadCount > 0 && (
                          <Badge className="bg-primary text-white text-xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Chat Window */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedContactId && selectedContact ? (
            <>
              {/* Chat Header */}
              <CardHeader className="border-b py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedContact.full_name?.charAt(0) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-base">{selectedContact.full_name}</CardTitle>
                    <p className="text-xs text-gray-500">
                      {selectedContact.mobile || selectedContact.email}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Messages */}
              <CardContent className="flex-1 p-4 overflow-hidden">
                <div className="h-full overflow-y-auto">
                  <div className="space-y-4">
                    {selectedConversation.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>אין הודעות בשיחה זו</p>
                        <p className="text-sm">שלח הודעה להתחיל</p>
                      </div>
                    ) : (
                      selectedConversation.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.direction === 'outbound' ? 'justify-start' : 'justify-end'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              message.direction === 'outbound'
                                ? 'bg-primary text-white rounded-br-none'
                                : 'bg-gray-100 rounded-bl-none'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                                message.direction === 'outbound'
                                  ? 'text-white/70'
                                  : 'text-gray-500'
                              }`}
                            >
                              {formatTime(message.created_at)}
                              {message.direction === 'outbound' && getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>

              {/* Message Input */}
              <div className="border-t p-3">
                <div className="flex items-end gap-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <ImageIcon className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="הקלד הודעה..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    size="icon"
                    className="h-10 w-10"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <CardContent className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">בחר שיחה</h3>
                <p className="text-sm">בחר שיחה מהרשימה כדי לצפות בהודעות</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
