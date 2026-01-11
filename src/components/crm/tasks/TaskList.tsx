'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Task, TaskStatus, Priority } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Search,
  MoreVertical,
  Calendar,
  Clock,
  User,
  AlertCircle,
  CheckCircle2,
  Circle,
  Loader2,
  Filter,
} from 'lucide-react';

const statusConfig: Record<TaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'ממתין', color: 'bg-gray-100 text-gray-700', icon: Circle },
  in_progress: { label: 'בביצוע', color: 'bg-blue-100 text-blue-700', icon: Clock },
  completed: { label: 'הושלם', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-700', icon: AlertCircle },
};

const priorityConfig: Record<Priority, { label: string; color: string }> = {
  low: { label: 'נמוכה', color: 'bg-gray-100 text-gray-600' },
  medium: { label: 'בינונית', color: 'bg-yellow-100 text-yellow-700' },
  high: { label: 'גבוהה', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'קריטית', color: 'bg-red-100 text-red-700' },
};

const taskTypes = [
  { value: 'call', label: 'שיחה' },
  { value: 'email', label: 'אימייל' },
  { value: 'meeting', label: 'פגישה' },
  { value: 'follow_up', label: 'מעקב' },
  { value: 'document', label: 'מסמך' },
  { value: 'other', label: 'אחר' },
];

export function TaskList() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    tasks,
    todaysTasks,
    overdueTasks,
    tasksTotal,
    isLoadingTasks,
    fetchTasks,
    fetchTodaysTasks,
    createTask,
    updateTask,
    completeTask,
    deleteTask,
  } = useCRMStore();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    task_type: 'follow_up' as string,
    priority: 'medium' as Priority,
    due_date: '',
    due_time: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchTodaysTasks();
  }, [fetchTasks, fetchTodaysTasks]);

  const handleCreateTask = async () => {
    if (!newTask.title) return;

    const dueDateTime = newTask.due_date
      ? new Date(`${newTask.due_date}T${newTask.due_time || '09:00'}:00`).toISOString()
      : undefined;

    await createTask({
      title: newTask.title,
      description: newTask.description || undefined,
      task_type: newTask.task_type as Task['task_type'],
      priority: newTask.priority,
      due_date: dueDateTime,
      status: 'pending',
    });

    setNewTask({
      title: '',
      description: '',
      task_type: 'follow_up',
      priority: 'medium',
      due_date: '',
      due_time: '',
    });
    setIsCreateDialogOpen(false);
    fetchTasks();
    fetchTodaysTasks();
  };

  const handleToggleComplete = async (task: Task) => {
    if (task.status === 'completed') {
      await updateTask(task.id, { status: 'pending' });
    } else {
      await completeTask(task.id);
    }
    fetchTasks();
    fetchTodaysTasks();
  };

  const handleDelete = async (task: Task) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את המשימה "${task.title}"?`)) {
      await deleteTask(task.id);
      fetchTasks();
      fetchTodaysTasks();
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && task.status !== statusFilter) {
      return false;
    }
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
      return false;
    }
    return true;
  });

  const isOverdue = (task: Task) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') {
      return false;
    }
    return new Date(task.due_date) < new Date();
  };

  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `היום ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (date.toDateString() === tomorrow.toDateString()) {
      return `מחר ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoadingTasks && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">משימות</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 ml-2" />
              משימה חדשה
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>יצירת משימה חדשה</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>כותרת *</Label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="תיאור קצר של המשימה"
                />
              </div>
              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="פרטים נוספים..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג משימה</Label>
                  <Select
                    value={newTask.task_type}
                    onValueChange={(value) => setNewTask({ ...newTask, task_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>עדיפות</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value) =>
                      setNewTask({ ...newTask, priority: value as Priority })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך יעד</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>שעה</Label>
                  <Input
                    type="time"
                    value={newTask.due_time}
                    onChange={(e) => setNewTask({ ...newTask, due_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  ביטול
                </Button>
                <Button onClick={handleCreateTask} disabled={!newTask.title}>
                  יצירה
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{todaysTasks.length}</div>
            <div className="text-sm text-gray-500">משימות להיום</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{overdueTasks.length}</div>
            <div className="text-sm text-gray-500">באיחור</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">
              {tasks.filter((t) => t.status === 'in_progress').length}
            </div>
            <div className="text-sm text-gray-500">בביצוע</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {tasks.filter((t) => t.status === 'completed').length}
            </div>
            <div className="text-sm text-gray-500">הושלמו</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש משימות..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as TaskStatus | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <Filter className="h-4 w-4 ml-2" />
            <SelectValue placeholder="סטטוס" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל הסטטוסים</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(value) => setPriorityFilter(value as Priority | 'all')}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="עדיפות" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">כל העדיפויות</SelectItem>
            {Object.entries(priorityConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>אין משימות להצגה</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const StatusIcon = statusConfig[task.status].icon;
            return (
              <Card
                key={task.id}
                className={`${isOverdue(task) ? 'border-red-300 bg-red-50/50' : ''}`}
              >
                <CardContent className="py-3">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleComplete(task)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            task.status === 'completed' ? 'line-through text-gray-400' : ''
                          }`}
                        >
                          {task.title}
                        </span>
                        <Badge className={`text-xs ${priorityConfig[task.priority].color}`}>
                          {priorityConfig[task.priority].label}
                        </Badge>
                        <Badge className={`text-xs ${statusConfig[task.status].color}`}>
                          <StatusIcon className="h-3 w-3 ml-1" />
                          {statusConfig[task.status].label}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-gray-500 truncate mt-1">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        {task.due_date && (
                          <div
                            className={`flex items-center gap-1 ${
                              isOverdue(task) ? 'text-red-600 font-medium' : ''
                            }`}
                          >
                            <Calendar className="h-3 w-3" />
                            {formatDueDate(task.due_date)}
                          </div>
                        )}
                        {task.contact && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {(task.contact as { full_name?: string })?.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() =>
                            updateTask(task.id, { status: 'in_progress' }).then(() => {
                              fetchTasks();
                              fetchTodaysTasks();
                            })
                          }
                        >
                          סמן כבביצוע
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleComplete(task)}>
                          {task.status === 'completed' ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => handleDelete(task)}
                        >
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
