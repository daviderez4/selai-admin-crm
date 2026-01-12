# SELAI Identity & Registration System - Complete Implementation Guide
# שמור את הקובץ הזה בזיכרון ועקוב אחרי כל השלבים

---

## 🎯 Overview - מה בונים

מערכת זהויות והרשמה מלאה ל-SELAI עם:
1. **5 סוגי משתמשים** עם הרשאות שונות
2. **הרשמה מאובטחת** עם אימות מול מאגר סוכני סלע (13,151 רשומות)
3. **זרימת אישור** על ידי אדמין/מפקח
4. **דף פרופיל אוטומטי** שנבנה מהמאגר

---

## 👥 User Hierarchy - היררכיית משתמשים

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELAI User Hierarchy                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│                        ┌─────────┐                               │
│                        │  Admin  │                               │
│                        │  מנהל   │                               │
│                        └────┬────┘                               │
│                             │                                    │
│              ┌──────────────┼──────────────┐                    │
│              │              │              │                    │
│         ┌────┴────┐   ┌────┴────┐   ┌────┴────┐               │
│         │Supervisor│   │Supervisor│   │Supervisor│               │
│         │  מפקח   │   │  מפקח   │   │  מפקח   │               │
│         └────┬────┘   └────┬────┘   └────┬────┘               │
│              │              │              │                    │
│         ┌────┴────┐   ┌────┴────┐   ┌────┴────┐               │
│         │ Agents  │   │ Agents  │   │ Agents  │               │
│         │ סוכנים  │   │ סוכנים  │   │ סוכנים  │               │
│         └────┬────┘   └────┬────┘   └────┬────┘               │
│              │              │              │                    │
│         ┌────┴────┐   ┌────┴────┐   ┌────┴────┐               │
│         │ Clients │   │ Clients │   │ Clients │               │
│         │ לקוחות  │   │ לקוחות  │   │ לקוחות  │               │
│         └─────────┘   └─────────┘   └─────────┘               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 User Types - הגדרת משתמשים

### 1. Admin (מנהל)
```typescript
interface AdminUser {
  user_type: 'admin';
  permissions: [
    'manage_all_users',
    'approve_registrations',
    'view_all_data',
    'manage_system_settings',
    'view_all_dashboards',
    'manage_supervisors',
    'import_export_data',
    'audit_logs',
    'manage_integrations'
  ];
  sees: 'everything';
  approves: ['supervisors', 'agents'];
}
```

### 2. Supervisor (מפקח)
```typescript
interface SupervisorUser {
  user_type: 'supervisor';
  permissions: [
    'manage_own_agents',
    'approve_agent_registrations',
    'view_team_data',
    'view_team_dashboards',
    'assign_leads',
    'view_team_reports',
    'manage_team_tasks'
  ];
  sees: 'own team data only';
  approves: ['agents under them'];
  reports_to: 'admin';
}
```

### 3. Agent (סוכן ביטוח)
```typescript
interface AgentUser {
  user_type: 'agent';
  permissions: [
    'manage_own_clients',
    'manage_own_leads',
    'manage_own_deals',
    'manage_own_tasks',
    'view_own_dashboard',
    'send_messages',
    'schedule_meetings',
    'upload_documents'
  ];
  sees: 'own data only';
  reports_to: 'supervisor';
  verified_against: 'sela_agents_database';
}
```

### 4. Client (לקוח)
```typescript
interface ClientUser {
  user_type: 'client';
  permissions: [
    'view_own_policies',
    'view_own_documents',
    'send_messages_to_agent',
    'request_documents',
    'submit_claims',
    'update_profile'
  ];
  sees: 'own data only';
  belongs_to: 'agent';
  access_via: ['client_portal', 'whatsapp'];
}
```

### 5. Pending (ממתין לאישור)
```typescript
interface PendingUser {
  user_type: 'pending';
  permissions: [];
  sees: 'pending_approval_page_only';
  waiting_for: 'admin or supervisor approval';
}
```

---

## 🗄️ Database Schema

