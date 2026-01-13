'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  FileText,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  PieChart,
  Target,
  Banknote,
  Clock,
  Building2,
  UserCheck,
  FileBarChart,
  Mail,
  ChevronDown,
  Plus,
  Trash2,
  Save,
  Play,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from 'sonner';

// Report category types
interface ReportCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  reports: ReportItem[];
}

interface ReportItem {
  id: string;
  name: string;
  description: string;
  type: 'revenue' | 'performance' | 'clients' | 'operations' | 'custom';
  schedule?: string;
  lastRun?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  nextRun: string;
  recipients: string[];
  status: 'active' | 'paused';
}

interface ReportStats {
  totalRevenue: number;
  totalDeals: number;
  totalLeads: number;
  totalAgents: number;
  avgDealValue: number;
  conversionRate: number;
}

type SystemRole = 'admin' | 'manager' | 'supervisor' | 'agent' | 'client';

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [dateRange, setDateRange] = useState('month');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showNewReportDialog, setShowNewReportDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [userRole, setUserRole] = useState<SystemRole>('agent');

  // Report categories
  const reportCategories: ReportCategory[] = [
    {
      id: 'revenue',
      name: 'דוחות הכנסות',
      icon: <Banknote className="h-5 w-5" />,
      description: 'מעקב אחר הכנסות, עמלות ורווחיות',
      reports: [
        { id: 'rev-1', name: 'סיכום הכנסות חודשי', description: 'הכנסות לפי סוכן וענף', type: 'revenue' },
        { id: 'rev-2', name: 'פירוט עמלות', description: 'עמלות לפי חברת ביטוח', type: 'revenue' },
        { id: 'rev-3', name: 'השוואת תקופות', description: 'השוואת הכנסות בין תקופות', type: 'revenue' },
        { id: 'rev-4', name: 'צפי הכנסות', description: 'תחזית הכנסות עתידית', type: 'revenue' },
      ],
    },
    {
      id: 'performance',
      name: 'ביצועי סוכנים',
      icon: <UserCheck className="h-5 w-5" />,
      description: 'ניתוח ביצועי סוכנים ועמידה ביעדים',
      reports: [
        { id: 'perf-1', name: 'דירוג סוכנים', description: 'מדרג ביצועים לפי מכירות', type: 'performance' },
        { id: 'perf-2', name: 'עמידה ביעדים', description: 'אחוז עמידה ביעדי מכירות', type: 'performance' },
        { id: 'perf-3', name: 'פעילות שוטפת', description: 'פגישות, שיחות ופעולות', type: 'performance' },
        { id: 'perf-4', name: 'אנליזת המרה', description: 'יחס המרת לידים לעסקאות', type: 'performance' },
      ],
    },
    {
      id: 'clients',
      name: 'אנליטיקת לקוחות',
      icon: <Users className="h-5 w-5" />,
      description: 'ניתוח בסיס הלקוחות והתנהגות',
      reports: [
        { id: 'client-1', name: 'פילוח לקוחות', description: 'ניתוח דמוגרפי ופילוח', type: 'clients' },
        { id: 'client-2', name: 'שימור לקוחות', description: 'שיעור נטישה וחידושים', type: 'clients' },
        { id: 'client-3', name: 'ערך לקוח', description: 'חישוב LTV ופוטנציאל', type: 'clients' },
        { id: 'client-4', name: 'מגמות צמיחה', description: 'גידול בסיס לקוחות', type: 'clients' },
      ],
    },
    {
      id: 'operations',
      name: 'דוחות תפעול',
      icon: <Building2 className="h-5 w-5" />,
      description: 'יעילות תפעולית ומדדי איכות',
      reports: [
        { id: 'ops-1', name: 'זמני טיפול', description: 'זמן ממוצע לסגירת עסקה', type: 'operations' },
        { id: 'ops-2', name: 'תלונות ושירות', description: 'ניתוח פניות ותלונות', type: 'operations' },
        { id: 'ops-3', name: 'משימות פתוחות', description: 'סטטוס משימות לפי צוות', type: 'operations' },
        { id: 'ops-4', name: 'דוח פוליסות', description: 'סטטוס פוליסות בתהליך', type: 'operations' },
      ],
    },
  ];

  // Scheduled reports (mock)
  const [scheduledReports] = useState<ScheduledReport[]>([
    { id: 'sch-1', name: 'סיכום הכנסות שבועי', frequency: 'weekly', nextRun: '2024-01-21', recipients: ['manager@sela.co.il'], status: 'active' },
    { id: 'sch-2', name: 'דירוג סוכנים חודשי', frequency: 'monthly', nextRun: '2024-02-01', recipients: ['admin@sela.co.il', 'ceo@sela.co.il'], status: 'active' },
    { id: 'sch-3', name: 'דוח משימות יומי', frequency: 'daily', nextRun: '2024-01-16', recipients: ['team@sela.co.il'], status: 'paused' },
  ]);

  // Fetch user role and stats
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const supabase = createClient();

    try {
      // First fetch user role from users table
      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('auth_id', user.id)
        .single();

      if (userData?.user_type) {
        setUserRole(userData.user_type as SystemRole);
      }

      // Fetch deals
      const { data: deals } = await supabase
        .from('crm_deals')
        .select('amount, status')
        .eq('status', 'won');

      // Fetch leads
      const { data: leads } = await supabase
        .from('crm_leads')
        .select('id, status');

      // Fetch agents
      const { data: agents } = await supabase
        .from('users')
        .select('id')
        .eq('user_type', 'agent')
        .eq('is_active', true);

      const totalRevenue = deals?.reduce((sum, d) => sum + (d.amount || 0), 0) || 0;
      const totalDeals = deals?.length || 0;
      const totalLeads = leads?.length || 0;
      const convertedLeads = leads?.filter(l => l.status === 'converted').length || 0;

      setStats({
        totalRevenue,
        totalDeals,
        totalLeads,
        totalAgents: agents?.length || 0,
        avgDealValue: totalDeals > 0 ? totalRevenue / totalDeals : 0,
        conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    toast.success(`מייצא דוח בפורמט ${format.toUpperCase()}...`);
  };

  const handleRunReport = (reportId: string) => {
    toast.success('מריץ דוח...');
  };

  // Check if user has access (admin/manager/supervisor only)
  const hasAccess = ['admin', 'manager', 'supervisor'].includes(userRole);

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-full bg-slate-50/50">
        <Header title="דוחות" />
        <div className="flex-1 flex items-center justify-center" dir="rtl">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <FileBarChart className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h2 className="text-lg font-semibold text-slate-800 mb-2">אין הרשאה</h2>
              <p className="text-slate-500">
                אזור הדוחות זמין למנהלים ומפקחים בלבד.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Header title="מרכז הדוחות" />

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">מרכז הדוחות</h1>
              <p className="text-slate-500">צפייה בדוחות, אנליטיקות ותובנות עסקיות</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="תקופה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">שבוע אחרון</SelectItem>
                  <SelectItem value="month">חודש אחרון</SelectItem>
                  <SelectItem value="quarter">רבעון אחרון</SelectItem>
                  <SelectItem value="year">שנה אחרונה</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchStats} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
                רענן
              </Button>
              <Dialog open={showNewReportDialog} onOpenChange={setShowNewReportDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 ml-2" />
                    דוח מותאם
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>יצירת דוח מותאם אישית</DialogTitle>
                    <DialogDescription>
                      בחר את הפרמטרים ליצירת דוח חדש
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="report-name">שם הדוח</Label>
                      <Input id="report-name" placeholder="לדוגמה: דוח מכירות רבעוני" />
                    </div>
                    <div className="grid gap-2">
                      <Label>סוג הדוח</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">הכנסות</SelectItem>
                          <SelectItem value="performance">ביצועים</SelectItem>
                          <SelectItem value="clients">לקוחות</SelectItem>
                          <SelectItem value="operations">תפעול</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>פילטרים</Label>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                          לפי סוכן
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                          לפי ענף
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                          לפי חברה
                        </Badge>
                        <Badge variant="outline" className="cursor-pointer hover:bg-slate-100">
                          לפי תקופה
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="schedule" />
                      <Label htmlFor="schedule" className="cursor-pointer">
                        תזמון אוטומטי של הדוח
                      </Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewReportDialog(false)}>
                      ביטול
                    </Button>
                    <Button onClick={() => {
                      toast.success('דוח נוצר בהצלחה');
                      setShowNewReportDialog(false);
                    }}>
                      <Save className="h-4 w-4 ml-2" />
                      צור דוח
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">סה״כ הכנסות</p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(stats.totalRevenue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">עסקאות</p>
                      <p className="text-lg font-bold text-slate-800">{stats.totalDeals}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">לידים</p>
                      <p className="text-lg font-bold text-slate-800">{stats.totalLeads}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Users className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">סוכנים פעילים</p>
                      <p className="text-lg font-bold text-slate-800">{stats.totalAgents}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">עסקה ממוצעת</p>
                      <p className="text-lg font-bold text-slate-800">
                        {formatCurrency(stats.avgDealValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-white border-slate-200">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center">
                      <PieChart className="h-5 w-5 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">יחס המרה</p>
                      <p className="text-lg font-bold text-slate-800">
                        {stats.conversionRate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <BarChart3 className="h-4 w-4 ml-2" />
                סקירה כללית
              </TabsTrigger>
              <TabsTrigger value="categories" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <FileText className="h-4 w-4 ml-2" />
                קטגוריות
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Clock className="h-4 w-4 ml-2" />
                דוחות מתוזמנים
              </TabsTrigger>
              <TabsTrigger value="custom" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Filter className="h-4 w-4 ml-2" />
                בונה דוחות
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Reports */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileBarChart className="h-5 w-5 text-blue-600" />
                      דוחות מהירים
                    </CardTitle>
                    <CardDescription>גישה מהירה לדוחות נפוצים</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: 'סיכום מכירות חודשי', icon: Banknote, color: 'text-emerald-600 bg-emerald-50' },
                      { name: 'דירוג סוכנים', icon: Users, color: 'text-blue-600 bg-blue-50' },
                      { name: 'דוח עמלות', icon: Target, color: 'text-purple-600 bg-purple-50' },
                      { name: 'אנליטיקת לקוחות', icon: PieChart, color: 'text-orange-600 bg-orange-50' },
                    ].map((report) => (
                      <div
                        key={report.name}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={() => handleRunReport(report.name)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', report.color)}>
                            <report.icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-slate-700">{report.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleExport('excel'); }}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Play className="h-4 w-4 text-blue-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Recent Reports */}
                <Card className="bg-white border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5 text-slate-600" />
                      דוחות אחרונים
                    </CardTitle>
                    <CardDescription>דוחות שהורצו לאחרונה</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: 'סיכום הכנסות - דצמבר', date: '15/01/2024', status: 'ready' },
                      { name: 'דירוג סוכנים Q4', date: '14/01/2024', status: 'ready' },
                      { name: 'דוח לקוחות חדשים', date: '13/01/2024', status: 'ready' },
                      { name: 'ביצועי צוות מכירות', date: '12/01/2024', status: 'ready' },
                    ].map((report) => (
                      <div
                        key={report.name}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-700">{report.name}</p>
                          <p className="text-xs text-slate-500">{report.date}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                            מוכן
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Export Options */}
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">אפשרויות ייצוא</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => handleExport('excel')}>
                      <FileText className="h-4 w-4 ml-2 text-green-600" />
                      ייצוא ל-Excel
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('pdf')}>
                      <FileText className="h-4 w-4 ml-2 text-red-600" />
                      ייצוא ל-PDF
                    </Button>
                    <Button variant="outline" onClick={() => handleExport('csv')}>
                      <FileText className="h-4 w-4 ml-2 text-blue-600" />
                      ייצוא ל-CSV
                    </Button>
                    <Button variant="outline">
                      <Mail className="h-4 w-4 ml-2 text-purple-600" />
                      שליחה במייל
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Categories Tab */}
            <TabsContent value="categories" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reportCategories.map((category) => (
                  <Card
                    key={category.id}
                    className={cn(
                      'bg-white border-slate-200 cursor-pointer transition-all',
                      selectedCategory === category.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                    )}
                    onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                            {category.icon}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                            <CardDescription>{category.description}</CardDescription>
                          </div>
                        </div>
                        <ChevronDown className={cn(
                          'h-5 w-5 text-slate-400 transition-transform',
                          selectedCategory === category.id && 'rotate-180'
                        )} />
                      </div>
                    </CardHeader>
                    {selectedCategory === category.id && (
                      <CardContent className="pt-0 border-t border-slate-100">
                        <div className="space-y-2 mt-4">
                          {category.reports.map((report) => (
                            <div
                              key={report.id}
                              className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div>
                                <p className="font-medium text-slate-700">{report.name}</p>
                                <p className="text-xs text-slate-500">{report.description}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleExport('excel')}>
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => handleRunReport(report.id)}>
                                  <Play className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Scheduled Tab */}
            <TabsContent value="scheduled" className="space-y-4">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">דוחות מתוזמנים</CardTitle>
                      <CardDescription>דוחות שנשלחים באופן אוטומטי</CardDescription>
                    </div>
                    <Button onClick={() => setShowScheduleDialog(true)}>
                      <Plus className="h-4 w-4 ml-2" />
                      תזמון חדש
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {scheduledReports.map((report) => (
                      <div
                        key={report.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            report.status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'
                          )}>
                            <Clock className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{report.name}</p>
                            <div className="flex items-center gap-3 text-xs text-slate-500">
                              <span>
                                {report.frequency === 'daily' ? 'יומי' :
                                 report.frequency === 'weekly' ? 'שבועי' : 'חודשי'}
                              </span>
                              <span>•</span>
                              <span>הרצה הבאה: {report.nextRun}</span>
                              <span>•</span>
                              <span>{report.recipients.length} נמענים</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={report.status === 'active' ? 'default' : 'secondary'}>
                            {report.status === 'active' ? 'פעיל' : 'מושהה'}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Custom Report Builder Tab */}
            <TabsContent value="custom" className="space-y-4">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">בונה דוחות מותאם</CardTitle>
                  <CardDescription>צור דוח מותאם אישית עם הפרמטרים שתבחר</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>מקור נתונים</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר מקור" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deals">עסקאות</SelectItem>
                          <SelectItem value="leads">לידים</SelectItem>
                          <SelectItem value="contacts">לקוחות</SelectItem>
                          <SelectItem value="policies">פוליסות</SelectItem>
                          <SelectItem value="agents">סוכנים</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>קיבוץ לפי</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר קיבוץ" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agent">סוכן</SelectItem>
                          <SelectItem value="branch">ענף</SelectItem>
                          <SelectItem value="company">חברת ביטוח</SelectItem>
                          <SelectItem value="date">תאריך</SelectItem>
                          <SelectItem value="status">סטטוס</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>תקופה</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="בחר תקופה" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">היום</SelectItem>
                          <SelectItem value="week">שבוע אחרון</SelectItem>
                          <SelectItem value="month">חודש אחרון</SelectItem>
                          <SelectItem value="quarter">רבעון אחרון</SelectItem>
                          <SelectItem value="year">שנה אחרונה</SelectItem>
                          <SelectItem value="custom">טווח מותאם</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>שדות להצגה</Label>
                    <div className="flex flex-wrap gap-2">
                      {['שם', 'תאריך', 'סכום', 'סטטוס', 'סוכן', 'ענף', 'חברה', 'עמלה'].map((field) => (
                        <Badge
                          key={field}
                          variant="outline"
                          className="cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                        >
                          <Checkbox id={field} className="ml-2 h-3 w-3" />
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline">
                      <Save className="h-4 w-4 ml-2" />
                      שמור תבנית
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Play className="h-4 w-4 ml-2" />
                      הרץ דוח
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle>תזמון דוח אוטומטי</DialogTitle>
            <DialogDescription>
              הגדר שליחה אוטומטית של דוח
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>בחר דוח</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="בחר דוח לתזמון" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">סיכום הכנסות</SelectItem>
                  <SelectItem value="agents">דירוג סוכנים</SelectItem>
                  <SelectItem value="clients">אנליטיקת לקוחות</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>תדירות</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="בחר תדירות" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">יומי</SelectItem>
                  <SelectItem value="weekly">שבועי</SelectItem>
                  <SelectItem value="monthly">חודשי</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>נמענים (מיילים)</Label>
              <Input placeholder="example@sela.co.il" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              ביטול
            </Button>
            <Button onClick={() => {
              toast.success('תזמון נוצר בהצלחה');
              setShowScheduleDialog(false);
            }}>
              צור תזמון
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
