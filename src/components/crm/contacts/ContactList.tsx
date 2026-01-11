'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Contact, ContactStatus, CRMFilters } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

const statusLabels: Record<ContactStatus, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  prospect: 'פוטנציאלי',
  converted: 'הומר',
  archived: 'בארכיון',
};

const statusColors: Record<ContactStatus, string> = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  prospect: 'bg-blue-100 text-blue-800',
  converted: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-500',
};

export function ContactList() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const {
    contacts,
    contactsTotal,
    contactsPage,
    contactsPageSize,
    isLoadingContacts,
    fetchContacts,
    deleteContact,
    setContactsFilters,
  } = useCRMStore();

  const setContactsPage = (page: number) => {
    setContactsFilters({ page });
  };

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContactStatus | ''>('');

  useEffect(() => {
    const filters: CRMFilters = {
      page: contactsPage,
      pageSize: contactsPageSize,
    };

    if (search) {
      filters.search = search;
    }
    if (statusFilter) {
      filters.status = statusFilter;
    }

    fetchContacts(filters);
  }, [contactsPage, search, statusFilter, fetchContacts, contactsPageSize]);

  const handleSearch = (value: string) => {
    setSearch(value);
    setContactsPage(1);
  };

  const handleStatusFilter = (status: ContactStatus | '') => {
    setStatusFilter(status);
    setContactsPage(1);
  };

  const totalPages = Math.ceil(contactsTotal / contactsPageSize);

  const handleDelete = async (contact: Contact) => {
    if (confirm(`האם אתה בטוח שברצונך למחוק את ${contact.full_name}?`)) {
      await deleteContact(contact.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">אנשי קשר</h2>
        <Button onClick={() => router.push(`/projects/${projectId}/crm/contacts/new`)}>
          <Plus className="h-4 w-4 ml-2" />
          איש קשר חדש
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="חיפוש לפי שם, טלפון, אימייל..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="h-4 w-4 ml-2" />
              {statusFilter ? statusLabels[statusFilter] : 'סטטוס'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleStatusFilter('')}>
              הכל
            </DropdownMenuItem>
            {Object.entries(statusLabels).map(([status, label]) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusFilter(status as ContactStatus)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">שם</TableHead>
              <TableHead className="text-right">טלפון</TableHead>
              <TableHead className="text-right">אימייל</TableHead>
              <TableHead className="text-right">עיר</TableHead>
              <TableHead className="text-right">סטטוס</TableHead>
              <TableHead className="text-right">מקור</TableHead>
              <TableHead className="text-right w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingContacts ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  לא נמצאו אנשי קשר
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/projects/${projectId}/crm/contacts/${contact.id}`)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{contact.full_name}</div>
                        {contact.id_number && (
                          <div className="text-sm text-gray-500">ת.ז. {contact.id_number}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.mobile || contact.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        {contact.mobile || contact.phone}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {contact.email}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>{contact.city || '-'}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[contact.status]}>
                      {statusLabels[contact.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{contact.source || '-'}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${projectId}/crm/contacts/${contact.id}`);
                          }}
                        >
                          צפייה
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/projects/${projectId}/crm/contacts/${contact.id}/edit`);
                          }}
                        >
                          עריכה
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(contact);
                          }}
                        >
                          מחיקה
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            מציג {(contactsPage - 1) * contactsPageSize + 1} -{' '}
            {Math.min(contactsPage * contactsPageSize, contactsTotal)} מתוך {contactsTotal}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={contactsPage === 1}
              onClick={() => setContactsPage(contactsPage - 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              עמוד {contactsPage} מתוך {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={contactsPage === totalPages}
              onClick={() => setContactsPage(contactsPage + 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