### Table 1: users (טבלת משתמשים ראשית)
```sql
-- Drop and recreate users table with full schema
CREATE TABLE IF NOT EXISTS users (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE,                          -- Supabase auth.users id
    
    -- Basic info
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    
    -- Israeli identification
    national_id TEXT UNIQUE,                      -- תעודת זהות (9 digits)
    
    -- Role & Status
    user_type TEXT NOT NULL DEFAULT 'pending',    -- admin, supervisor, agent, client, pending
    is_active BOOLEAN DEFAULT false,
    is_profile_complete BOOLEAN DEFAULT false,
    
    -- Hierarchy
    supervisor_id UUID REFERENCES users(id),      -- For agents - who is their supervisor
    agent_id UUID REFERENCES users(id),           -- For clients - who is their agent
    
    -- Sela Agent Data (from 13,151 records database)
    sela_agent_id TEXT,                           -- ID from sela agents table
    license_number TEXT,                          -- מספר רישיון
    agent_number TEXT,                            -- מספר סוכן
    agency_name TEXT,                             -- שם סוכנות
    business_unit TEXT,                           -- יחידה עסקית
    producer TEXT,                                -- יצרן
    
    -- Verification
    verification_status TEXT DEFAULT 'pending',   -- pending, verified, rejected
    sela_data_verified BOOLEAN DEFAULT false,
    sela_data_verified_at TIMESTAMPTZ,
    sela_data_snapshot JSONB,                     -- Copy of sela data at verification time
    verification_confidence INTEGER,              -- 0-100 match score
    
    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Client Portal
    has_portal_access BOOLEAN DEFAULT false,
    portal_invite_token TEXT,
    portal_invite_expires_at TIMESTAMPTZ,
    
    -- Metadata
    notes TEXT,
    settings JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_supervisor ON users(supervisor_id);
CREATE INDEX idx_users_agent ON users(agent_id);
CREATE INDEX idx_users_national_id ON users(national_id);
CREATE INDEX idx_users_verification ON users(verification_status);
CREATE INDEX idx_users_sela_agent ON users(sela_agent_id);
```

### Table 2: registration_requests (בקשות הרשמה)
```sql
CREATE TABLE IF NOT EXISTS registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User provided data
    full_name TEXT NOT NULL,
    national_id TEXT NOT NULL,                    -- תעודת זהות
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT,                           -- Temporary until approved
    
    -- Requested role
    requested_role TEXT NOT NULL,                 -- supervisor, agent
    requested_supervisor_id UUID REFERENCES users(id),
    
    -- Optional data
    license_number TEXT,                          -- מספר רישיון (if known)
    company_name TEXT,
    notes TEXT,
    
    -- Sela database matching results
    sela_match_found BOOLEAN DEFAULT false,
    sela_match_id TEXT,                           -- ID of matched record
    sela_match_data JSONB,                        -- Full matched record
    match_confidence INTEGER DEFAULT 0,           -- 0-100
    match_details JSONB,                          -- What matched/didn't match
    
    -- Verification
    verification_method TEXT,                     -- 'national_id', 'license', 'name_fuzzy'
    verification_attempts INTEGER DEFAULT 0,
    last_verification_at TIMESTAMPTZ,
    
    -- Status
    status TEXT DEFAULT 'pending',                -- pending, approved, rejected, expired
    
    -- Admin review
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    rejection_reason TEXT,
    
    -- Created user (after approval)
    created_user_id UUID REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX idx_reg_status ON registration_requests(status);
CREATE INDEX idx_reg_national_id ON registration_requests(national_id);
CREATE INDEX idx_reg_email ON registration_requests(email);
```

### Table 3: sela_agents (מאגר סוכני סלע - כבר קיים כ-custom_data)
```sql
-- This table already exists as custom_data with 13,151 records
-- Structure based on the screenshot:

-- Columns available:
-- מספר סוכן (agent_number)
-- סוכנות (agency)
-- פעיל (is_active)
-- ספקח (supervisor - typo for מפקח)
-- יצרן (producer)
-- נוצר על ידי (created_by)
-- יחידה עסקית (business_unit)
-- מספר רישיון (license_number)
-- תאריך יצירה (created_date)
-- שם בעל רישיון (license_holder_name)
-- מזהה בעל רישיון (license_holder_id) -- This is national_id
-- תיאור מספר סוכן תאגיד (corporate_description)

-- Create a view for easier access
CREATE OR REPLACE VIEW sela_agents_view AS
SELECT 
    id,
    "מספר סוכן" as agent_number,
    "סוכנות" as agency,
    "פעיל" as is_active,
    "ספקח" as supervisor_name,
    "יצרן" as producer,
    "נוצר על ידי" as created_by,
    "יחידה עסקית" as business_unit,
    "מספר רישיון" as license_number,
    "תאריך יצירה" as created_date,
    "שם בעל רישיון" as full_name,
    "מזהה בעל רישיון" as national_id,
    "תיאור מספר סוכן תאגיד" as corporate_description
FROM custom_data;
```

