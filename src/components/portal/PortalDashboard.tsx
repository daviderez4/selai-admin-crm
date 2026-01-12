'use client';

import Link from 'next/link';

interface PortalDashboardProps {
  userName?: string;
}

export function PortalDashboard({ userName = 'אורח' }: PortalDashboardProps) {
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
        <h1 className="text-2xl font-bold mb-2">שלום {userName} 👋</h1>
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
