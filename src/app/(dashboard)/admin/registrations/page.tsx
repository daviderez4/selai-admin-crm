'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  Loader2,
  Database
} from 'lucide-react';

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  national_id: string;
  license_number: string;
  requested_role: string;
  status: string;
  sela_match_found: boolean;
  sela_match_data: Record<string, unknown>;
  match_confidence: number;
  match_method: string;
  created_at: string;
  supervisor?: { full_name: string };
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, [filter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registration?status=${filter}`);
      const data = await res.json();
      if (data.registrations) {
        setRegistrations(data.registrations);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/registration/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      if (res.ok) {
        fetchRegistrations();
        setSelectedReg(null);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/registration/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReason
        })
      });

      if (res.ok) {
        fetchRegistrations();
        setSelectedReg(null);
        setShowRejectModal(false);
        setRejectionReason('');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessing(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-100';
    if (confidence >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      agent: 'סוכן',
      supervisor: 'מפקח',
      manager: 'מנהל',
      client: 'לקוח'
    };
    return labels[role] || role;
  };

  const filteredRegistrations = registrations.filter(reg =>
    reg.full_name.includes(search) ||
    reg.email.includes(search) ||
    reg.phone.includes(search)
  );

  return (
    <div className="flex flex-col h-full">
      <Header title="בקשות הרשמה" />

      <div className="flex-1 p-6 space-y-6 overflow-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">בקשות הרשמה</h1>
            <p className="text-slate-500">ניהול ואישור בקשות הרשמה למערכת</p>
          </div>
          <button
            onClick={fetchRegistrations}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex bg-slate-100 rounded-xl p-1">
            {[
              { value: 'pending', label: 'ממתינות', icon: Clock },
              { value: 'approved', label: 'אושרו', icon: CheckCircle2 },
              { value: 'rejected', label: 'נדחו', icon: XCircle },
              { value: 'all', label: 'הכל', icon: Users }
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.value
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                <f.icon className="w-4 h-4" />
                {f.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש לפי שם, אימייל או טלפון..."
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'ממתינות', value: registrations.filter(r => r.status === 'pending').length, color: 'amber', icon: Clock },
            { label: 'אושרו', value: registrations.filter(r => r.status === 'approved').length, color: 'green', icon: CheckCircle2 },
            { label: 'עם התאמה במאגר', value: registrations.filter(r => r.sela_match_found).length, color: 'blue', icon: Database },
            { label: 'סה"כ', value: registrations.length, color: 'slate', icon: Users }
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Registrations List */}
        <div className="bg-white rounded-xl border border-slate-200">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">אין בקשות הרשמה</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredRegistrations.map((reg) => (
                <div
                  key={reg.id}
                  className="p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    {/* User Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800">{reg.full_name}</h3>
                        <p className="text-sm text-slate-500">{reg.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            {getRoleLabel(reg.requested_role)}
                          </span>
                          {reg.sela_match_found && (
                            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getConfidenceColor(reg.match_confidence)}`}>
                              <Database className="w-3 h-3" />
                              {reg.match_confidence}% התאמה
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {reg.status === 'pending' && (
                        <>
                          <button
                            onClick={() => setSelectedReg(reg)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="צפה בפרטים"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleApprove(reg.id)}
                            disabled={processing === reg.id}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50"
                          >
                            {processing === reg.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                            אשר
                          </button>
                          <button
                            onClick={() => { setSelectedReg(reg); setShowRejectModal(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                            דחה
                          </button>
                        </>
                      )}
                      {reg.status === 'approved' && (
                        <span className="flex items-center gap-2 text-green-600 text-sm">
                          <CheckCircle2 className="w-4 h-4" />
                          אושר
                        </span>
                      )}
                      {reg.status === 'rejected' && (
                        <span className="flex items-center gap-2 text-red-600 text-sm">
                          <XCircle className="w-4 h-4" />
                          נדחה
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sela Match Data Preview */}
                  {reg.sela_match_found && reg.sela_match_data && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                      <p className="text-sm font-medium text-blue-800 mb-2">נתונים ממאגר סוכני סלע:</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-blue-600">מספר רישיון:</span>{' '}
                          <span className="text-slate-700">{String(reg.sela_match_data['מספר רישיון'] || '-')}</span>
                        </div>
                        <div>
                          <span className="text-blue-600">סוכנות:</span>{' '}
                          <span className="text-slate-700">{String(reg.sela_match_data['סוכנות'] || '-')}</span>
                        </div>
                        <div>
                          <span className="text-blue-600">יצרן:</span>{' '}
                          <span className="text-slate-700">{String(reg.sela_match_data['יצרן'] || '-')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReg && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">פרטי בקשת הרשמה</h2>
              <button
                onClick={() => setSelectedReg(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">שם מלא</p>
                  <p className="font-medium text-slate-800">{selectedReg.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">אימייל</p>
                  <p className="font-medium text-slate-800">{selectedReg.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">טלפון</p>
                  <p className="font-medium text-slate-800">{selectedReg.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">תפקיד מבוקש</p>
                  <p className="font-medium text-slate-800">{getRoleLabel(selectedReg.requested_role)}</p>
                </div>
                {selectedReg.national_id && (
                  <div>
                    <p className="text-sm text-slate-500">תעודת זהות</p>
                    <p className="font-medium text-slate-800">{selectedReg.national_id}</p>
                  </div>
                )}
                {selectedReg.license_number && (
                  <div>
                    <p className="text-sm text-slate-500">מספר רישיון</p>
                    <p className="font-medium text-slate-800">{selectedReg.license_number}</p>
                  </div>
                )}
              </div>

              {/* Sela Match */}
              {selectedReg.sela_match_found && selectedReg.sela_match_data && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">נתונים ממאגר סוכני סלע</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(selectedReg.match_confidence)}`}>
                      {selectedReg.match_confidence}% התאמה
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(selectedReg.sela_match_data).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-blue-600">{key}:</span>{' '}
                        <span className="text-slate-700">{String(value) || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedReg.status === 'pending' && (
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleApprove(selectedReg.id)}
                    disabled={processing === selectedReg.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {processing === selectedReg.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                    אשר הרשמה
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                  >
                    <UserX className="w-5 h-5" />
                    דחה בקשה
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir="rtl">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">דחיית בקשה</h2>
              <p className="text-slate-500 mt-1">דחיית הרשמה של {selectedReg.full_name}</p>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                סיבת הדחייה
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="הכנס את סיבת הדחייה..."
              />

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleReject(selectedReg.id)}
                  disabled={processing === selectedReg.id || !rejectionReason}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl transition-colors"
                >
                  {processing === selectedReg.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserX className="w-5 h-5" />
                  )}
                  דחה בקשה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
