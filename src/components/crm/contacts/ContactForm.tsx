'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCRMStore } from '@/lib/stores/crmStore';
import type { Contact, ContactInsert, ContactStatus } from '@/types/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, ArrowRight, Loader2 } from 'lucide-react';

interface ContactFormProps {
  contact?: Contact;
  isEdit?: boolean;
}

const statusOptions: { value: ContactStatus; label: string }[] = [
  { value: 'active', label: 'פעיל' },
  { value: 'inactive', label: 'לא פעיל' },
  { value: 'prospect', label: 'פוטנציאלי' },
  { value: 'converted', label: 'הומר' },
  { value: 'archived', label: 'בארכיון' },
];

const genderOptions = [
  { value: 'male', label: 'זכר' },
  { value: 'female', label: 'נקבה' },
  { value: 'other', label: 'אחר' },
];

const maritalOptions = [
  { value: 'single', label: 'רווק/ה' },
  { value: 'married', label: 'נשוי/אה' },
  { value: 'divorced', label: 'גרוש/ה' },
  { value: 'widowed', label: 'אלמן/ה' },
];

const employmentOptions = [
  { value: 'employed', label: 'שכיר' },
  { value: 'self_employed', label: 'עצמאי' },
  { value: 'unemployed', label: 'לא עובד' },
  { value: 'retired', label: 'פנסיונר' },
  { value: 'student', label: 'סטודנט' },
];

const incomeOptions = [
  { value: 'low', label: 'עד 10,000 ₪' },
  { value: 'medium', label: '10,000 - 20,000 ₪' },
  { value: 'high', label: '20,000 - 40,000 ₪' },
  { value: 'very_high', label: 'מעל 40,000 ₪' },
];

export function ContactForm({ contact, isEdit = false }: ContactFormProps) {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const { createContact, updateContact, isLoadingContacts, error } = useCRMStore();

  const [formData, setFormData] = useState<ContactInsert>({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    phone: contact?.phone || '',
    mobile: contact?.mobile || '',
    email: contact?.email || '',
    id_number: contact?.id_number || '',
    birth_date: contact?.birth_date || '',
    gender: contact?.gender || '',
    marital_status: contact?.marital_status || '',
    occupation: contact?.occupation || '',
    employer: contact?.employer || '',
    employment_type: contact?.employment_type || '',
    income_bracket: contact?.income_bracket || '',
    city: contact?.city || '',
    address: contact?.address || '',
    postal_code: contact?.postal_code || '',
    status: contact?.status || 'active',
    source: contact?.source || 'manual',
    notes: contact?.notes || '',
    tags: contact?.tags || [],
  });

  const [tagsInput, setTagsInput] = useState((contact?.tags || []).join(', '));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Parse tags from comma-separated string
    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const data = {
      ...formData,
      tags,
    };

    try {
      if (isEdit && contact) {
        await updateContact(contact.id, data);
        router.push(`/projects/${projectId}/crm/contacts/${contact.id}`);
      } else {
        const newContact = await createContact(data);
        if (newContact) {
          router.push(`/projects/${projectId}/crm/contacts/${newContact.id}`);
        }
      }
    } catch (err) {
      console.error('Failed to save contact:', err);
    }
  };

  const handleChange = (field: keyof ContactInsert, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowRight className="h-4 w-4 ml-2" />
            חזרה
          </Button>
          <h2 className="text-2xl font-bold">
            {isEdit ? 'עריכת איש קשר' : 'איש קשר חדש'}
          </h2>
        </div>
        <Button type="submit" disabled={isLoadingContacts}>
          {isLoadingContacts ? (
            <Loader2 className="h-4 w-4 ml-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 ml-2" />
          )}
          שמור
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Info */}
        <Card>
          <CardHeader>
            <CardTitle>פרטים אישיים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">שם פרטי *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleChange('first_name', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">שם משפחה</Label>
                <Input
                  id="last_name"
                  value={formData.last_name || ''}
                  onChange={(e) => handleChange('last_name', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="id_number">תעודת זהות</Label>
              <Input
                id="id_number"
                value={formData.id_number || ''}
                onChange={(e) => handleChange('id_number', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="birth_date">תאריך לידה</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">מין</Label>
                <Select
                  value={formData.gender || ''}
                  onValueChange={(v) => handleChange('gender', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="marital_status">מצב משפחתי</Label>
              <Select
                value={formData.marital_status || ''}
                onValueChange={(v) => handleChange('marital_status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  {maritalOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>פרטי התקשרות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile">טלפון נייד</Label>
              <Input
                id="mobile"
                type="tel"
                value={formData.mobile || ''}
                onChange={(e) => handleChange('mobile', e.target.value)}
                placeholder="05X-XXXXXXX"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">טלפון נוסף</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">עיר</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">כתובת</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Work Info */}
        <Card>
          <CardHeader>
            <CardTitle>פרטי תעסוקה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="occupation">תפקיד / עיסוק</Label>
              <Input
                id="occupation"
                value={formData.occupation || ''}
                onChange={(e) => handleChange('occupation', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employer">מעסיק</Label>
              <Input
                id="employer"
                value={formData.employer || ''}
                onChange={(e) => handleChange('employer', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employment_type">סוג העסקה</Label>
              <Select
                value={formData.employment_type || ''}
                onValueChange={(v) => handleChange('employment_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  {employmentOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="income_bracket">רמת הכנסה</Label>
              <Select
                value={formData.income_bracket || ''}
                onValueChange={(v) => handleChange('income_bracket', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  {incomeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Meta Info */}
        <Card>
          <CardHeader>
            <CardTitle>מידע נוסף</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">סטטוס</Label>
              <Select
                value={formData.status || 'active'}
                onValueChange={(v) => handleChange('status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="בחר" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">מקור</Label>
              <Input
                id="source"
                value={formData.source || ''}
                onChange={(e) => handleChange('source', e.target.value)}
                placeholder="לדוגמה: אתר, הפניה, פרסום"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">תגיות</Label>
              <Input
                id="tags"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="הפרד בפסיקים: VIP, לקוח ותיק, מעניין"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">הערות</Label>
              <Textarea
                id="notes"
                value={formData.notes || ''}
                onChange={(e) => handleChange('notes', e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
