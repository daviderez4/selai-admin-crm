'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  MessageSquare,
  AlertTriangle,
  Calendar,
  Shield,
  CreditCard,
  Bell,
  ChevronRight,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Download,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface PortalDashboardProps {
  userName?: string;
  userId?: string;
  agentId?: string;
}

interface Policy {
  id: string;
  type: string;
  company: string;
  coverage: number;
  premium: number;
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'expired';
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  policy: string;
  status: 'paid' | 'pending' | 'overdue';
}

interface Claim {
  id: string;
  type: string;
  date: string;
  status: 'submitted' | 'processing' | 'approved' | 'rejected';
  amount?: number;
}

interface Notification {
  id: string;
  type: 'renewal' | 'payment' | 'document' | 'message';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function PortalDashboard({ userName = 'אורח', userId, agentId }: PortalDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [agentInfo, setAgentInfo] = useState<{ name: string; phone: string; email: string } | null>(null);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Fetch agent info if available
      if (agentId) {
        const { data: agent } = await supabase
          .from('users')
          .select('full_name, phone, email')
          .eq('id', agentId)
          .single();

        if (agent) {
          setAgentInfo({
            name: agent.full_name || 'הסוכן שלך',
            phone: agent.phone || '',
            email: agent.email || '',
          });
        }
      }

      // Mock data for demonstration
      setPolicies([
        { id: 'p1', type: 'ביטוח רכב', company: 'הראל', coverage: 50000, premium: 3200, startDate: '2024-01-01', endDate: '2025-01-01', status: 'active' },
        { id: 'p2', type: 'ביטוח דירה', company: 'מגדל', coverage: 1500000, premium: 1800, startDate: '2024-03-15', endDate: '2025-03-15', status: 'active' },
        { id: 'p3', type: 'ביטוח חיים', company: 'כלל', coverage: 500000, premium: 450, startDate: '2023-06-01', endDate: '2024-06-01', status: 'pending' },
      ]);

      setPayments([
        { id: 'pay1', date: '2024-01-15', amount: 3200, policy: 'ביטוח רכב', status: 'paid' },
        { id: 'pay2', date: '2024-02-15', amount: 1800, policy: 'ביטוח דירה', status: 'paid' },
        { id: 'pay3', date: '2024-03-01', amount: 450, policy: 'ביטוח חיים', status: 'pending' },
      ]);

      setClaims([
        { id: 'cl1', type: 'תביעת רכב', date: '2024-01-20', status: 'approved', amount: 8500 },
        { id: 'cl2', type: 'תביעת דירה', date: '2024-02-10', status: 'processing' },
      ]);

      setNotifications([
        { id: 'n1', type: 'renewal', title: 'פוליסה לחידוש', message: 'ביטוח חיים יפוג בעוד 30 יום', date: '2024-01-15', read: false },
        { id: 'n2', type: 'payment', title: 'תשלום קרוב', message: 'תשלום ביטוח חיים ב-1/3', date: '2024-02-20', read: false },
        { id: 'n3', type: 'message', title: 'הודעה מהסוכן', message: 'שלחתי לך הצעה לביטוח נסיעות', date: '2024-02-18', read: true },
      ]);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate stats
  const activePolicies = policies.filter(p => p.status === 'active').length;
  const totalCoverage = policies.reduce((sum, p) => sum + p.coverage, 0);
  const monthlyPremiums = policies.reduce((sum, p) => sum + (p.premium / 12), 0);
  const openClaims = claims.filter(c => c.status === 'processing' || c.status === 'submitted').length;
  const unreadNotifications = notifications.filter(n => !n.read).length;

  // Get upcoming renewal
  const upcomingRenewal = policies
    .filter(p => new Date(p.endDate) > new Date())
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())[0];

