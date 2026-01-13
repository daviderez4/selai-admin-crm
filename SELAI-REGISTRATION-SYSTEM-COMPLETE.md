# SELAI Complete Registration & Identity System
# מערכת הרשמה וזהויות מלאה - יישום שלב אחר שלב
# DO NOT STOP - Complete ALL sections

---

## 🎯 OVERVIEW - What We're Building

A complete multi-tenant registration system with:
1. **5 User Types**: Admin, Manager, Supervisor, Agent, Client
2. **Registration Flow**: Form → Verification → Pending → Approval → Profile Setup
3. **Sela DB Integration**: Verify agents against 13,151 records in custom_data
4. **Auto-Contact Creation**: When approved, create contact records
5. **Client Portal**: Self-service area for insurance clients
6. **Communication**: Messaging between all parties

---

## 📊 CURRENT PROBLEM

The admin cannot see registration requests that were submitted. We need to fix:
1. Registration requests not saving to database
2. Admin panel not showing pending requests
3. Approval flow not working
4. User creation after approval not working

---

## PHASE 1: DATABASE SCHEMA

### Run this SQL in Supabase SQL Editor:

```sql
-- =====================================================
-- SELAI REGISTRATION SYSTEM - COMPLETE SCHEMA
-- =====================================================

-- 1. REGISTRATION REQUESTS TABLE
DROP TABLE IF EXISTS registration_requests CASCADE;
CREATE TABLE registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info (user provided)
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    national_id TEXT,                              -- תעודת זהות
    license_number TEXT,                           -- מספר רישיון
    
    -- Requested Role
    requested_role TEXT NOT NULL CHECK (requested_role IN ('manager', 'supervisor', 'agent', 'client')),
    requested_supervisor_id UUID,                  -- For agents - requested supervisor
    requested_manager_id UUID,                     -- For supervisors - requested manager
    
    -- For Clients
    agent_id UUID,                                 -- Which agent invited this client
    
    -- Additional Info
    company_name TEXT,
    notes TEXT,
    
    -- Sela Database Match (for agents)
    sela_match_found BOOLEAN DEFAULT false,
    sela_match_id UUID,                            -- ID from custom_data table
    sela_match_data JSONB,                         -- Full matched record
    match_confidence INTEGER DEFAULT 0,            -- 0-100
    match_method TEXT,                             -- 'national_id', 'license', 'name'
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    
    -- Review
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    rejection_reason TEXT,
    
    -- Created User (after approval)
    created_user_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- Indexes
CREATE INDEX idx_reg_status ON registration_requests(status);
CREATE INDEX idx_reg_email ON registration_requests(email);
CREATE INDEX idx_reg_role ON registration_requests(requested_role);
CREATE INDEX idx_reg_created ON registration_requests(created_at DESC);

-- 2. UPDATE USERS TABLE
ALTER TABLE users ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agent_number TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS agency_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_unit TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS producer TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sela_agent_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS sela_data JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS portal_access BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- 3. CLIENT INVITATIONS TABLE
CREATE TABLE IF NOT EXISTS client_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id),
    client_email TEXT NOT NULL,
    client_phone TEXT,
    client_name TEXT,
    token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    accepted_at TIMESTAMPTZ,
    created_user_id UUID,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON client_invitations(token);
CREATE INDEX idx_invitations_agent ON client_invitations(agent_id);
CREATE INDEX idx_invitations_status ON client_invitations(status);

-- 4. MESSAGES TABLE (for communication)
CREATE TABLE IF NOT EXISTS user_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    subject TEXT,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    message_type TEXT DEFAULT 'general',          -- 'general', 'system', 'alert', 'task'
    related_entity_type TEXT,                     -- 'policy', 'claim', 'lead', etc.
    related_entity_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_to ON user_messages(to_user_id, is_read);
CREATE INDEX idx_messages_from ON user_messages(from_user_id);

-- 5. DISABLE RLS FOR NOW (we'll add proper policies later)
ALTER TABLE registration_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE client_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_messages DISABLE ROW LEVEL SECURITY;

-- 6. Verification function
SELECT 'Database schema created successfully!' as status;
```

---

