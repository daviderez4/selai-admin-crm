'use client';

import { useState } from 'react';

const initialMessages = [
  {
    id: 1,
    from: 'agent',
    name: 'ישראל ישראלי',
    text: 'שלום, הפוליסה שלך חודשה בהצלחה. יש לך שאלות?',
    time: 'היום, 10:30',
  },
  {
    id: 2,
    from: 'me',
    text: 'תודה רבה! האם יש שינוי בפרמיה?',
    time: 'היום, 10:45',
  },
  {
    id: 3,
    from: 'agent',
    name: 'ישראל ישראלי',
    text: 'הפרמיה נשארת ללא שינוי. אם תרצה לבדוק אפשרויות לחיסכון, אשמח לתאם שיחה.',
    time: 'היום, 11:00',
  },
];

export function MessagesPage() {
  const [message, setMessage] = useState('');
  const [messages] = useState(initialMessages);

  const handleSend = () => {
    if (!message.trim()) return;
    // Here you would typically send to backend
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">הודעות</h1>

      <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[600px]">
        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.from === 'me' ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[70%] p-4 rounded-2xl ${
                  msg.from === 'me'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}
              >
                {msg.from === 'agent' && (
                  <p className="text-xs font-medium mb-1 opacity-70">{msg.name}</p>
                )}
                <p>{msg.text}</p>
                <p className={`text-xs mt-2 ${msg.from === 'me' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="כתוב הודעה..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSend}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
