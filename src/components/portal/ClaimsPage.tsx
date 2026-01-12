'use client';

import { useState } from 'react';

const existingClaims = [
  {
    id: 1,
    type: 'רכב',
    date: '15/01/2024',
    status: 'בטיפול',
    description: 'תאונה קלה - פגיעה במראה',
    statusColor: 'bg-yellow-100 text-yellow-700',
  },
];

export function ClaimsPage() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">תביעות</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          פתח תביעה חדשה
        </button>
      </div>

      {/* New Claim Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">פתיחת תביעה חדשה</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">סוג הפוליסה</label>
              <select className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option>רכב</option>
                <option>דירה</option>
                <option>בריאות</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">תאריך האירוע</label>
              <input
                type="date"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">תיאור האירוע</label>
              <textarea
                rows={4}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="תאר את האירוע בפירוט..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">צירוף מסמכים</label>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center">
                <p className="text-slate-500">גרור קבצים לכאן או לחץ לבחירה</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                שלח תביעה
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Existing Claims */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">התביעות שלי</h2>
        {existingClaims.length > 0 ? (
          existingClaims.map((claim) => (
            <div key={claim.id} className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">תביעת {claim.type}</h3>
                  <p className="text-sm text-slate-500 mt-1">{claim.description}</p>
                  <p className="text-sm text-slate-400 mt-2">תאריך: {claim.date}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${claim.statusColor}`}>
                  {claim.status}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl p-12 border border-slate-200 text-center">
            <p className="text-slate-500">אין תביעות פתוחות</p>
          </div>
        )}
      </div>
    </div>
  );
}