## PHASE 2: API ROUTES

### 2.1 Create Registration API
Create file: `src/app/api/registration/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch all registration requests (for admin)
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    
    // Get current user to check permissions
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get user role
    const { data: currentUser } = await supabase
      .from('users')
      .select('user_type, id')
      .eq('auth_id', user.id)
      .single();
    
    if (!currentUser || !['admin', 'manager', 'supervisor'].includes(currentUser.user_type)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Build query based on role
    let query = supabase
      .from('registration_requests')
      .select(`
        *,
        reviewer:reviewed_by(full_name, email),
        supervisor:requested_supervisor_id(full_name, email),
        manager:requested_manager_id(full_name, email)
      `)
      .order('created_at', { ascending: false });
    
    // Filter by status if not 'all'
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    // Supervisors only see agent requests assigned to them
    if (currentUser.user_type === 'supervisor') {
      query = query.eq('requested_supervisor_id', currentUser.id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching registrations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ registrations: data || [] });
  } catch (error) {
    console.error('Registration GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Submit new registration request
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const {
      full_name,
      email,
      phone,
      national_id,
      license_number,
      requested_role,
      requested_supervisor_id,
      requested_manager_id,
      company_name,
      notes
    } = body;
    
    // Validate required fields
    if (!full_name || !email || !phone || !requested_role) {
      return NextResponse.json({ 
        error: 'Missing required fields: full_name, email, phone, requested_role' 
      }, { status: 400 });
    }
    
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existingUser) {
      return NextResponse.json({ 
        error: 'Email already registered' 
      }, { status: 400 });
    }
    
    // Check if pending request exists
    const { data: existingRequest } = await supabase
      .from('registration_requests')
      .select('id')
      .eq('email', email)
      .eq('status', 'pending')
      .single();
    
    if (existingRequest) {
      return NextResponse.json({ 
        error: 'Registration request already pending for this email' 
      }, { status: 400 });
    }
    
    // For agents - try to match against Sela database
    let selaMatch = null;
    let matchConfidence = 0;
    let matchMethod = null;
    
    if (requested_role === 'agent' && (national_id || license_number)) {
      // Search by national_id first
      if (national_id) {
        const { data: matchByNationalId } = await supabase
          .from('custom_data')
          .select('*')
          .or(`"מזהה בעל רישיון".eq.${national_id},"מזהה בעל רישיון".ilike.%${national_id}%`)
          .limit(1)
          .single();
        
        if (matchByNationalId) {
          selaMatch = matchByNationalId;
          matchConfidence = 90;
          matchMethod = 'national_id';
        }
      }
      
      // If not found, try license number
      if (!selaMatch && license_number) {
        const { data: matchByLicense } = await supabase
          .from('custom_data')
          .select('*')
          .or(`"מספר רישיון".eq.${license_number},"מספר רישיון".ilike.%${license_number}%`)
          .limit(1)
          .single();
        
        if (matchByLicense) {
          selaMatch = matchByLicense;
          matchConfidence = 80;
          matchMethod = 'license';
        }
      }
      
      // If still not found, try fuzzy name match
      if (!selaMatch && full_name) {
        const { data: matchByName } = await supabase
          .from('custom_data')
          .select('*')
          .ilike('"שם בעל רישיון"', `%${full_name}%`)
          .limit(5);
        
        if (matchByName && matchByName.length > 0) {
          selaMatch = matchByName[0];
          matchConfidence = 50;
          matchMethod = 'name';
        }
      }
    }
    
    // Create registration request
    const { data: registration, error } = await supabase
      .from('registration_requests')
      .insert({
        full_name,
        email,
        phone,
        national_id,
        license_number,
        requested_role,
        requested_supervisor_id,
        requested_manager_id,
        company_name,
        notes,
        sela_match_found: !!selaMatch,
        sela_match_id: selaMatch?.id,
        sela_match_data: selaMatch,
        match_confidence: matchConfidence,
        match_method: matchMethod,
        status: 'pending'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating registration:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      registration,
      sela_match: selaMatch ? {
        found: true,
        confidence: matchConfidence,
        method: matchMethod,
        data: selaMatch
      } : { found: false }
    });
    
  } catch (error) {
    console.error('Registration POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2.2 Create Approval API
Create file: `src/app/api/registration/[id]/approve/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { id } = params;
    const body = await request.json();
    const { action, rejection_reason, reviewer_notes } = body;
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get reviewer info
    const { data: reviewer } = await supabase
      .from('users')
      .select('id, user_type, full_name')
      .eq('auth_id', user.id)
      .single();
    
    if (!reviewer || !['admin', 'manager', 'supervisor'].includes(reviewer.user_type)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // Get registration request
    const { data: registration, error: fetchError } = await supabase
      .from('registration_requests')
      .select('*')
      .eq('id', id)
      .single();
    
    if (fetchError || !registration) {
      return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    }
    
    if (registration.status !== 'pending') {
      return NextResponse.json({ error: 'Registration already processed' }, { status: 400 });
    }
    
    // Handle rejection
    if (action === 'reject') {
      const { error: rejectError } = await supabase
        .from('registration_requests')
        .update({
          status: 'rejected',
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes,
          rejection_reason
        })
        .eq('id', id);
      
      if (rejectError) {
        return NextResponse.json({ error: rejectError.message }, { status: 500 });
      }
      
      return NextResponse.json({ success: true, status: 'rejected' });
    }
    
    // Handle approval - Create user account
    if (action === 'approve') {
      // 1. Create auth user (or use existing if email exists in auth)
      // Note: In production, you'd send an invitation email
      // For now, we'll create the user record directly
      
      // 2. Create user record
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: registration.email,
          full_name: registration.full_name,
          phone: registration.phone,
          national_id: registration.national_id,
          license_number: registration.license_number,
          user_type: registration.requested_role,
          supervisor_id: registration.requested_supervisor_id,
          manager_id: registration.requested_manager_id,
          sela_agent_id: registration.sela_match_id,
          sela_data: registration.sela_match_data,
          verification_status: registration.sela_match_found ? 'verified' : 'pending',
          approved_by: reviewer.id,
          approved_at: new Date().toISOString(),
          is_active: true,
          is_profile_complete: false,
          portal_access: registration.requested_role === 'client'
        })
        .select()
        .single();
      
      if (userError) {
        console.error('Error creating user:', userError);
        return NextResponse.json({ error: userError.message }, { status: 500 });
      }
      
      // 3. Create contact record for CRM
      const contactData: any = {
        full_name: registration.full_name,
        email: registration.email,
        phone: registration.phone,
        contact_type: registration.requested_role === 'client' ? 'client' : 'team_member',
        status: 'active',
        user_id: newUser.id,
        notes: `נוצר אוטומטית מבקשת הרשמה. תפקיד: ${registration.requested_role}`
      };
      
      // Add to supervisor's contacts if agent
      if (registration.requested_role === 'agent' && registration.requested_supervisor_id) {
        contactData.assigned_to = registration.requested_supervisor_id;
      }
      
      // Add to agent's contacts if client
      if (registration.requested_role === 'client' && registration.agent_id) {
        contactData.assigned_to = registration.agent_id;
      }
      
      const { data: contact, error: contactError } = await supabase
        .from('crm_contacts')
        .insert(contactData)
        .select()
        .single();
      
      if (contactError) {
        console.error('Error creating contact:', contactError);
        // Don't fail the whole operation, just log it
      }
      
      // 4. Update registration request
      const { error: updateError } = await supabase
        .from('registration_requests')
        .update({
          status: 'approved',
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
          reviewer_notes,
          created_user_id: newUser.id
        })
        .eq('id', id);
      
      if (updateError) {
        console.error('Error updating registration:', updateError);
      }
      
      // 5. Send welcome message
      await supabase.from('user_messages').insert({
        from_user_id: reviewer.id,
        to_user_id: newUser.id,
        subject: 'ברוכים הבאים ל-SELAI!',
        content: `שלום ${registration.full_name},\n\nבקשת ההרשמה שלך אושרה בהצלחה.\nכעת תוכל להתחבר למערכת ולהשלים את הפרופיל שלך.\n\nבברכה,\n${reviewer.full_name}`,
        message_type: 'system'
      });
      
      return NextResponse.json({ 
        success: true, 
        status: 'approved',
        user: newUser,
        contact
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('Approval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2.3 Create Supervisors List API
Create file: `src/app/api/users/supervisors/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: supervisors, error } = await supabase
      .from('users')
      .select('id, full_name, email, phone')
      .in('user_type', ['supervisor', 'manager', 'admin'])
      .eq('is_active', true)
      .order('full_name');
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ supervisors: supervisors || [] });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 2.4 Create Client Invitation API
Create file: `src/app/api/clients/invite/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Create client invitation
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    const { client_email, client_phone, client_name } = body;
    
    // Get current user (agent)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { data: agent } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('auth_id', user.id)
      .single();
    
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    
    // Create invitation
    const { data: invitation, error } = await supabase
      .from('client_invitations')
      .insert({
        agent_id: agent.id,
        client_email,
        client_phone,
        client_name
      })
      .select()
      .single();
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // TODO: Send invitation email with link
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/register/client?token=${invitation.token}`;
    
    return NextResponse.json({ 
      success: true, 
      invitation,
      invite_url: inviteUrl
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## PHASE 3: REGISTRATION PAGES

### 3.1 Main Registration Page
Create file: `src/app/(auth)/register/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  User, 
  Users, 
  Briefcase, 
  UserCircle,
  ArrowRight,
  Building2
} from 'lucide-react';

const roleOptions = [
  {
    id: 'agent',
    title: 'סוכן ביטוח',
    description: 'הרשמה כסוכן ביטוח עצמאי או שכיר',
    icon: Briefcase,
    color: 'blue',
    href: '/register/agent'
  },
  {
    id: 'supervisor',
    title: 'מפקח / מנהל צוות',
    description: 'הרשמה כמפקח או מנהל צוות סוכנים',
    icon: Users,
    color: 'purple',
    href: '/register/supervisor'
  },
  {
    id: 'client',
    title: 'לקוח',
    description: 'הרשמה כלקוח של סוכן ביטוח',
    icon: UserCircle,
    color: 'green',
    href: '/register/client'
  }
];

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">SelaiOS</h1>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">הרשמה למערכת</h2>
          <p className="text-slate-400">בחר את סוג החשבון שברצונך ליצור</p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {roleOptions.map((role) => (
            <Link
              key={role.id}
              href={role.href}
              className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-xl bg-${role.color}-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <role.icon className={`w-7 h-7 text-${role.color}-400`} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{role.title}</h3>
              <p className="text-slate-400 text-sm mb-4">{role.description}</p>
              <div className="flex items-center text-blue-400 text-sm font-medium">
                <span>המשך להרשמה</span>
                <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-[-4px] transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-slate-400">
            כבר יש לך חשבון?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              התחבר כאן
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
```

### 3.2 Agent Registration Page
Create file: `src/app/(auth)/register/agent/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Briefcase, 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  CreditCard,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Search
} from 'lucide-react';

interface Supervisor {
  id: string;
  full_name: string;
  email: string;
}

interface SelaMatch {
  found: boolean;
  confidence: number;
  method: string;
  data: any;
}

export default function AgentRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [selaMatch, setSelaMatch] = useState<SelaMatch | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    national_id: '',
    license_number: '',
    requested_supervisor_id: '',
    company_name: '',
    notes: ''
  });

  // Fetch supervisors on mount
  useEffect(() => {
    fetchSupervisors();
  }, []);

  const fetchSupervisors = async () => {
    try {
      const res = await fetch('/api/users/supervisors');
      const data = await res.json();
      if (data.supervisors) {
        setSupervisors(data.supervisors);
      }
    } catch (err) {
      console.error('Error fetching supervisors:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const checkSelaDatabase = async () => {
    if (!formData.national_id && !formData.license_number) {
      return;
    }
    
    setChecking(true);
    try {
      // This would be a separate API call to check Sela DB
      // For now, we'll do it during submission
      setSelaMatch(null);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          requested_role: 'agent'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'שגיאה בשליחת הבקשה');
      }

      if (data.sela_match) {
        setSelaMatch(data.sela_match);
      }
      
      setSuccess(true);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/register/pending');
      }, 3000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">הבקשה נשלחה בהצלחה!</h2>
          <p className="text-slate-400 mb-4">בקשת ההרשמה שלך נקלטה במערכת וממתינה לאישור.</p>
          
          {selaMatch?.found && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <p className="text-blue-400 text-sm">
                ✅ נמצאה התאמה במאגר סוכני סלע ({selaMatch.confidence}% התאמה)
              </p>
            </div>
          )}
          
          <p className="text-slate-500 text-sm">מעביר לדף ההמתנה...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4" dir="rtl">
      <div className="w-full max-w-2xl mx-auto">
        {/* Back Link */}
        <Link href="/register" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה לבחירת סוג חשבון
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">הרשמה כסוכן ביטוח</h1>
          <p className="text-slate-400">מלא את הפרטים להגשת בקשת הרשמה</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {s}
                </div>
                {s < 2 && <div className={`w-16 h-1 mx-2 rounded ${step > s ? 'bg-blue-500' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">פרטים אישיים</h3>
              
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <User className="w-4 h-4 inline ml-2" />
                  שם מלא *
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="הכנס שם מלא"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Mail className="w-4 h-4 inline ml-2" />
                  אימייל *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="email@example.com"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Phone className="w-4 h-4 inline ml-2" />
                  טלפון נייד *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="050-0000000"
                />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!formData.full_name || !formData.email || !formData.phone}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
              >
                המשך
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4">פרטי רישום</h3>
              
              {/* National ID */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <CreditCard className="w-4 h-4 inline ml-2" />
                  תעודת זהות
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="national_id"
                    value={formData.national_id}
                    onChange={handleChange}
                    onBlur={checkSelaDatabase}
                    maxLength={9}
                    dir="ltr"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                    placeholder="000000000"
                  />
                  {checking && (
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">לצורך אימות מול מאגר סוכני סלע</p>
              </div>

              {/* License Number */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <FileText className="w-4 h-4 inline ml-2" />
                  מספר רישיון סוכן
                </label>
                <input
                  type="text"
                  name="license_number"
                  value={formData.license_number}
                  onChange={handleChange}
                  onBlur={checkSelaDatabase}
                  dir="ltr"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-left"
                  placeholder="L-00000000"
                />
              </div>

              {/* Supervisor Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  <Users className="w-4 h-4 inline ml-2" />
                  מפקח / מנהל
                </label>
                <select
                  name="requested_supervisor_id"
                  value={formData.requested_supervisor_id}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- בחר מפקח --</option>
                  {supervisors.map((sup) => (
                    <option key={sup.id} value={sup.id}>
                      {sup.full_name} ({sup.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  הערות נוספות
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="הערות או מידע נוסף..."
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  חזור
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    'שלח בקשת הרשמה'
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
```

### 3.3 Pending Approval Page
Create file: `src/app/(auth)/register/pending/page.tsx`

```tsx
'use client';

import Link from 'next/link';
import { Clock, Mail, Phone, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
          <Clock className="w-12 h-12 text-amber-400" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-4">בקשתך נקלטה בהצלחה</h1>
        <p className="text-slate-400 text-lg mb-8">
          בקשת ההרשמה שלך ממתינה לאישור מנהל המערכת
        </p>

        {/* Status Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">מה הלאה?</h3>
          <div className="space-y-4 text-right">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">הבקשה שלך נבדקת על ידי צוות המערכת</p>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">תקבל הודעה במייל כאשר הבקשה תאושר</p>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-purple-400 mt-0.5 flex-shrink-0" />
              <p className="text-slate-300">ייתכן שניצור איתך קשר לאימות פרטים</p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-8">
          <p className="text-blue-400 text-sm">
            שאלות? צור קשר: support@selai.app
          </p>
        </div>

        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 ml-2" />
          חזרה לדף הבית
        </Link>
      </div>
    </div>
  );
}
```

---

## PHASE 4: ADMIN REGISTRATION MANAGEMENT

### 4.1 Admin Registrations Page
Create file: `src/app/(dashboard)/admin/registrations/page.tsx`

```tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search,
  RefreshCw,
  Eye,
  UserCheck,
  UserX,
  AlertCircle,
  Loader2,
  Database,
  Percent
} from 'lucide-react';

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  national_id: string;
  license_number: string;
  requested_role: string;
  status: string;
  sela_match_found: boolean;
  sela_match_data: any;
  match_confidence: number;
  match_method: string;
  created_at: string;
  supervisor?: { full_name: string };
}

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    fetchRegistrations();
  }, [filter]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/registration?status=${filter}`);
      const data = await res.json();
      if (data.registrations) {
        setRegistrations(data.registrations);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/registration/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });
      
      if (res.ok) {
        fetchRegistrations();
        setSelectedReg(null);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/registration/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'reject',
          rejection_reason: rejectionReason
        })
      });
      
      if (res.ok) {
        fetchRegistrations();
        setSelectedReg(null);
        setShowRejectModal(false);
        setRejectionReason('');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setProcessing(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400 bg-green-400/10';
    if (confidence >= 50) return 'text-amber-400 bg-amber-400/10';
    return 'text-red-400 bg-red-400/10';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      agent: 'סוכן',
      supervisor: 'מפקח',
      manager: 'מנהל',
      client: 'לקוח'
    };
    return labels[role] || role;
  };

  const filteredRegistrations = registrations.filter(reg => 
    reg.full_name.includes(search) || 
    reg.email.includes(search) ||
    reg.phone.includes(search)
  );

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">בקשות הרשמה</h1>
          <p className="text-slate-500">ניהול ואישור בקשות הרשמה למערכת</p>
        </div>
        <button
          onClick={fetchRegistrations}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          רענן
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Status Filter */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          {[
            { value: 'pending', label: 'ממתינות', icon: Clock },
            { value: 'approved', label: 'אושרו', icon: CheckCircle2 },
            { value: 'rejected', label: 'נדחו', icon: XCircle },
            { value: 'all', label: 'הכל', icon: Users }
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <f.icon className="w-4 h-4" />
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, אימייל או טלפון..."
            className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'ממתינות', value: registrations.filter(r => r.status === 'pending').length, color: 'amber', icon: Clock },
          { label: 'אושרו היום', value: registrations.filter(r => r.status === 'approved').length, color: 'green', icon: CheckCircle2 },
          { label: 'עם התאמה במאגר', value: registrations.filter(r => r.sela_match_found).length, color: 'blue', icon: Database },
          { label: 'סה"כ', value: registrations.length, color: 'slate', icon: Users }
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Registrations List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">אין בקשות הרשמה</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredRegistrations.map((reg) => (
              <div 
                key={reg.id} 
                className="p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* User Info */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-slate-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800">{reg.full_name}</h3>
                      <p className="text-sm text-slate-500">{reg.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {getRoleLabel(reg.requested_role)}
                        </span>
                        {reg.sela_match_found && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getConfidenceColor(reg.match_confidence)}`}>
                            <Database className="w-3 h-3" />
                            {reg.match_confidence}% התאמה
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {reg.status === 'pending' && (
                      <>
                        <button
                          onClick={() => setSelectedReg(reg)}
                          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="צפה בפרטים"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleApprove(reg.id)}
                          disabled={processing === reg.id}
                          className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                          {processing === reg.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                          אשר
                        </button>
                        <button
                          onClick={() => { setSelectedReg(reg); setShowRejectModal(true); }}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                        >
                          <UserX className="w-4 h-4" />
                          דחה
                        </button>
                      </>
                    )}
                    {reg.status === 'approved' && (
                      <span className="flex items-center gap-2 text-green-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        אושר
                      </span>
                    )}
                    {reg.status === 'rejected' && (
                      <span className="flex items-center gap-2 text-red-600 text-sm">
                        <XCircle className="w-4 h-4" />
                        נדחה
                      </span>
                    )}
                  </div>
                </div>

                {/* Sela Match Data Preview */}
                {reg.sela_match_found && reg.sela_match_data && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-sm font-medium text-blue-800 mb-2">נתונים ממאגר סוכני סלע:</p>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-blue-600">מספר רישיון:</span>{' '}
                        <span className="text-slate-700">{reg.sela_match_data['מספר רישיון'] || '-'}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">סוכנות:</span>{' '}
                        <span className="text-slate-700">{reg.sela_match_data['סוכנות'] || '-'}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">יצרן:</span>{' '}
                        <span className="text-slate-700">{reg.sela_match_data['יצרן'] || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReg && !showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-800">פרטי בקשת הרשמה</h2>
              <button
                onClick={() => setSelectedReg(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500">שם מלא</p>
                  <p className="font-medium text-slate-800">{selectedReg.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">אימייל</p>
                  <p className="font-medium text-slate-800">{selectedReg.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">טלפון</p>
                  <p className="font-medium text-slate-800">{selectedReg.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">תפקיד מבוקש</p>
                  <p className="font-medium text-slate-800">{getRoleLabel(selectedReg.requested_role)}</p>
                </div>
                {selectedReg.national_id && (
                  <div>
                    <p className="text-sm text-slate-500">תעודת זהות</p>
                    <p className="font-medium text-slate-800">{selectedReg.national_id}</p>
                  </div>
                )}
                {selectedReg.license_number && (
                  <div>
                    <p className="text-sm text-slate-500">מספר רישיון</p>
                    <p className="font-medium text-slate-800">{selectedReg.license_number}</p>
                  </div>
                )}
              </div>

              {/* Sela Match */}
              {selectedReg.sela_match_found && selectedReg.sela_match_data && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Database className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-800">נתונים ממאגר סוכני סלע</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${getConfidenceColor(selectedReg.match_confidence)}`}>
                      {selectedReg.match_confidence}% התאמה
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {Object.entries(selectedReg.sela_match_data).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-blue-600">{key}:</span>{' '}
                        <span className="text-slate-700">{String(value) || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedReg.status === 'pending' && (
                <div className="flex gap-4 pt-4 border-t border-slate-200">
                  <button
                    onClick={() => handleApprove(selectedReg.id)}
                    disabled={processing === selectedReg.id}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {processing === selectedReg.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <UserCheck className="w-5 h-5" />
                    )}
                    אשר הרשמה
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
                  >
                    <UserX className="w-5 h-5" />
                    דחה בקשה
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedReg && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">דחיית בקשה</h2>
              <p className="text-slate-500 mt-1">דחיית הרשמה של {selectedReg.full_name}</p>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                סיבת הדחייה
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                placeholder="הכנס את סיבת הדחייה..."
              />
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                >
                  ביטול
                </button>
                <button
                  onClick={() => handleReject(selectedReg.id)}
                  disabled={processing === selectedReg.id || !rejectionReason}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl transition-colors"
                >
                  {processing === selectedReg.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <UserX className="w-5 h-5" />
                  )}
                  דחה בקשה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## PHASE 5: UPDATE MIDDLEWARE AND ROUTES

### 5.1 Update middleware.ts
Add these routes to publicRoutes array:

```typescript
const publicRoutes = [
  '/login',
  '/register',
  '/register/agent',
  '/register/supervisor',
  '/register/client',
  '/register/pending',
  '/landing',
  '/portal',
  // ... other existing routes
];
```

### 5.2 Add Admin Menu Link
In the sidebar component, add link to registrations:

```tsx
// For admin users
{ href: '/admin/registrations', label: 'בקשות הרשמה', icon: UserPlus }
```

---

## PHASE 6: TESTING CHECKLIST

After implementing all phases:

1. [ ] Run database SQL in Supabase
2. [ ] Create all API routes
3. [ ] Create all pages
4. [ ] Update middleware
5. [ ] Add sidebar links
6. [ ] Test: Go to /register and submit agent registration
7. [ ] Test: Login as admin and go to /admin/registrations
8. [ ] Test: Approve a registration
9. [ ] Test: Check that user was created
10. [ ] Test: Check that contact was created
11. [ ] Run npm run build - no errors

---

## START COMMAND

```
Read this entire file and implement all phases in order:
1. Run the database SQL in Supabase
2. Create all API files
3. Create all page files
4. Update middleware
5. Test the complete flow

Do not stop until all phases are complete and npm run build succeeds.
```
