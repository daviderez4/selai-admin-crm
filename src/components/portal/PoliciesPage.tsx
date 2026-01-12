'use client';

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

export function PoliciesPage() {
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
