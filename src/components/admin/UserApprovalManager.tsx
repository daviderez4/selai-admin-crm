'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, ApprovalRequest, USER_TYPE_LABELS } from '@/types/auth';
import {
  Check,
  X,
  Clock,
  User as UserIcon,
  Mail,
  Phone,
  Building2,
  FileText,
  Users,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface PendingUser extends User {
  approval_request?: ApprovalRequest;
}

export default function UserApprovalManager() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'approved' | 'all'>('pending');
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchPendingUsers(), fetchAllUsers()]);
    setLoading(false);
  };

  const fetchPendingUsers = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        approval_requests (*)
      `)
      .eq('is_approved', false)
      .eq('is_profile_complete', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending users:', error);
      return;
    }

    if (data) {
      setPendingUsers(
        data.map((u: any) => ({
          ...u,
          approval_request: u.approval_requests?.[0],
        }))
      );
    }
  };

  const fetchAllUsers = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all users:', error);
      return;
    }

    if (data) {
      setAllUsers(data);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('הרשימה עודכנה');
  };

  const approveUser = async (userId: string, requestedRole: string) => {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // Get current user's ID from users table
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', currentUser?.id)
      .single();

    const { error: updateError } = await supabase
      .from('users')
      .update({
        user_type: requestedRole,
        is_approved: true,
        is_active: true,
        approved_at: new Date().toISOString(),
        approved_by: adminUser?.id,
      })
      .eq('id', userId);

    if (updateError) {
      toast.error('שגיאה באישור המשתמש');
      console.error('Error approving user:', updateError);
      return;
    }

    // Update approval request
    await supabase
      .from('approval_requests')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser?.id,
      })
      .eq('user_id', userId)
      .eq('status', 'pending');

    toast.success('המשתמש אושר בהצלחה');
    await fetchData();
  };

  const rejectUser = async (userId: string, notes?: string) => {
    const supabase = createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', currentUser?.id)
      .single();

    await supabase
      .from('approval_requests')
      .update({
        status: 'rejected',
        admin_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUser?.id,
      })
      .eq('user_id', userId)
      .eq('status', 'pending');

    toast.info('הבקשה נדחתה');
    await fetchData();
  };

  const toggleUserActive = async (userId: string, isActive: boolean) => {
    const supabase = createClient();
    const { error } = await supabase
      .from('users')
      .update({ is_active: !isActive })
      .eq('id', userId);

    if (error) {
      toast.error('שגיאה בעדכון הסטטוס');
      return;
    }

    toast.success(isActive ? 'המשתמש הושבת' : 'המשתמש הופעל');
    await fetchData();
  };

  const filteredAllUsers = allUsers.filter((user) => {
    const matchesSearch =
      !searchQuery ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'approved' && user.is_approved) ||
      (filterStatus === 'pending' && !user.is_approved);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h2>
          <p className="text-gray-500">אישור והרשאות משתמשים במערכת</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ml-2 ${refreshing ? 'animate-spin' : ''}`} />
          רענן
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'pending'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ממתינים לאישור
          {pendingUsers.length > 0 && (
            <span className="mr-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full">
              {pendingUsers.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          כל המשתמשים
        </button>
      </div>

      {/* Pending Users Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingUsers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Check className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-gray-500">אין משתמשים ממתינים לאישור</p>
              </CardContent>
            </Card>
          ) : (
            pendingUsers.map((user) => (
              <Card key={user.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {user.phone}
                          </span>
                        )}
                        {user.national_id && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            ת.ז: {user.national_id}
                          </span>
                        )}
                        {user.company_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {user.company_name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="inline-flex px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                        <Clock className="h-4 w-4 ml-1" />
                        מבקש: {USER_TYPE_LABELS[user.approval_request?.requested_role as keyof typeof USER_TYPE_LABELS] || 'סוכן'}
                      </span>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(user.created_at).toLocaleDateString('he-IL')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-end gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const notes = prompt('סיבת דחייה (אופציונלי):');
                        rejectUser(user.id, notes || undefined);
                      }}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="h-4 w-4 ml-1" />
                      דחה
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        approveUser(user.id, user.approval_request?.requested_role || 'agent')
                      }
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Check className="h-4 w-4 ml-1" />
                      אשר
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* All Users Tab */}
      {activeTab === 'all' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="חיפוש לפי שם, אימייל או טלפון..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 ml-2" />
                  {filterStatus === 'all' ? 'הכל' : filterStatus === 'approved' ? 'מאושרים' : 'ממתינים'}
                  <ChevronDown className="h-4 w-4 mr-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setFilterStatus('all')}>הכל</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('approved')}>מאושרים</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterStatus('pending')}>ממתינים</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Users Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">משתמש</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">תפקיד</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">סטטוס</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">הצטרף</th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAllUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || 'לא צוין'}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm">
                          {USER_TYPE_LABELS[user.user_type] || user.user_type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.is_approved
                              ? user.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-600'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {user.is_approved ? (user.is_active ? 'פעיל' : 'מושבת') : 'ממתין'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.is_approved ? (
                              <DropdownMenuItem
                                onClick={() => toggleUserActive(user.id, user.is_active)}
                              >
                                {user.is_active ? 'השבת משתמש' : 'הפעל משתמש'}
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => approveUser(user.id, user.user_type)}>
                                אשר משתמש
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
