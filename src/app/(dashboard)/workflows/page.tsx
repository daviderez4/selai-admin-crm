'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Workflow,
  Plus,
  Play,
  Pause,
  Trash2,
  Copy,
  Settings,
  Clock,
  Mail,
  Bell,
  FileEdit,
  GitBranch,
  CheckCircle,
  AlertCircle,
  Zap,
  Calendar,
  User,
  Target,
  ArrowRight,
  LayoutTemplate,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  RefreshCw,
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores/authStore';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition';
  nodeType: string;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

interface WorkflowItem {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  nodes: WorkflowNode[];
  status: 'active' | 'paused' | 'draft';
  runsCount: number;
  lastRun?: string;
  createdAt: string;
}

type TriggerType = 'schedule' | 'event' | 'manual' | 'webhook';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: TriggerType;
  nodes: WorkflowNode[];
}

type SystemRole = 'admin' | 'manager' | 'supervisor' | 'agent' | 'client';

// Trigger configurations
const TRIGGER_TYPES = [
  { id: 'schedule', name: 'תזמון', icon: Clock, description: 'הפעלה בזמן קבוע' },
  { id: 'event', name: 'אירוע', icon: Zap, description: 'הפעלה בעקבות אירוע' },
  { id: 'manual', name: 'ידני', icon: Play, description: 'הפעלה ידנית' },
  { id: 'webhook', name: 'Webhook', icon: GitBranch, description: 'הפעלה חיצונית' },
];

// Action types
const ACTION_TYPES = [
  { id: 'send_email', name: 'שליחת מייל', icon: Mail, color: 'bg-blue-100 text-blue-600' },
  { id: 'create_task', name: 'יצירת משימה', icon: FileEdit, color: 'bg-purple-100 text-purple-600' },
  { id: 'send_notification', name: 'שליחת התראה', icon: Bell, color: 'bg-yellow-100 text-yellow-600' },
  { id: 'update_record', name: 'עדכון רשומה', icon: FileEdit, color: 'bg-green-100 text-green-600' },
  { id: 'assign_user', name: 'הקצאת משתמש', icon: User, color: 'bg-orange-100 text-orange-600' },
  { id: 'condition', name: 'תנאי', icon: GitBranch, color: 'bg-slate-100 text-slate-600' },
];

// Event types
const EVENT_TYPES = [
  { id: 'lead_created', name: 'ליד חדש נוצר' },
  { id: 'deal_won', name: 'עסקה נסגרה' },
  { id: 'deal_lost', name: 'עסקה הפסידה' },
  { id: 'contact_created', name: 'איש קשר חדש' },
  { id: 'task_completed', name: 'משימה הושלמה' },
  { id: 'policy_expiring', name: 'פוליסה מתקרבת לסיום' },
];