  const daysToRenewal = upcomingRenewal
    ? Math.ceil((new Date(upcomingRenewal.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Notifications */}
      <div className="bg-gradient-to-l from-blue-600 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">שלום {userName} 👋</h1>
              <p className="text-blue-100">ברוך הבא לפורטל הלקוחות שלך</p>
            </div>
            {unreadNotifications > 0 && (
              <Link href="/portal/notifications">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 hover:bg-white/30 transition-colors">
                  <Bell className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-medium">{unreadNotifications} התראות חדשות</p>
                    <p className="text-xs text-blue-100">לחץ לצפייה</p>
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{activePolicies}</p>
                <p className="text-sm text-slate-500">פוליסות פעילות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalCoverage)}</p>
                <p className="text-sm text-slate-500">כיסוי כולל</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(monthlyPremiums)}</p>
                <p className="text-sm text-slate-500">פרמיה חודשית</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{openClaims}</p>
                <p className="text-sm text-slate-500">תביעות פתוחות</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Renewal Alert */}
      {daysToRenewal && daysToRenewal <= 60 && (
        <Card className={cn(
          'border-2',
          daysToRenewal <= 30 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
        )}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center',
                  daysToRenewal <= 30 ? 'bg-red-100' : 'bg-yellow-100'
                )}>
                  <AlertTriangle className={cn(
                    'h-6 w-6',
                    daysToRenewal <= 30 ? 'text-red-600' : 'text-yellow-600'
                  )} />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">
                    {upcomingRenewal?.type} מתקרב לחידוש
                  </p>
                  <p className="text-sm text-slate-600">
                    עוד {daysToRenewal} ימים לסיום הפוליסה ({formatDate(upcomingRenewal?.endDate || '')})
                  </p>
                </div>
              </div>
              <Button className="bg-blue-600 hover:bg-blue-700">
                חדש עכשיו
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Policies Overview */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">הפוליסות שלי</CardTitle>
                <Link href="/portal/policies">
                  <Button variant="ghost" size="sm">
                    צפה בכל
                    <ChevronRight className="h-4 w-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {policies.slice(0, 3).map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      policy.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                      policy.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{policy.type}</p>
                        <Badge variant={policy.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {policy.status === 'active' ? 'פעיל' : policy.status === 'pending' ? 'בהמתנה' : 'פג תוקף'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{policy.company} • כיסוי: {formatCurrency(policy.coverage)}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-800">{formatCurrency(policy.premium)}/שנה</p>
                    <p className="text-xs text-slate-500">עד {formatDate(policy.endDate)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Payments */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">תשלומים אחרונים</CardTitle>
                <Link href="/portal/payments">
                  <Button variant="ghost" size="sm">
                    היסטוריה מלאה
                    <ChevronRight className="h-4 w-4 mr-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center',
                        payment.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      )}>
                        {payment.status === 'paid' ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : payment.status === 'pending' ? (
                          <Clock className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{payment.policy}</p>
                        <p className="text-xs text-slate-500">{formatDate(payment.date)}</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-800">{formatCurrency(payment.amount)}</p>
                      <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                        {payment.status === 'paid' ? 'שולם' : payment.status === 'pending' ? 'בהמתנה' : 'באיחור'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Claims Status */}
          {claims.length > 0 && (
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">סטטוס תביעות</CardTitle>
                  <Link href="/portal/claims">
                    <Button variant="ghost" size="sm">
                      כל התביעות
                      <ChevronRight className="h-4 w-4 mr-1" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {claims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 bg-slate-50 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium text-slate-800">{claim.type}</p>
                        <p className="text-xs text-slate-500">הוגש: {formatDate(claim.date)}</p>
                      </div>
                      <Badge
                        variant={claim.status === 'approved' ? 'default' : 'secondary'}
                        className={cn(
                          claim.status === 'approved' && 'bg-emerald-100 text-emerald-700',
                          claim.status === 'processing' && 'bg-blue-100 text-blue-700',
                          claim.status === 'rejected' && 'bg-red-100 text-red-700'
                        )}
                      >
                        {claim.status === 'submitted' ? 'הוגש' :
                         claim.status === 'processing' ? 'בטיפול' :
                         claim.status === 'approved' ? 'אושר' : 'נדחה'}
                      </Badge>
                    </div>
                    <Progress
                      value={
                        claim.status === 'submitted' ? 25 :
                        claim.status === 'processing' ? 60 :
                        claim.status === 'approved' ? 100 : 100
                      }
                      className="h-2"
                    />
                    {claim.amount && claim.status === 'approved' && (
                      <p className="text-sm text-emerald-600 mt-2">סכום מאושר: {formatCurrency(claim.amount)}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Agent Contact Card */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">הסוכן שלי</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3">
                  {agentInfo?.name?.charAt(0) || 'ס'}
                </div>
                <p className="font-semibold text-slate-800">{agentInfo?.name || 'הסוכן שלך'}</p>
                <p className="text-sm text-slate-500 mb-4">סוכן ביטוח מורשה</p>

                <div className="w-full space-y-2">
                  {agentInfo?.phone && (
                    <a
                      href={`tel:${agentInfo.phone}`}
                      className="flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                      <Phone className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{agentInfo.phone}</span>
                    </a>
                  )}
                  <Link
                    href="/portal/messages"
                    className="flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">שלח הודעה</span>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">פעולות מהירות</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {[
                { icon: Shield, label: 'פוליסות', href: '/portal/policies', color: 'bg-blue-100 text-blue-600' },
                { icon: Upload, label: 'העלה מסמך', href: '/portal/documents', color: 'bg-emerald-100 text-emerald-600' },
                { icon: FileText, label: 'פתח תביעה', href: '/portal/claims', color: 'bg-orange-100 text-orange-600' },
                { icon: Download, label: 'מסמכים', href: '/portal/documents', color: 'bg-purple-100 text-purple-600' },
              ].map((action, i) => (
                <Link
                  key={i}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', action.color)}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-slate-600 text-center">{action.label}</span>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Notifications */}
          <Card className="bg-white border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">התראות</CardTitle>
                {unreadNotifications > 0 && (
                  <Badge variant="secondary">{unreadNotifications} חדשות</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'p-3 rounded-lg transition-colors',
                    notification.read ? 'bg-slate-50' : 'bg-blue-50 border border-blue-100'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      notification.type === 'renewal' ? 'bg-yellow-100 text-yellow-600' :
                      notification.type === 'payment' ? 'bg-purple-100 text-purple-600' :
                      notification.type === 'document' ? 'bg-blue-100 text-blue-600' :
                      'bg-emerald-100 text-emerald-600'
                    )}>
                      {notification.type === 'renewal' && <Calendar className="h-4 w-4" />}
                      {notification.type === 'payment' && <CreditCard className="h-4 w-4" />}
                      {notification.type === 'document' && <FileText className="h-4 w-4" />}
                      {notification.type === 'message' && <MessageSquare className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                      <p className="text-xs text-slate-500 truncate">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
