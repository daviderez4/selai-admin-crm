'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  MoreVertical,
  Phone,
  Mail,
  User,
  ChevronRight,
  ChevronLeft,
  Filter,
  Upload,
  Download,
  Trash2,
  Edit,
  Loader2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  phone2: string | null;
  id_number: string | null;
  status: 'active' | 'inactive' | 'prospect' | 'archived';
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const statusLabels: Record<string, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  prospect: 'פוטנציאלי',
  archived: 'בארכיון',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  prospect: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-500',
};

export default function WorkspaceContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 25;

  // New contact dialog
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    full_name: '',
    email: '',
    phone: '',
    phone2: '',
    id_number: '',
    status: 'prospect',
    source: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Fetch contacts
  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/workspace/contacts?${params}`);
      const data = await res.json();

      if (data.success) {
        setContacts(data.data.contacts || []);
        setTotalCount(data.data.pagination?.total || 0);
        setTotalPages(data.data.pagination?.totalPages || 1);
      } else {
        toast.error('שגיאה בטעינת אנשי קשר');
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('שגיאה בטעינת אנשי קשר');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [page, search, statusFilter]);

  // Handle search with debounce
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Handle create contact
  const handleCreateContact = async () => {
    if (!newContact.full_name.trim()) {
      toast.error('נא להזין שם מלא');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/workspace/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('איש קשר נוצר בהצלחה');
        setIsNewContactOpen(false);
        setNewContact({
          full_name: '',
          email: '',
          phone: '',
          phone2: '',
          id_number: '',
          status: 'prospect',
          source: '',
          notes: '',
        });
        fetchContacts();
      } else {
        toast.error(data.error || 'שגיאה ביצירת איש קשר');
      }
    } catch (error) {
      console.error('Error creating contact:', error);
      toast.error('שגיאה ביצירת איש קשר');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete contact
  const handleDelete = async (contact: Contact) => {
    if (!confirm(`האם למחוק את ${contact.full_name}?`)) return;

    try {
      const res = await fetch(`/api/workspace/contacts/${contact.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        toast.success('איש קשר נמחק');
        fetchContacts();
      } else {
        toast.error('שגיאה במחיקת איש קשר');
      }
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('שגיאה במחיקת איש קשר');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="אנשי קשר"
        breadcrumbs={[
          { label: 'אזור עבודה', href: '/projects' },
          { label: 'אנשי קשר' },
        ]}
      />

      <div className="flex-1 p-6 overflow-auto" dir="rtl">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">אנשי קשר</h1>
                <p className="text-sm text-slate-500">{totalCount} אנשי קשר</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי שם, טלפון, אימייל..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pr-9 w-64"
                />
              </div>

              {/* Status Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 ml-2" />
                    {statusFilter ? statusLabels[statusFilter] : 'סטטוס'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setStatusFilter('')}>
                    הכל
                  </DropdownMenuItem>
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <DropdownMenuItem
                      key={status}
                      onClick={() => setStatusFilter(status)}
                    >
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Import */}
              <Button
                variant="outline"
                onClick={() => router.push('/workspace/contacts/import')}
              >
                <Upload className="h-4 w-4 ml-2" />
                ייבוא
              </Button>

              {/* New Contact */}
              <Button onClick={() => setIsNewContactOpen(true)}>
                <Plus className="h-4 w-4 ml-2" />
                איש קשר חדש
              </Button>
            </div>
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <h3 className="text-lg font-medium text-slate-700 mb-2">
                    אין אנשי קשר
                  </h3>
                  <p className="text-slate-500 mb-4">
                    {search ? 'לא נמצאו תוצאות לחיפוש' : 'התחל להוסיף אנשי קשר או ייבא מאקסל'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => router.push('/workspace/contacts/import')}>
                      <Upload className="h-4 w-4 ml-2" />
                      ייבוא מאקסל
                    </Button>
                    <Button onClick={() => setIsNewContactOpen(true)}>
                      <Plus className="h-4 w-4 ml-2" />
                      הוסף ידנית
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם מלא</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">ת.ז</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">מקור</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.map((contact) => (
                      <TableRow key={contact.id} className="cursor-pointer hover:bg-slate-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-500" />
                            </div>
                            {contact.full_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          {contact.phone && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {contact.email && (
                            <div className="flex items-center gap-1 text-slate-600">
                              <Mail className="h-3 w-3" />
                              {contact.email}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {contact.id_number || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[contact.status] || 'bg-gray-100'}>
                            {statusLabels[contact.status] || contact.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {contact.source || '-'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/workspace/contacts/${contact.id}`)}
                              >
                                <User className="h-4 w-4 ml-2" />
                                צפה בפרטים
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/workspace/contacts/${contact.id}/edit`)}
                              >
                                <Edit className="h-4 w-4 ml-2" />
                                עריכה
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDelete(contact)}
                              >
                                <Trash2 className="h-4 w-4 ml-2" />
                                מחק
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                עמוד {page} מתוך {totalPages} ({totalCount} רשומות)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Contact Dialog */}
      <Dialog open={isNewContactOpen} onOpenChange={setIsNewContactOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>איש קשר חדש</DialogTitle>
            <DialogDescription>הוסף איש קשר חדש לרשימה שלך</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="full_name">שם מלא *</Label>
              <Input
                id="full_name"
                value={newContact.full_name}
                onChange={(e) => setNewContact({ ...newContact, full_name: e.target.value })}
                placeholder="ישראל ישראלי"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  placeholder="050-1234567"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone2">טלפון נוסף</Label>
                <Input
                  id="phone2"
                  value={newContact.phone2}
                  onChange={(e) => setNewContact({ ...newContact, phone2: e.target.value })}
                  placeholder="03-1234567"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="id_number">תעודת זהות</Label>
                <Input
                  id="id_number"
                  value={newContact.id_number}
                  onChange={(e) => setNewContact({ ...newContact, id_number: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="status">סטטוס</Label>
                <Select
                  value={newContact.status}
                  onValueChange={(value) => setNewContact({ ...newContact, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">פוטנציאלי</SelectItem>
                    <SelectItem value="active">פעיל</SelectItem>
                    <SelectItem value="inactive">לא פעיל</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="source">מקור</Label>
              <Input
                id="source"
                value={newContact.source}
                onChange={(e) => setNewContact({ ...newContact, source: e.target.value })}
                placeholder="לדוגמה: אתר, הפניה, פייסבוק..."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes">הערות</Label>
              <Input
                id="notes"
                value={newContact.notes}
                onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                placeholder="הערות נוספות..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewContactOpen(false)}>
              ביטול
            </Button>
            <Button onClick={handleCreateContact} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 ml-2" />
              )}
              צור איש קשר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