// Workflow templates
const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'tpl-1',
    name: 'מעקב ליד חדש',
    description: 'שליחת מייל והקצאת משימה כשליד חדש נכנס',
    category: 'מכירות',
    trigger: 'event',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'lead_created', name: 'ליד חדש', config: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'action', nodeType: 'send_email', name: 'מייל ברוכים הבאים', config: { template: 'welcome' }, position: { x: 0, y: 100 } },
      { id: 'n3', type: 'action', nodeType: 'create_task', name: 'משימת התקשרות', config: { due: '1d' }, position: { x: 0, y: 200 } },
    ],
  },
  {
    id: 'tpl-2',
    name: 'תזכורת פוליסה',
    description: 'התראה על פוליסות שעומדות לפוג',
    category: 'שירות',
    trigger: 'schedule',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'schedule', name: 'בדיקה יומית', config: { time: '08:00' }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'condition', nodeType: 'condition', name: 'פוליסה פוגעת ב-30 יום?', config: {}, position: { x: 0, y: 100 } },
      { id: 'n3', type: 'action', nodeType: 'send_notification', name: 'התראה לסוכן', config: {}, position: { x: 0, y: 200 } },
    ],
  },
  {
    id: 'tpl-3',
    name: 'סגירת עסקה',
    description: 'פעולות אוטומטיות לאחר סגירת עסקה',
    category: 'מכירות',
    trigger: 'event',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'deal_won', name: 'עסקה נסגרה', config: {}, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'action', nodeType: 'send_email', name: 'מייל אישור', config: {}, position: { x: 0, y: 100 } },
      { id: 'n3', type: 'action', nodeType: 'create_task', name: 'הכנת מסמכים', config: {}, position: { x: 0, y: 200 } },
    ],
  },
  {
    id: 'tpl-4',
    name: 'משימות יומיות',
    description: 'סיכום משימות פתוחות בכל בוקר',
    category: 'תפעול',
    trigger: 'schedule',
    nodes: [
      { id: 'n1', type: 'trigger', nodeType: 'schedule', name: 'כל בוקר 07:00', config: { time: '07:00' }, position: { x: 0, y: 0 } },
      { id: 'n2', type: 'action', nodeType: 'send_email', name: 'סיכום משימות', config: {}, position: { x: 0, y: 100 } },
    ],
  },
];

