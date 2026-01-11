'use client';

import { useParams } from 'next/navigation';
import { Customer360 } from '@/components/crm/contacts';

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.contactId as string;

  return <Customer360 contactId={contactId} />;
}