### Table 4: user_sessions (מעקב התחברויות)
```sql
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session info
    session_token TEXT,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    
    -- Location (optional)
    country TEXT,
    city TEXT,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_active ON user_sessions(is_active);
```

---

## 🔄 Registration Flow - זרימת הרשמה

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SELAI Registration Flow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                           │
│  │  User visits │                                                           │
│  │  /register   │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    Registration Form                          │          │
│  │  ┌────────────────────────────────────────────────────────┐  │          │
│  │  │ סוג משתמש:    ○ מפקח    ● סוכן ביטוח                  │  │          │
│  │  │ שם מלא:       [________________________]               │  │          │
│  │  │ תעודת זהות:   [_________] (9 ספרות)                   │  │          │
│  │  │ מספר רישיון:  [____________] (אופציונלי)              │  │          │
│  │  │ טלפון נייד:   [____________]                          │  │          │
│  │  │ אימייל:       [________________________]               │  │          │
│  │  │ סיסמה:        [____________]                          │  │          │
│  │  │ מפקח:         [בחר מפקח ▼] (רק לסוכנים)              │  │          │
│  │  └────────────────────────────────────────────────────────┘  │          │
│  │                        [הרשם למערכת]                         │          │
│  └──────────────────────────────────────────────────────────────┘          │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │              🔍 Automatic Verification (Backend)              │          │
│  │                                                               │          │
│  │  1. Search sela_agents by national_id (exact match)          │          │
│  │  2. If not found, search by license_number                   │          │
│  │  3. If not found, search by name (fuzzy match)               │          │
│  │  4. Calculate confidence score (0-100)                       │          │
│  │  5. Save results to registration_request                     │          │
│  └──────────────────────────────────────────────────────────────┘          │
│         │                                                                    │
│         ├─────────────────────┬─────────────────────┐                       │
│         ▼                     ▼                     ▼                       │
│  ┌────────────┐        ┌────────────┐        ┌────────────┐                │
│  │ 🟢 High    │        │ 🟡 Medium  │        │ 🔴 Not     │                │
│  │ Match      │        │ Match      │        │ Found      │                │
│  │ (80-100%)  │        │ (50-79%)   │        │ (0%)       │                │
│  └─────┬──────┘        └─────┬──────┘        └─────┬──────┘                │
│        │                     │                     │                        │
│        │                     │                     │                        │
│        └─────────────────────┴─────────────────────┘                        │
│                              │                                              │
│                              ▼                                              │
│                    ┌──────────────────┐                                    │
│                    │  Pending Review  │                                    │
│                    │  /pending-approval│                                    │
│                    └────────┬─────────┘                                    │
│                             │                                              │
│                             ▼                                              │
│         ┌───────────────────────────────────────────┐                      │
│         │           Admin/Supervisor Review          │                      │
│         │                                            │                      │
│         │  • View submitted data                    │                      │
│         │  • View match confidence                  │                      │
│         │  • View Sela database match               │                      │
│         │  • Approve / Reject                       │                      │
│         └───────────────────────────────────────────┘                      │
│                             │                                              │
│              ┌──────────────┴──────────────┐                               │
│              ▼                              ▼                               │
│       ┌────────────┐                ┌────────────┐                         │
│       │  Approved  │                │  Rejected  │                         │
│       └─────┬──────┘                └─────┬──────┘                         │
│             │                             │                                │
│             ▼                             ▼                                │
│  ┌──────────────────────┐      ┌──────────────────────┐                   │
│  │  First Login         │      │  Rejection Email     │                   │
│  │  /profile-setup      │      │  with reason         │                   │
│  └──────────┬───────────┘      └──────────────────────┘                   │
│             │                                                              │
│             ▼                                                              │
│  ┌──────────────────────────────────────────────────────────────┐         │
│  │              Profile Setup Page (First Login)                 │         │
│  │                                                               │         │
│  │  "מצאנו את הפרטים שלך במאגר סוכני סלע!"                      │         │
│  │                                                               │         │
│  │  ┌─────────────────────────────────────────────────────────┐ │         │
│  │  │ פרטים אישיים (ניתן לעריכה)                             │ │         │
│  │  │ ─────────────────────────────────────────────           │ │         │
│  │  │ שם מלא:      [שלי וקנין            ] ✏️                │ │         │
│  │  │ טלפון:       [050-1234567          ] ✏️                │ │         │
│  │  │ אימייל:      [sheli@sela.co.il     ] ✏️                │ │         │
│  │  └─────────────────────────────────────────────────────────┘ │         │
│  │                                                               │         │
│  │  ┌─────────────────────────────────────────────────────────┐ │         │
│  │  │ פרטים מאומתים (מהמאגר - לא ניתן לשינוי)                │ │         │
│  │  │ ─────────────────────────────────────────────           │ │         │
│  │  │ ת"ז:          301836607            🔒                   │ │         │
│  │  │ מספר רישיון:  L-00110381           🔒                   │ │         │
│  │  │ מספר סוכן:    99207                🔒                   │ │         │
│  │  │ סוכנות:       סלע סוכנות לביטוח    🔒                   │ │         │
│  │  │ יחידה עסקית:  סלע סוכנים           🔒                   │ │         │
│  │  │ יצרן:         כלל פנסיה וגמל       🔒                   │ │         │
│  │  │ מפקח:         לירון מאיר           🔒                   │ │         │
│  │  └─────────────────────────────────────────────────────────┘ │         │
│  │                                                               │         │
│  │                 [❌ זה לא אני]  [✅ אשר והמשך]               │         │
│  └──────────────────────────────────────────────────────────────┘         │
│             │                                                              │
│             ▼                                                              │
│       ┌────────────┐                                                       │
│       │ Dashboard  │                                                       │
│       │ (by role)  │                                                       │
│       └────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Access Control - מי רואה מה