export default function WorkflowsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('workflows');
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<SystemRole>('agent');
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null);
  const [showNewWorkflowDialog, setShowNewWorkflowDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Partial<WorkflowItem>>({});

  // Fetch user role and workflows
  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    const supabase = createClient();

    try {
      // First fetch user role
      const { data: userData } = await supabase
        .from('users')
        .select('user_type')
        .eq('auth_id', user.id)
        .single();

      if (userData?.user_type) {
        setUserRole(userData.user_type as SystemRole);
      }

      // Mock workflows data (would be from database in production)
      setWorkflows([
        {
          id: 'wf-1',
          name: 'מעקב ליד חדש',
          description: 'שליחת מייל והקצאת משימה כשליד חדש נכנס',
          trigger: 'event',
          nodes: WORKFLOW_TEMPLATES[0].nodes,
          status: 'active',
          runsCount: 156,
          lastRun: '2024-01-15 10:30',
          createdAt: '2024-01-01',
        },
        {
          id: 'wf-2',
          name: 'תזכורת פוליסה',
          description: 'התראה על פוליסות שעומדות לפוג',
          trigger: 'schedule',
          nodes: WORKFLOW_TEMPLATES[1].nodes,
          status: 'active',
          runsCount: 42,
          lastRun: '2024-01-15 08:00',
          createdAt: '2024-01-05',
        },
        {
          id: 'wf-3',
          name: 'סיכום יומי',
          description: 'שליחת סיכום משימות בכל בוקר',
          trigger: 'schedule',
          nodes: WORKFLOW_TEMPLATES[3].nodes,
          status: 'paused',
          runsCount: 20,
          lastRun: '2024-01-10 07:00',
          createdAt: '2024-01-08',
        },
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('שגיאה בטעינת נתונים');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleWorkflow = (workflow: WorkflowItem) => {
    setWorkflows(prev =>
      prev.map(w =>
        w.id === workflow.id
          ? { ...w, status: w.status === 'active' ? 'paused' : 'active' }
          : w
      )
    );
    toast.success(
      workflow.status === 'active' ? 'Workflow הושהה' : 'Workflow הופעל'
    );
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    toast.success('Workflow נמחק');
  };

  const handleDuplicateWorkflow = (workflow: WorkflowItem) => {
    const newWorkflow: WorkflowItem = {
      ...workflow,
      id: `wf-${Date.now()}`,
      name: `${workflow.name} (העתק)`,
      status: 'draft',
      runsCount: 0,
      lastRun: undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    toast.success('Workflow שוכפל');
  };

  const handleCreateFromTemplate = (template: WorkflowTemplate) => {
    const newWorkflow: WorkflowItem = {
      id: `wf-${Date.now()}`,
      name: template.name,
      description: template.description,
      trigger: template.trigger,
      nodes: template.nodes,
      status: 'draft',
      runsCount: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setWorkflows(prev => [...prev, newWorkflow]);
    setShowTemplateDialog(false);
    toast.success('Workflow נוצר מתבנית');
  };

  const handleRunWorkflow = (workflow: WorkflowItem) => {
    toast.success('Workflow הופעל ידנית');
  };

  // Check access
  const hasAccess = ['admin', 'manager', 'supervisor'].includes(userRole);

  if (!hasAccess) {
    return (
      <div className="flex flex-col h-full bg-slate-50/50">
        <Header title="אוטומציות" />
        <div className="flex-1 flex items-center justify-center" dir="rtl">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <Workflow className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <h2 className="text-lg font-semibold text-slate-800 mb-2">אין הרשאה</h2>
              <p className="text-slate-500">
                אזור האוטומציות זמין למנהלים ומפקחים בלבד.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <Header title="בונה אוטומציות" />

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">בונה אוטומציות</h1>
              <p className="text-slate-500">צור ונהל תהליכים אוטומטיים</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4 ml-2', loading && 'animate-spin')} />
                רענן
              </Button>
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <LayoutTemplate className="h-4 w-4 ml-2" />
                    מתבניות
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>תבניות אוטומציה</DialogTitle>
                    <DialogDescription>
                      בחר תבנית מוכנה להתחלה מהירה
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {WORKFLOW_TEMPLATES.map((template) => (
                      <Card
                        key={template.id}
                        className="cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                        onClick={() => handleCreateFromTemplate(template)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                              <Workflow className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-slate-800">{template.name}</h4>
                              <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {template.category}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {TRIGGER_TYPES.find(t => t.id === template.trigger)?.name}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog open={showNewWorkflowDialog} onOpenChange={setShowNewWorkflowDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 ml-2" />
                    אוטומציה חדשה
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]" dir="rtl">
                  <DialogHeader>
                    <DialogTitle>יצירת אוטומציה חדשה</DialogTitle>
                    <DialogDescription>
                      הגדר את פרטי האוטומציה
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>שם האוטומציה</Label>
                      <Input
                        placeholder="לדוגמה: מעקב ליד חדש"
                        value={editingWorkflow.name || ''}
                        onChange={(e) => setEditingWorkflow(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>תיאור</Label>
                      <Textarea
                        placeholder="תאר את מטרת האוטומציה..."
                        value={editingWorkflow.description || ''}
                        onChange={(e) => setEditingWorkflow(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>סוג הטריגר</Label>
                      <Select
                        value={editingWorkflow.trigger}
                        onValueChange={(v) => setEditingWorkflow(prev => ({ ...prev, trigger: v as TriggerType }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סוג" />
                        </SelectTrigger>
                        <SelectContent>
                          {TRIGGER_TYPES.map((trigger) => (
                            <SelectItem key={trigger.id} value={trigger.id}>
                              <div className="flex items-center gap-2">
                                <trigger.icon className="h-4 w-4" />
                                <span>{trigger.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {editingWorkflow.trigger === 'event' && (
                      <div className="grid gap-2">
                        <Label>אירוע מפעיל</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="בחר אירוע" />
                          </SelectTrigger>
                          <SelectContent>
                            {EVENT_TYPES.map((event) => (
                              <SelectItem key={event.id} value={event.id}>
                                {event.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {editingWorkflow.trigger === 'schedule' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label>תדירות</Label>
                          <Select>
                            <SelectTrigger>
                              <SelectValue placeholder="בחר" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">יומי</SelectItem>
                              <SelectItem value="weekly">שבועי</SelectItem>
                              <SelectItem value="monthly">חודשי</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label>שעה</Label>
                          <Input type="time" defaultValue="08:00" />
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowNewWorkflowDialog(false)}>
                      ביטול
                    </Button>
                    <Button
                      onClick={() => {
                        if (!editingWorkflow.name || !editingWorkflow.trigger) {
                          toast.error('נא למלא שם וסוג טריגר');
                          return;
                        }
                        const newWorkflow: WorkflowItem = {
                          id: `wf-${Date.now()}`,
                          name: editingWorkflow.name,
                          description: editingWorkflow.description || '',
                          trigger: editingWorkflow.trigger,
                          nodes: [],
                          status: 'draft',
                          runsCount: 0,
                          createdAt: new Date().toISOString().split('T')[0],
                        };
                        setWorkflows(prev => [...prev, newWorkflow]);
                        setShowNewWorkflowDialog(false);
                        setEditingWorkflow({});
                        toast.success('אוטומציה נוצרה');
                      }}
                    >
                      <Save className="h-4 w-4 ml-2" />
                      צור
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Workflow className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">סה״כ אוטומציות</p>
                    <p className="text-xl font-bold text-slate-800">{workflows.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">פעילים</p>
                    <p className="text-xl font-bold text-slate-800">
                      {workflows.filter(w => w.status === 'active').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">הרצות החודש</p>
                    <p className="text-xl font-bold text-slate-800">
                      {workflows.reduce((sum, w) => sum + w.runsCount, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white border-slate-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">טיוטות</p>
                    <p className="text-xl font-bold text-slate-800">
                      {workflows.filter(w => w.status === 'draft').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white border border-slate-200 p-1">
              <TabsTrigger value="workflows" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Workflow className="h-4 w-4 ml-2" />
                אוטומציות
              </TabsTrigger>
              <TabsTrigger value="builder" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <GitBranch className="h-4 w-4 ml-2" />
                בנה תהליך
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Clock className="h-4 w-4 ml-2" />
                היסטוריה
              </TabsTrigger>
            </TabsList>

            {/* Workflows List */}
            <TabsContent value="workflows" className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : workflows.length === 0 ? (
                <Card className="bg-white border-slate-200">
                  <CardContent className="py-12 text-center">
                    <Workflow className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-medium text-slate-800 mb-2">אין אוטומציות</h3>
                    <p className="text-slate-500 mb-4">צור את האוטומציה הראשונה שלך</p>
                    <Button onClick={() => setShowNewWorkflowDialog(true)}>
                      <Plus className="h-4 w-4 ml-2" />
                      צור אוטומציה
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {workflows.map((workflow) => (
                    <Card key={workflow.id} className="bg-white border-slate-200">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              'w-12 h-12 rounded-lg flex items-center justify-center',
                              workflow.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                              workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-600' :
                              'bg-slate-100 text-slate-500'
                            )}>
                              <Workflow className="h-6 w-6" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-800">{workflow.name}</h3>
                                <Badge
                                  variant={workflow.status === 'active' ? 'default' :
                                          workflow.status === 'paused' ? 'secondary' : 'outline'}
                                  className={cn(
                                    workflow.status === 'active' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                                  )}
                                >
                                  {workflow.status === 'active' ? 'פעיל' :
                                   workflow.status === 'paused' ? 'מושהה' : 'טיוטה'}
                                </Badge>
                              </div>
                              <p className="text-sm text-slate-500 mt-1">{workflow.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                                <span className="flex items-center gap-1">
                                  {TRIGGER_TYPES.find(t => t.id === workflow.trigger)?.icon &&
                                    (() => {
                                      const TriggerIcon = TRIGGER_TYPES.find(t => t.id === workflow.trigger)!.icon;
                                      return <TriggerIcon className="h-3 w-3" />;
                                    })()
                                  }
                                  {TRIGGER_TYPES.find(t => t.id === workflow.trigger)?.name}
                                </span>
                                <span>•</span>
                                <span>{workflow.runsCount} הרצות</span>
                                {workflow.lastRun && (
                                  <>
                                    <span>•</span>
                                    <span>הרצה אחרונה: {workflow.lastRun}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={workflow.status === 'active'}
                              onCheckedChange={() => handleToggleWorkflow(workflow)}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRunWorkflow(workflow)}
                              disabled={workflow.status === 'draft'}
                            >
                              <Play className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDuplicateWorkflow(workflow)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedWorkflow(workflow)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteWorkflow(workflow.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>

                        {/* Workflow nodes preview */}
                        {workflow.nodes.length > 0 && (
                          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
                            {workflow.nodes.map((node, idx) => (
                              <div key={node.id} className="flex items-center">
                                <div className={cn(
                                  'px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2',
                                  node.type === 'trigger' ? 'bg-blue-100 text-blue-700' :
                                  node.type === 'condition' ? 'bg-purple-100 text-purple-700' :
                                  'bg-slate-100 text-slate-700'
                                )}>
                                  {node.type === 'trigger' && <Zap className="h-3 w-3" />}
                                  {node.type === 'condition' && <GitBranch className="h-3 w-3" />}
                                  {node.type === 'action' && (() => {
                                    const action = ACTION_TYPES.find(a => a.id === node.nodeType);
                                    return action ? <action.icon className="h-3 w-3" /> : null;
                                  })()}
                                  {node.name}
                                </div>
                                {idx < workflow.nodes.length - 1 && (
                                  <ArrowRight className="h-4 w-4 text-slate-400 mx-1" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Builder Tab */}
            <TabsContent value="builder" className="space-y-4">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle>בונה תהליכים ויזואלי</CardTitle>
                  <CardDescription>גרור ושחרר רכיבים לבניית תהליך אוטומציה</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Actions Panel */}
                    <div className="space-y-4">
                      <h4 className="font-medium text-slate-700">פעולות זמינות</h4>
                      <div className="space-y-2">
                        {ACTION_TYPES.map((action) => (
                          <div
                            key={action.id}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg cursor-grab hover:shadow-md transition-shadow',
                              action.color
                            )}
                          >
                            <action.icon className="h-5 w-5" />
                            <span className="font-medium text-sm">{action.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Canvas */}
                    <div className="lg:col-span-3 min-h-[400px] bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <div className="text-center text-slate-400">
                        <GitBranch className="h-12 w-12 mx-auto mb-4" />
                        <p className="font-medium">גרור פעולות לכאן</p>
                        <p className="text-sm">או בחר תבנית קיימת</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card className="bg-white border-slate-200">
                <CardHeader>
                  <CardTitle>היסטוריית הרצות</CardTitle>
                  <CardDescription>צפה בהרצות קודמות של אוטומציות</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { workflow: 'מעקב ליד חדש', time: 'היום 10:30', status: 'success', details: 'ליד: אבי כהן' },
                      { workflow: 'מעקב ליד חדש', time: 'היום 09:15', status: 'success', details: 'ליד: שרה לוי' },
                      { workflow: 'תזכורת פוליסה', time: 'היום 08:00', status: 'success', details: '5 התראות נשלחו' },
                      { workflow: 'מעקב ליד חדש', time: 'אתמול 16:45', status: 'failed', details: 'שגיאה בשליחת מייל' },
                      { workflow: 'סיכום יומי', time: 'אתמול 07:00', status: 'success', details: '12 משימות' },
                    ].map((run, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center',
                            run.status === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                          )}>
                            {run.status === 'success' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : (
                              <AlertCircle className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">{run.workflow}</p>
                            <p className="text-xs text-slate-500">{run.details}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className="text-sm text-slate-600">{run.time}</p>
                          <Badge
                            variant={run.status === 'success' ? 'default' : 'destructive'}
                            className={cn(
                              run.status === 'success' && 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            )}
                          >
                            {run.status === 'success' ? 'הצלחה' : 'נכשל'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
