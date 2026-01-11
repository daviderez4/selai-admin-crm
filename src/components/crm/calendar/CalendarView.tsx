'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Meeting, MeetingStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  User,
  Video,
  Phone,
  Users,
  Loader2,
  Calendar as CalendarIcon,
} from 'lucide-react';

const statusConfig: Record<MeetingStatus, { label: string; color: string }> = {
  scheduled: { label: 'מתוכנן', color: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'מאושר', color: 'bg-green-100 text-green-700' },
  completed: { label: 'הושלם', color: 'bg-gray-100 text-gray-700' },
  cancelled: { label: 'בוטל', color: 'bg-red-100 text-red-700' },
  no_show: { label: 'לא הגיע', color: 'bg-orange-100 text-orange-700' },
  rescheduled: { label: 'נדחה', color: 'bg-purple-100 text-purple-700' },
};

const meetingTypes = [
  { value: 'in_person', label: 'פגישה פנים אל פנים', icon: Users },
  { value: 'video', label: 'שיחת וידאו', icon: Video },
  { value: 'phone', label: 'שיחת טלפון', icon: Phone },
];

const DAYS_HEBREW = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const MONTHS_HEBREW = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

export function CalendarView() {
  const params = useParams();
  const projectId = params.id as string;

  const {
    meetings,
    upcomingMeetings,
    isLoadingMeetings,
    fetchMeetings,
    fetchUpcomingMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
  } = useCRMStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    meeting_type: 'in_person' as string,
    start_date: '',
    start_time: '09:00',
    end_time: '10:00',
    location: '',
  });

  useEffect(() => {
    fetchMeetings();
    fetchUpcomingMeetings();
  }, [fetchMeetings, fetchUpcomingMeetings]);

  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startPadding = firstDay.getDay();

    // Add padding days from previous month
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Add padding days from next month
    const endPadding = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  const getMeetingsForDate = (date: Date) => {
    return meetings.filter((meeting) => {
      const meetingDate = new Date(meeting.start_time);
      return (
        meetingDate.getFullYear() === date.getFullYear() &&
        meetingDate.getMonth() === date.getMonth() &&
        meetingDate.getDate() === date.getDate()
      );
    });
  };

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.start_date) return;

    const startDateTime = new Date(`${newMeeting.start_date}T${newMeeting.start_time}:00`);
    const endDateTime = new Date(`${newMeeting.start_date}T${newMeeting.end_time}:00`);

    await createMeeting({
      title: newMeeting.title,
      description: newMeeting.description || undefined,
      meeting_type: newMeeting.meeting_type as Meeting['meeting_type'],
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      location: newMeeting.location || undefined,
      status: 'scheduled',
    });

    setNewMeeting({
      title: '',
      description: '',
      meeting_type: 'in_person',
      start_date: '',
      start_time: '09:00',
      end_time: '10:00',
      location: '',
    });
    setIsCreateDialogOpen(false);
    fetchMeetings();
    fetchUpcomingMeetings();
  };

  const openCreateDialog = (date?: Date) => {
    if (date) {
      setNewMeeting({
        ...newMeeting,
        start_date: date.toISOString().split('T')[0],
      });
    }
    setIsCreateDialogOpen(true);
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  if (isLoadingMeetings && meetings.length === 0) {
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
        <h2 className="text-2xl font-bold">יומן</h2>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={(v) => setViewMode(v as 'week' | 'month')}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">שבוע</SelectItem>
              <SelectItem value="month">חודש</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openCreateDialog()}>
                <Plus className="h-4 w-4 ml-2" />
                פגישה חדשה
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>קביעת פגישה חדשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>כותרת *</Label>
                  <Input
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder="נושא הפגישה"
                  />
                </div>
                <div>
                  <Label>תיאור</Label>
                  <Textarea
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                    placeholder="פרטים נוספים..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>סוג פגישה</Label>
                  <Select
                    value={newMeeting.meeting_type}
                    onValueChange={(value) => setNewMeeting({ ...newMeeting, meeting_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meetingTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>תאריך *</Label>
                  <Input
                    type="date"
                    value={newMeeting.start_date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, start_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>שעת התחלה</Label>
                    <Input
                      type="time"
                      value={newMeeting.start_time}
                      onChange={(e) => setNewMeeting({ ...newMeeting, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>שעת סיום</Label>
                    <Input
                      type="time"
                      value={newMeeting.end_time}
                      onChange={(e) => setNewMeeting({ ...newMeeting, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>מיקום</Label>
                  <Input
                    value={newMeeting.location}
                    onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                    placeholder="כתובת או קישור לשיחה"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    ביטול
                  </Button>
                  <Button
                    onClick={handleCreateMeeting}
                    disabled={!newMeeting.title || !newMeeting.start_date}
                  >
                    יצירה
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigatePeriod('prev')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigatePeriod('next')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
            היום
          </Button>
        </div>
        <h3 className="text-lg font-semibold">
          {viewMode === 'week'
            ? `${getWeekDays()[0].toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} - ${getWeekDays()[6].toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : `${MONTHS_HEBREW[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-4">
              {/* Week Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_HEBREW.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {viewMode === 'week' ? (
                /* Week View */
                <div className="grid grid-cols-7 gap-1">
                  {getWeekDays().map((date) => {
                    const dayMeetings = getMeetingsForDate(date);
                    return (
                      <div
                        key={date.toISOString()}
                        className={`min-h-[150px] border rounded-lg p-2 cursor-pointer hover:bg-gray-50 ${
                          isToday(date) ? 'bg-primary/5 border-primary' : ''
                        }`}
                        onClick={() => openCreateDialog(date)}
                      >
                        <div
                          className={`text-sm font-medium mb-2 ${
                            isToday(date) ? 'text-primary' : ''
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayMeetings.slice(0, 3).map((meeting) => (
                            <div
                              key={meeting.id}
                              className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                              title={meeting.title}
                            >
                              {formatTime(meeting.start_time)} {meeting.title}
                            </div>
                          ))}
                          {dayMeetings.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{dayMeetings.length - 3} נוספות
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Month View */
                <div className="grid grid-cols-7 gap-1">
                  {getMonthDays().map(({ date, isCurrentMonth }, index) => {
                    const dayMeetings = getMeetingsForDate(date);
                    return (
                      <div
                        key={index}
                        className={`min-h-[80px] border rounded p-1 cursor-pointer hover:bg-gray-50 ${
                          !isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''
                        } ${isToday(date) ? 'bg-primary/5 border-primary' : ''}`}
                        onClick={() => openCreateDialog(date)}
                      >
                        <div
                          className={`text-xs font-medium ${
                            isToday(date) ? 'text-primary' : ''
                          }`}
                        >
                          {date.getDate()}
                        </div>
                        {dayMeetings.length > 0 && (
                          <div className="mt-1">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            {dayMeetings.length > 1 && (
                              <span className="text-[10px] text-gray-500">
                                +{dayMeetings.length - 1}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Meetings Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                פגישות קרובות
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingMeetings.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">אין פגישות קרובות</p>
              ) : (
                upcomingMeetings.slice(0, 5).map((meeting) => (
                  <div key={meeting.id} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="font-medium text-sm">{meeting.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(meeting.start_time).toLocaleDateString('he-IL', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                      {' '}
                      {formatTime(meeting.start_time)}
                    </div>
                    {meeting.location && (
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {meeting.location}
                      </div>
                    )}
                    <Badge className={`mt-2 text-xs ${statusConfig[meeting.status].color}`}>
                      {statusConfig[meeting.status].label}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
