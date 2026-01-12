'use client';

const documents = [
  { id: 1, name: 'פוליסת רכב 2024', type: 'PDF', size: '2.4 MB', date: '15/01/2024', icon: '📄' },
  { id: 2, name: 'תעודת ביטוח דירה', type: 'PDF', size: '1.8 MB', date: '10/01/2024', icon: '📄' },
  { id: 3, name: 'אישור ביטוח בריאות', type: 'PDF', size: '890 KB', date: '01/01/2024', icon: '📄' },
  { id: 4, name: 'טופס תביעה', type: 'DOCX', size: '156 KB', date: '20/12/2023', icon: '📝' },
];

export function DocumentsPage() {
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