### Admin Dashboard
```typescript
// Route: /admin/*
const adminRoutes = [
  '/admin/dashboard',           // סקירה כללית
  '/admin/users',               // ניהול משתמשים
  '/admin/registrations',       // אישור הרשמות
  '/admin/supervisors',         // ניהול מפקחים
  '/admin/agents',              // כל הסוכנים
  '/admin/clients',             // כל הלקוחות
  '/admin/reports',             // דוחות מערכת
  '/admin/settings',            // הגדרות
  '/admin/audit-log',           // יומן פעולות
  '/admin/data-import',         // יבוא נתונים
  '/admin/integrations',        // אינטגרציות
];

// What Admin sees on dashboard
const adminDashboard = {
  stats: {
    total_users: 'all',
    total_agents: 'all',
    total_clients: 'all',
    pending_approvals: 'all',
    active_leads: 'all',
    deals_this_month: 'all',
  },
  tables: {
    users: 'all records',
    leads: 'all records',
    deals: 'all records',
    policies: 'all records',
  },
  actions: [
    'approve_users',
    'manage_all_settings',
    'view_all_reports',
    'export_data',
  ]
};
```

### Supervisor Dashboard
```typescript
// Route: /supervisor/*
const supervisorRoutes = [
  '/supervisor/dashboard',      // סקירת צוות
  '/supervisor/team',           // ניהול הסוכנים שלי
  '/supervisor/registrations',  // אישור סוכנים חדשים
  '/supervisor/leads',          // לידים של הצוות
  '/supervisor/deals',          // עסקאות של הצוות
  '/supervisor/reports',        // דוחות צוות
  '/supervisor/tasks',          // משימות צוות
];

// What Supervisor sees
const supervisorDashboard = {
  stats: {
    my_agents: 'agents where supervisor_id = me',
    team_clients: 'clients of my agents',
    team_leads: 'leads of my agents',
    team_deals: 'deals of my agents',
    pending_approvals: 'registrations requesting me as supervisor',
  },
  tables: {
    agents: 'WHERE supervisor_id = current_user.id',
    leads: 'WHERE agent_id IN (my_agents)',
    deals: 'WHERE agent_id IN (my_agents)',
  },
  actions: [
    'approve_agents',
    'assign_leads',
    'view_team_reports',
  ]
};
```

