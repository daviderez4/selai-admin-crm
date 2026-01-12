'use client';

const stats = [
  { value: '410+', label: 'סוכנים פעילים', icon: '👥' },
  { value: '50K+', label: 'פוליסות מנוהלות', icon: '📋' },
  { value: '99.9%', label: 'זמינות מערכת', icon: '⚡' },
  { value: '70%', label: 'חיסכון בזמן', icon: '⏱️' },
];

export function StatsSection() {
  return (
    <section id="stats" className="py-20 bg-slate-800" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl mb-3">{stat.icon}</div>
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-slate-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
