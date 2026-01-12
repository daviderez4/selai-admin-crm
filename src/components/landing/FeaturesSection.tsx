'use client';

const features = [
  {
    icon: '🤖',
    title: 'סוכן AI אוטונומי',
    description: 'סוכן וירטואלי שעובד 24/7, מנתח נתונים ומנהל תקשורת אוטומטית',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '📊',
    title: 'דשבורד בזמן אמת',
    description: 'צפייה מיידית בלידים, עסקאות, פוליסות ועמלות במקום אחד',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: '💬',
    title: 'WhatsApp Bot חכם',
    description: 'בוט שעונה ללקוחות, מתאם פגישות ושולח תזכורות',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: '📁',
    title: 'ניהול מסמכים AI',
    description: 'סריקה אוטומטית, חילוץ נתונים ושמירה מאורגנת',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: '🔒',
    title: 'אבטחה מקסימלית',
    description: 'הצפנת נתונים, RLS, audit logs ותאימות רגולטורית',
    gradient: 'from-slate-600 to-slate-800',
  },
  {
    icon: '📈',
    title: 'אנליטיקס מתקדם',
    description: 'דוחות חכמים, תחזיות AI וניתוח פערי כיסוי',
    gradient: 'from-indigo-500 to-purple-500',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-white" dir="rtl">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-blue-600 font-medium text-sm uppercase tracking-wider">יכולות המערכת</span>
          <h2 className="text-4xl font-bold text-slate-800 mt-4">
            כל מה שצריך לסוכנות ביטוח חכמה
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="group p-8 bg-slate-50 rounded-2xl hover:bg-white hover:shadow-xl transition-all">
              <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-2xl mb-6`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-3">{feature.title}</h3>
              <p className="text-slate-500">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