### Agent Dashboard
```typescript
// Route: /dashboard/* (agent routes)
const agentRoutes = [
  '/dashboard',                 // דשבורד ראשי
  '/dashboard/leads',           // הלידים שלי
  '/dashboard/clients',         // הלקוחות שלי
  '/dashboard/deals',           // העסקאות שלי
  '/dashboard/tasks',           // המשימות שלי
  '/dashboard/calendar',        // היומן שלי
  '/dashboard/messages',        // הודעות
  '/dashboard/documents',       // מסמכים
  '/dashboard/reports',         // הדוחות שלי
];

// What Agent sees
const agentDashboard = {
  stats: {
    my_leads: 'leads WHERE agent_id = me',
    my_clients: 'clients WHERE agent_id = me',
    my_deals: 'deals WHERE agent_id = me',
    my_tasks: 'tasks WHERE assigned_to = me',
    my_meetings: 'meetings WHERE agent_id = me',
  },
  tables: {
    leads: 'WHERE agent_id = current_user.id',
    clients: 'WHERE agent_id = current_user.id',
    deals: 'WHERE agent_id = current_user.id',
  },
  sees_supervisor: true,
  sees_other_agents: false,
};
```

### Client Portal
```typescript
// Route: /portal/*
const clientRoutes = [
  '/portal',                    // דשבורד לקוח
  '/portal/policies',           // הפוליסות שלי
  '/portal/documents',          // המסמכים שלי
  '/portal/messages',           // הודעות לסוכן
  '/portal/claims',             // תביעות
  '/portal/profile',            // פרופיל
];

// What Client sees
const clientPortal = {
  my_agent: 'user WHERE id = client.agent_id',
  my_policies: 'policies WHERE client_id = me',
  my_documents: 'documents WHERE client_id = me',
  my_messages: 'messages WHERE client_id = me',
  actions: [
    'view_policies',
    'download_documents',
    'request_documents',
    'send_message_to_agent',
    'submit_claim',
  ]
};
```

---

## 📁 File Structure to Create

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── register-supervisor/page.tsx      # NEW - הרשמת מפקח
│   │   ├── register-agent/page.tsx           # UPDATE - הרשמת סוכן עם אימות
│   │   ├── pending-approval/page.tsx
│   │   ├── profile-setup/page.tsx            # NEW - דף הגדרת פרופיל ראשוני
│   │   └── layout.tsx
│   │
│   ├── (dashboard)/                          # Agent routes
│   │   ├── dashboard/page.tsx
│   │   ├── leads/page.tsx
│   │   ├── clients/page.tsx
│   │   └── ...existing routes
│   │
│   ├── supervisor/                           # NEW - Supervisor routes
│   │   ├── dashboard/page.tsx
│   │   ├── team/page.tsx
│   │   ├── registrations/page.tsx
│   │   ├── leads/page.tsx
│   │   ├── reports/page.tsx
│   │   └── layout.tsx
│   │
│   ├── admin/                               # Admin routes
│   │   ├── dashboard/page.tsx
│   │   ├── users/page.tsx
│   │   ├── registrations/page.tsx           # NEW - אישור הרשמות
│   │   ├── supervisors/page.tsx             # NEW - ניהול מפקחים
│   │   ├── agents/page.tsx
│   │   └── layout.tsx
│   │
│   ├── portal/                              # Client portal
│   │   ├── page.tsx
│   │   ├── policies/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── messages/page.tsx
│   │   └── layout.tsx
│   │
│   └── api/
│       ├── auth/
│       │   ├── register/route.ts            # Registration API
│       │   ├── verify-agent/route.ts        # NEW - Verify against Sela DB
│       │   └── approve/route.ts             # NEW - Approve registration
│       │
│       └── users/
│           ├── route.ts
│           └── [id]/route.ts
│
├── components/
│   ├── auth/
│   │   ├── RegisterForm.tsx
│   │   ├── AgentRegisterForm.tsx            # NEW - טופס הרשמת סוכן
│   │   ├── SupervisorRegisterForm.tsx       # NEW - טופס הרשמת מפקח
│   │   ├── ProfileSetupForm.tsx             # NEW - טופס הגדרת פרופיל
│   │   ├── PendingApprovalStatus.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── admin/
│   │   ├── RegistrationApprovalList.tsx     # NEW - רשימת בקשות
│   │   ├── RegistrationApprovalCard.tsx     # NEW - כרטיס בקשה
│   │   ├── UserManagement.tsx
│   │   └── SupervisorManagement.tsx         # NEW
│   │
│   └── shared/
│       ├── RoleBasedRedirect.tsx            # NEW - הפניה לפי תפקיד
│       └── PermissionGate.tsx               # NEW - בקרת הרשאות
│
├── lib/
│   ├── auth/
│   │   ├── verification.ts                  # NEW - Agent verification logic
│   │   ├── permissions.ts                   # NEW - Permission checks
│   │   └── roleRoutes.ts                    # NEW - Routes by role
│   │
│   └── utils/
│       ├── hebrewUtils.ts                   # Hebrew name normalization
│       └── validations.ts                   # Israeli ID validation
│
├── types/
│   ├── auth.ts                              # UPDATE - Add all user types
│   └── registration.ts                      # NEW - Registration types
│
└── contexts/
    └── AuthContext.tsx                      # UPDATE - Full role support
