'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ============================================
// CLIENT PORTAL - COMPLETE SYSTEM
// ============================================

// Portal Navigation Links
const portalLinks = [
  { href: '/portal', label: 'סקירה כללית', icon: '🏠' },
  { href: '/portal/policies', label: 'הפוליסות שלי', icon: '📋' },
  { href: '/portal/documents', label: 'מסמכים', icon: '📁' },
  { href: '/portal/messages', label: 'הודעות', icon: '💬' },
  { href: '/portal/claims', label: 'תביעות', icon: '📝' },
  { href: '/portal/profile', label: 'פרופיל', icon: '👤' },
];

// ============================================
// PORTAL LAYOUT
// ============================================
export function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mock user data
  const user = {
    name: 'דוד כהן',
    email: 'david@example.com',
    agent: {
      name: 'ישראל ישראלי',
      phone: '050-1234567',
      email: 'agent@selai.co.il'
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/portal" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <span className="text-slate-800 font-bold">SelaiOS</span>
                <span className="text-slate-400 text-xs block">פורטל לקוחות</span>
              </div>
            </Link>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden sm:block">שלום, {user.name}</span>
              <button className="text-sm text-slate-500 hover:text-slate-700">
                התנתק
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-slate-500"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <nav className="space-y-1 sticky top-24">
              {portalLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    pathname === link.href
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </nav>

            {/* Agent Card */}
            <div className="mt-8 p-4 bg-white rounded-xl border border-slate-200">
              <p className="text-xs text-slate-400 mb-2">הסוכן שלי</p>
              <p className="font-medium text-slate-800">{user.agent.name}</p>
              <p className="text-sm text-blue-600">{user.agent.phone}</p>
            </div>
          </aside>

          {/* Mobile Sidebar */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)}></div>
              <aside className="absolute right-0 top-0 h-full w-72 bg-white p-6 shadow-xl">
                <nav className="space-y-1">
                  {portalLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                        pathname === link.href
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-slate-600'
                      }`}
                    >
                      <span className="text-xl">{link.icon}</span>
                      <span>{link.label}</span>
                    </Link>
                  ))}
                </nav>
              </aside>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

// ============================================
// PORTAL DASHBOARD
// ============================================
export function PortalDashboard() {
  const user = { name: 'דוד כהן' };
  
  const stats = [
    { icon: '📋', value: '3', label: 'פוליסות פעילות', color: 'bg-blue-50 text-blue-600' },
    { icon: '📁', value: '12', label: 'מסמכים', color: 'bg-green-50 text-green-600' },
    { icon: '💬', value: '2', label: 'הודעות חדשות', color: 'bg-purple-50 text-purple-600' },
    { icon: '📝', value: '0', label: 'תביעות פתוחות', color: 'bg-orange-50 text-orange-600' },
  ];

  const recentActivity = [
    { icon: '📋', text: 'פוליסת רכב חודשה', time: 'לפני שעתיים', type: 'policy' },
    { icon: '📁', text: 'מסמך חדש הועלה', time: 'אתמול', type: 'document' },
    { icon: '💬', text: 'הודעה חדשה מהסוכן', time: 'לפני 3 ימים', type: 'message' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-l from-blue-500 to-purple-600 rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-bold mb-2">שלום {user.name} 👋</h1>
        <p className="text-blue-100">ברוך הבא לפורטל הלקוחות שלך</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-xl p-5 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${stat.color}`}>
                {stat.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                <p className="text-sm text-slate-500">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Agent Contact */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">הסוכן שלי</h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
              י
            </div>
            <div className="flex-1">
              <p className="font-medium text-slate-800">ישראל ישראלי</p>
              <p className="text-sm text-slate-500">סוכן ביטוח מורשה</p>
              <p className="text-sm text-blue-600">050-1234567</p>
            </div>
            <Link
              href="/portal/messages"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              שלח הודעה
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">פעילות אחרונה</h2>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{item.text}</p>
                  <p className="text-xs text-slate-400">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '📋', label: 'צפה בפוליסות', href: '/portal/policies' },
            { icon: '📁', label: 'העלה מסמך', href: '/portal/documents' },
            { icon: '📝', label: 'פתח תביעה', href: '/portal/claims' },
            { icon: '💬', label: 'צור קשר', href: '/portal/messages' },
          ].map((action, i) => (
            <Link
              key={i}
              href={action.href}
              className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <span className="text-3xl">{action.icon}</span>
              <span className="text-sm text-slate-600">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// POLICIES PAGE
// ============================================
export function PoliciesPage() {
  const policies = [
    {
      id: 1,
      type: 'רכב',
      company: 'הראל',
      number: 'POL-2024-001',
      status: 'פעילה',
      endDate: '15/03/2025',
      premium: 3500,
      icon: '🚗',
    },
    {
      id: 2,
      type: 'דירה',
      company: 'מגדל',
      number: 'POL-2024-002',
      status: 'פעילה',
      endDate: '01/06/2025',
      premium: 1200,
      icon: '🏠',
    },
    {
      id: 3,
      type: 'בריאות',
      company: 'כלל',
      number: 'POL-2024-003',
      status: 'פעילה',
      endDate: '31/12/2025',
      premium: 450,
      icon: '❤️',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">הפוליסות שלי</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
          {policies.length} פוליסות פעילות
        </span>
      </div>

      <div className="space-y-4">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-3xl">
                  {policy.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">ביטוח {policy.type}</h3>
                  <p className="text-sm text-slate-500">{policy.company} | {policy.number}</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                {policy.status}
              </span>
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-8">
                <div>
                  <p className="text-xs text-slate-400 mb-1">תוקף עד</p>
                  <p className="font-medium text-slate-800">{policy.endDate}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">פרמיה חודשית</p>
                  <p className="font-medium text-slate-800">₪{policy.premium.toLocaleString()}</p>
                </div>
              </div>
              <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
                צפה בפרטים
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// DOCUMENTS PAGE
// ============================================
export function DocumentsPage() {
  const documents = [
    { id: 1, name: 'פוליסת רכב 2024', type: 'PDF', size: '2.4 MB', date: '15/01/2024', icon: '📄' },
    { id: 2, name: 'תעודת ביטוח דירה', type: 'PDF', size: '1.8 MB', date: '10/01/2024', icon: '📄' },
    { id: 3, name: 'אישור ביטוח בריאות', type: 'PDF', size: '890 KB', date: '01/01/2024', icon: '📄' },
    { id: 4, name: 'טופס תביעה', type: 'DOCX', size: '156 KB', date: '20/12/2023', icon: '📝' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">המסמכים שלי</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          העלה מסמך
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <div key={doc.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-2xl">{doc.icon}</span>
                <div>
                  <p className="font-medium text-slate-800">{doc.name}</p>
                  <p className="text-sm text-slate-400">{doc.type} • {doc.size}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-400">{doc.date}</span>
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// MESSAGES PAGE
// ============================================
export function MessagesPage() {
  const [message, setMessage] = useState('');
  
  const messages = [
    {
      id: 1,
      from: 'agent',
      name: 'ישראל ישראלי',
      text: 'שלום דוד, הפוליסה שלך חודשה בהצלחה. יש לך שאלות?',
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
              placeholder="כתוב הודעה..."
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
              שלח
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORT ALL
// ============================================
export default {
  PortalLayout,
  PortalDashboard,
  PoliciesPage,
  DocumentsPage,
  MessagesPage,
};