```

---

## 🔧 Implementation Steps

### Step 1: Update Database
Run the SQL schemas above in Supabase to create/update tables.

### Step 2: Create Verification Service
```typescript
// src/lib/auth/verification.ts

export interface VerificationResult {
  found: boolean;
  confidence: number;
  matchedRecord?: SelaAgentRecord;
  matchDetails: {
    national_id: boolean;
    license_number: boolean;
    name: boolean;
    name_similarity?: number;
  };
}

export async function verifyAgentAgainstSelaDB(
  nationalId: string,
  licenseNumber?: string,
  fullName?: string
): Promise<VerificationResult> {
  // Implementation
}
```

### Step 3: Create Registration Pages
- register-supervisor/page.tsx
- register-agent/page.tsx (with verification)
- profile-setup/page.tsx

### Step 4: Create Admin Approval System
- RegistrationApprovalList component
- Approval API endpoints
- Email notifications

### Step 5: Create Role-Based Routing
- RoleBasedRedirect component
- PermissionGate component
- Update ProtectedRoute

### Step 6: Create Supervisor Dashboard
- Full supervisor area
- Team management
- Agent approval

---

## 🎯 Summary - What to Build

| Component | Priority | Description |
|-----------|----------|-------------|
| Database Schema | 🔴 High | Update users table, create registration_requests |
| Verification Service | 🔴 High | Match registration against Sela DB |
| Agent Registration | 🔴 High | Form with verification |
| Supervisor Registration | 🔴 High | Form for supervisors |
| Admin Approval Page | 🔴 High | Review and approve registrations |
| Profile Setup Page | 🟡 Medium | First login profile completion |
| Supervisor Dashboard | 🟡 Medium | Full supervisor area |
| Role-Based Routing | 🟡 Medium | Redirect users to correct dashboard |
| Permission Gates | 🟢 Lower | Fine-grained access control |

---

## 🚀 Start Command for Claude Code

```
Implement the SELAI Identity & Registration System following this guide.

Start with:
1. Update database schema (run SQL)
2. Create verification service (src/lib/auth/verification.ts)
3. Create agent registration page with Sela DB verification
4. Create admin approval page

The Sela agents database is in table 'custom_data' with 13,151 records.
Key columns: מזהה בעל רישיון (national_id), מספר רישיון (license_number), שם בעל רישיון (full_name)

All UI must be in Hebrew RTL.
Do not modify existing dashboard pages.
```

---

*Document Version: 1.0*
*Project: SELAI - Smart Agent House*
*Date: January 2026*
