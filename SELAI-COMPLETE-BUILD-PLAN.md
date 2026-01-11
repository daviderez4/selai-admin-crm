# 🚀 SELAI - תכנית בנייה מקיפה לקלוד קוד
## מערכת ניהול סוכנויות ביטוח חכמה | Next.js + Supabase + n8n

---

## 📋 תוכן עניינים
1. [סקירת הפרויקט](#1-סקירת-הפרויקט)
2. [מבנה תיקיות](#2-מבנה-תיקיות)
3. [Supabase Schema](#3-supabase-schema)
4. [קומפוננטות UI](#4-קומפוננטות-ui)
5. [דפים (Pages)](#5-דפים-pages)
6. [שירותים (Services)](#6-שירותים-services)
7. [Hooks](#7-hooks)
8. [סדר ביצוע](#8-סדר-ביצוע)

---

## 1. סקירת הפרויקט

### Stack טכנולוגי
```
Frontend:     Next.js 14 (App Router) + TypeScript + Tailwind CSS
Backend:      Supabase (PostgreSQL + Auth + Realtime + Storage)
Automation:   n8n (Workflows)
AI:           OpenAI API (GPT-4, Whisper)
WhatsApp:     GreenAPI
Calendar:     Cal.com Integration
```

### יעדים
- 200-500 סוכני ביטוח
- 4 סוגי משתמשים: Admin, Supervisor, Agent, Client
- PWA מלא (Progressive Web App)
- RTL מלא (Hebrew)
- RLS מלא (Row Level Security)

---

## 2. מבנה תיקיות

```
selai-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (no layout)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── register/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   ├── (dashboard)/              # Protected routes
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # Main dashboard
│   │   │
│   │   ├── contacts/
│   │   │   ├── page.tsx          # Contacts list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Contact detail (Customer 360)
│   │   │   └── new/
│   │   │       └── page.tsx      # New contact
│   │   │
│   │   ├── leads/
│   │   │   ├── page.tsx          # Leads board/list
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Lead detail
│   │   │   └── new/
│   │   │       └── page.tsx      # New lead
│   │   │
│   │   ├── deals/
│   │   │   ├── page.tsx          # Deals pipeline
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Deal detail
│   │   │   └── new/
│   │   │       └── page.tsx      # New deal
│   │   │
│   │   ├── tasks/
│   │   │   └── page.tsx          # Tasks management
│   │   │
│   │   ├── calendar/
│   │   │   └── page.tsx          # Calendar & meetings
│   │   │
│   │   ├── messages/
│   │   │   ├── page.tsx          # Messages inbox
│   │   │   └── compose/
│   │   │       └── page.tsx      # New message
│   │   │
│   │   ├── campaigns/
│   │   │   ├── page.tsx          # Campaign center
│   │   │   ├── [id]/
│   │   │   │   └── page.tsx      # Campaign detail
│   │   │   └── templates/
│   │   │       └── page.tsx      # Message templates
│   │   │
│   │   ├── landing-pages/
│   │   │   ├── page.tsx          # Landing pages list
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Landing page editor
│   │   │
│   │   ├── policies/
│   │   │   └── page.tsx          # Policies management
│   │   │
│   │   ├── reports/
│   │   │   └── page.tsx          # Reports & analytics
│   │   │
│   │   ├── settings/
│   │   │   ├── page.tsx          # Settings overview
│   │   │   ├── profile/
│   │   │   │   └── page.tsx      # Profile settings
│   │   │   └── integrations/
│   │   │       └── page.tsx      # Integrations
│   │   │
│   │   └── admin/                # Admin only routes
│   │       ├── users/
│   │       │   └── page.tsx      # User management
│   │       ├── companies/
│   │       │   └── page.tsx      # Insurance companies
│   │       └── system/
│   │           └── page.tsx      # System settings
│   │
│   ├── (portal)/                 # Client portal routes
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Client dashboard
│   │   ├── policies/
│   │   │   └── page.tsx          # My policies
│   │   ├── documents/
│   │   │   └── page.tsx          # My documents
│   │   └── messages/
│   │       └── page.tsx          # Messages with agent
│   │
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts
│   │   ├── webhooks/
│   │   │   ├── n8n/
│   │   │   │   └── route.ts
│   │   │   ├── whatsapp/
│   │   │   │   └── route.ts
│   │   │   └── calendar/
│   │   │       └── route.ts
│   │   └── upload/
│   │       └── route.ts
│   │
│   ├── globals.css
│   ├── layout.tsx                # Root layout
│   └── not-found.tsx
│
├── components/
│   ├── ui/                       # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── skeleton.tsx
│   │   ├── progress.tsx
│   │   └── calendar.tsx
│   │
│   ├── layout/                   # Layout components
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   ├── mobile-nav.tsx
│   │   └── breadcrumb.tsx
│   │
│   ├── dashboard/                # Dashboard components
│   │   ├── stats-cards.tsx
│   │   ├── recent-leads.tsx
│   │   ├── upcoming-meetings.tsx
│   │   ├── tasks-widget.tsx
│   │   └── performance-chart.tsx
│   │
│   ├── contacts/                 # Contact components
│   │   ├── contact-card.tsx
│   │   ├── contact-form.tsx
│   │   ├── contact-list.tsx
│   │   ├── customer-360.tsx
│   │   ├── coverage-map.tsx
│   │   ├── gap-analysis.tsx
│   │   ├── score-gauge.tsx
│   │   └── family-tree.tsx
│   │
│   ├── leads/                    # Lead components
│   │   ├── lead-card.tsx
│   │   ├── lead-form.tsx
│   │   ├── lead-board.tsx
│   │   └── lead-scoring.tsx
│   │
│   ├── deals/                    # Deal components
│   │   ├── deal-card.tsx
│   │   ├── deal-form.tsx
│   │   ├── pipeline-board.tsx
│   │   └── deal-timeline.tsx
│   │
│   ├── tasks/                    # Task components
│   │   ├── task-list.tsx
│   │   ├── task-form.tsx
│   │   └── task-calendar.tsx
│   │
│   ├── calendar/                 # Calendar components
│   │   ├── meeting-scheduler.tsx
│   │   ├── week-view.tsx
│   │   └── meeting-form.tsx
│   │
│   ├── messages/                 # Message components
│   │   ├── message-list.tsx
│   │   ├── message-compose.tsx
│   │   ├── whatsapp-status.tsx
│   │   └── template-picker.tsx
│   │
│   ├── campaigns/                # Campaign components
│   │   ├── campaign-card.tsx
│   │   ├── campaign-form.tsx
│   │   ├── template-editor.tsx
│   │   └── audience-picker.tsx
│   │
│   ├── ai/                       # AI components
│   │   ├── ai-assistant.tsx
│   │   ├── smart-suggestions.tsx
│   │   ├── voice-input.tsx
│   │   └── knowledge-chat.tsx
│   │
│   └── shared/                   # Shared components
│       ├── data-table.tsx
│       ├── search-input.tsx
│       ├── filter-bar.tsx
│       ├── empty-state.tsx
│       ├── loading-spinner.tsx
│       ├── error-boundary.tsx
│       └── confirmation-dialog.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Supabase browser client
│   │   ├── server.ts             # Supabase server client
│   │   ├── middleware.ts         # Auth middleware
│   │   └── types.ts              # Database types
│   │
│   ├── utils/
│   │   ├── cn.ts                 # Class names utility
│   │   ├── date.ts               # Date formatting
│   │   ├── phone.ts              # Phone formatting
│   │   ├── currency.ts           # Currency formatting
│   │   └── validators.ts         # Form validators
│   │
│   └── constants/
│       ├── roles.ts              # User roles
│       ├── statuses.ts           # Status constants
│       └── categories.ts         # Insurance categories
│
├── services/
│   ├── auth.service.ts           # Authentication
│   ├── users.service.ts          # User management
│   ├── contacts.service.ts       # Contacts CRUD
│   ├── leads.service.ts          # Leads CRUD
│   ├── deals.service.ts          # Deals CRUD
│   ├── tasks.service.ts          # Tasks CRUD
│   ├── meetings.service.ts       # Meetings CRUD
│   ├── messages.service.ts       # Messages
│   ├── campaigns.service.ts      # Campaigns
│   ├── policies.service.ts       # Policies
│   ├── whatsapp.service.ts       # WhatsApp integration
│   ├── calendar.service.ts       # Cal.com integration
│   ├── ai.service.ts             # OpenAI integration
│   └── analytics.service.ts      # Analytics
│
├── hooks/
│   ├── useAuth.ts                # Auth hook
│   ├── useUser.ts                # Current user
│   ├── useRole.ts                # Role check
│   ├── useContacts.ts            # Contacts data
│   ├── useLeads.ts               # Leads data
│   ├── useDeals.ts               # Deals data
│   ├── useTasks.ts               # Tasks data
│   ├── useMeetings.ts            # Meetings data
│   ├── useMessages.ts            # Messages data
│   ├── useRealtime.ts            # Supabase realtime
│   └── useMediaQuery.ts          # Responsive
│
├── stores/                       # Zustand stores
│   ├── auth.store.ts
│   ├── ui.store.ts
│   └── notifications.store.ts
│
├── types/
│   ├── database.types.ts         # Generated from Supabase
│   ├── api.types.ts              # API types
│   └── components.types.ts       # Component props
│
├── public/
│   ├── icons/
│   ├── images/
│   └── manifest.json             # PWA manifest
│
├── supabase/
│   ├── migrations/               # SQL migrations
│   │   ├── 001_users.sql
│   │   ├── 002_contacts.sql
│   │   ├── 003_leads.sql
│   │   ├── 004_deals.sql
│   │   ├── 005_tasks.sql
│   │   ├── 006_meetings.sql
│   │   ├── 007_messages.sql
│   │   ├── 008_campaigns.sql
│   │   ├── 009_policies.sql
│   │   ├── 010_documents.sql
│   │   ├── 011_audit_logs.sql
│   │   └── 012_rls_policies.sql
│   │
│   └── seed.sql                  # Seed data
│
├── middleware.ts                 # Next.js middleware
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.local
```

---

## 3. Supabase Schema

### 001_users.sql
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE user_role AS ENUM ('admin', 'supervisor', 'agent', 'client', 'pending');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'pending', 'suspended');

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
  phone TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'pending',
  status user_status DEFAULT 'pending',
  supervisor_id UUID REFERENCES public.users(id),
  subordinates UUID[] DEFAULT '{}',
  profile_completed BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent supervisor relations
CREATE TABLE public.agent_supervisor_relations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, supervisor_id)
);

-- User preferences
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'system',
  language TEXT DEFAULT 'he',
  notifications JSONB DEFAULT '{"email": true, "push": true, "whatsapp": true}',
  calendar_settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_supervisor ON public.users(supervisor_id);
CREATE INDEX idx_users_status ON public.users(status);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 002_contacts.sql
```sql
-- Contact status enum
CREATE TYPE contact_status AS ENUM ('active', 'inactive', 'prospect', 'converted', 'archived');

-- Contacts table
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Basic info
  first_name TEXT NOT NULL DEFAULT 'ללא שם',
  last_name TEXT,
  full_name TEXT GENERATED ALWAYS AS (COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) STORED,
  phone TEXT,
  mobile TEXT,
  email TEXT,
  
  -- Demographics
  id_number TEXT,
  birth_date DATE,
  gender TEXT,
  marital_status TEXT,
  wedding_anniversary DATE,
  
  -- Work
  occupation TEXT,
  employer TEXT,
  employment_type TEXT,
  income_bracket TEXT,
  
  -- Address
  city TEXT,
  address TEXT,
  postal_code TEXT,
  
  -- Meta
  source TEXT DEFAULT 'manual',
  source_file TEXT,
  upload_batch_id TEXT,
  status contact_status DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  
  -- Tracking
  converted_to_lead BOOLEAN DEFAULT false,
  lead_id UUID,
  converted_to_client BOOLEAN DEFAULT false,
  client_id UUID,
  
  -- Timestamps
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint per agent
  UNIQUE(agent_id, phone)
);

-- Contact family members
CREATE TABLE public.contact_family (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL, -- spouse, child, parent, sibling
  name TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact assets
CREATE TABLE public.contact_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL, -- car, property, business
  details JSONB NOT NULL,
  estimated_value DECIMAL(12,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact scores (AI-generated)
CREATE TABLE public.contact_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID UNIQUE NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  engagement_score INTEGER DEFAULT 0,
  satisfaction_score INTEGER DEFAULT 0,
  churn_risk_score INTEGER DEFAULT 0,
  growth_potential_score INTEGER DEFAULT 0,
  lifetime_value DECIMAL(12,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_contacts_agent ON public.contacts(agent_id);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_created ON public.contacts(created_at DESC);

-- Trigger
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 003_leads.sql
```sql
-- Lead status enum
CREATE TYPE lead_status AS ENUM (
  'new', 'assigned', 'contacted', 'qualified', 
  'proposal', 'negotiation', 'converted', 'lost', 'archived'
);

-- Lead priority enum
CREATE TYPE lead_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  supervisor_id UUID REFERENCES public.users(id),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  -- Basic info
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  company TEXT,
  
  -- Lead details
  source TEXT, -- landing_page, referral, campaign, manual
  source_campaign_id UUID,
  source_landing_page_id UUID,
  
  -- Status
  status lead_status DEFAULT 'new',
  priority lead_priority DEFAULT 'medium',
  score INTEGER DEFAULT 0,
  
  -- Interest
  interested_in TEXT[], -- ['car_insurance', 'life_insurance']
  estimated_value DECIMAL(12,2),
  
  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Tracking
  first_contact_at TIMESTAMPTZ,
  last_contact_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  lost_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead activities
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  activity_type TEXT NOT NULL, -- call, email, meeting, note, status_change
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_agent ON public.leads(agent_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_contact ON public.leads(contact_id);
CREATE INDEX idx_leads_created ON public.leads(created_at DESC);
CREATE INDEX idx_leads_score ON public.leads(score DESC);

-- Trigger
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 004_deals.sql
```sql
-- Deal status enum
CREATE TYPE deal_status AS ENUM (
  'discovery', 'proposal', 'negotiation', 
  'contract_sent', 'won', 'lost'
);

-- Deals table
CREATE TABLE public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Deal info
  title TEXT NOT NULL,
  description TEXT,
  
  -- Financial
  amount DECIMAL(12,2) NOT NULL,
  commission DECIMAL(12,2),
  commission_rate DECIMAL(5,2),
  currency TEXT DEFAULT 'ILS',
  
  -- Status
  status deal_status DEFAULT 'discovery',
  probability INTEGER DEFAULT 50,
  
  -- Product
  product_type TEXT, -- car_insurance, life_insurance, etc.
  insurance_company TEXT,
  policy_details JSONB DEFAULT '{}',
  
  -- Dates
  expected_close_date DATE,
  actual_close_date DATE,
  
  -- Notes
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  lost_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deal activities
CREATE TABLE public.deal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deals_agent ON public.deals(agent_id);
CREATE INDEX idx_deals_contact ON public.deals(contact_id);
CREATE INDEX idx_deals_status ON public.deals(status);
CREATE INDEX idx_deals_created ON public.deals(created_at DESC);

-- Trigger
CREATE TRIGGER update_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 005_tasks.sql
```sql
-- Task status enum
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE task_type AS ENUM (
  'call', 'email', 'meeting', 'follow_up', 
  'renewal', 'policy_creation', 'document', 'other'
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Related entities
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  
  -- Task info
  title TEXT NOT NULL,
  description TEXT,
  task_type task_type DEFAULT 'other',
  
  -- Status
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  
  -- Dates
  due_date TIMESTAMPTZ,
  due_time TIME,
  reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- AI source
  source TEXT DEFAULT 'manual', -- manual, ai_recommendation, automation
  ai_confidence DECIMAL(3,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tasks_agent ON public.tasks(agent_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due ON public.tasks(due_date);
CREATE INDEX idx_tasks_contact ON public.tasks(contact_id);

-- Trigger
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 006_meetings.sql
```sql
-- Meeting status enum
CREATE TYPE meeting_status AS ENUM (
  'scheduled', 'confirmed', 'completed', 
  'cancelled', 'no_show', 'rescheduled'
);

CREATE TYPE meeting_type AS ENUM (
  'in_person', 'video_call', 'phone_call', 'office'
);

-- Meetings table
CREATE TABLE public.meetings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  -- Meeting info
  title TEXT NOT NULL,
  description TEXT,
  meeting_type meeting_type DEFAULT 'video_call',
  
  -- Location
  location TEXT,
  video_link TEXT,
  
  -- Time
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER,
  
  -- Status
  status meeting_status DEFAULT 'scheduled',
  
  -- Cal.com integration
  cal_event_id TEXT,
  cal_booking_uid TEXT,
  
  -- Notes
  agenda TEXT,
  notes TEXT,
  outcome TEXT,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_meetings_agent ON public.meetings(agent_id);
CREATE INDEX idx_meetings_contact ON public.meetings(contact_id);
CREATE INDEX idx_meetings_start ON public.meetings(start_time);
CREATE INDEX idx_meetings_status ON public.meetings(status);

-- Trigger
CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON public.meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 007_messages.sql
```sql
-- Message channel enum
CREATE TYPE message_channel AS ENUM ('email', 'sms', 'whatsapp', 'internal');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  
  -- Message info
  channel message_channel NOT NULL,
  direction message_direction NOT NULL,
  status message_status DEFAULT 'pending',
  
  -- Content
  subject TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  
  -- Recipients
  from_address TEXT,
  to_address TEXT,
  
  -- Media
  attachments JSONB DEFAULT '[]',
  
  -- Template
  template_id UUID,
  template_variables JSONB DEFAULT '{}',
  
  -- WhatsApp specific
  whatsapp_message_id TEXT,
  whatsapp_status TEXT,
  
  -- AI analysis
  ai_analysis JSONB,
  ai_suggested_tasks UUID[],
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message templates
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID REFERENCES public.users(id) ON DELETE CASCADE, -- NULL = system template
  
  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  channel message_channel NOT NULL,
  category TEXT,
  
  -- Content
  subject TEXT,
  content TEXT NOT NULL,
  content_html TEXT,
  
  -- Variables
  variables TEXT[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  
  -- Usage stats
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_messages_agent ON public.messages(agent_id);
CREATE INDEX idx_messages_contact ON public.messages(contact_id);
CREATE INDEX idx_messages_channel ON public.messages(channel);
CREATE INDEX idx_messages_created ON public.messages(created_at DESC);

-- Trigger
CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 008_campaigns.sql
```sql
-- Campaign status enum
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled');

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Campaign info
  name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT, -- whatsapp_blast, email_sequence, sms
  
  -- Status
  status campaign_status DEFAULT 'draft',
  
  -- Template
  template_id UUID REFERENCES public.message_templates(id),
  message_content TEXT,
  
  -- Audience
  audience_filter JSONB DEFAULT '{}',
  contact_ids UUID[] DEFAULT '{}',
  total_recipients INTEGER DEFAULT 0,
  
  -- Schedule
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Stats
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Campaign recipients
CREATE TABLE public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  
  -- Status
  status message_status DEFAULT 'pending',
  
  -- Message
  message_id UUID REFERENCES public.messages(id),
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(campaign_id, contact_id)
);

-- Indexes
CREATE INDEX idx_campaigns_agent ON public.campaigns(agent_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);

-- Trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 009_policies.sql
```sql
-- Policy status enum
CREATE TYPE policy_status AS ENUM ('active', 'pending', 'cancelled', 'expired', 'renewed');

-- Insurance companies
CREATE TABLE public.insurance_companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_en TEXT,
  logo_url TEXT,
  website TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  api_endpoint TEXT,
  api_key_encrypted TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies table
CREATE TABLE public.policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  
  -- Policy info
  policy_number TEXT,
  policy_type TEXT NOT NULL, -- car_comprehensive, life, health, home, etc.
  category TEXT NOT NULL, -- car, home, life, health, savings, business
  
  -- Company
  insurance_company_id UUID REFERENCES public.insurance_companies(id),
  insurance_company_name TEXT,
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  renewal_date DATE,
  
  -- Financial
  premium_monthly DECIMAL(12,2),
  premium_annual DECIMAL(12,2),
  coverage_amount DECIMAL(12,2),
  deductible DECIMAL(12,2),
  
  -- Status
  status policy_status DEFAULT 'active',
  
  -- Commission
  commission_rate DECIMAL(5,2),
  commission_amount DECIMAL(12,2),
  
  -- Details
  coverage_details JSONB DEFAULT '{}',
  beneficiaries JSONB DEFAULT '[]',
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coverage gaps (AI-identified)
CREATE TABLE public.coverage_gaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  
  -- Gap info
  gap_type TEXT NOT NULL, -- missing_policy, under_coverage, bundle_opportunity
  category TEXT NOT NULL, -- car, home, life, health, savings
  title TEXT NOT NULL,
  description TEXT,
  
  -- Priority
  priority task_priority NOT NULL,
  
  -- Recommendation
  recommended_product TEXT,
  recommended_company TEXT,
  estimated_premium DECIMAL(12,2),
  estimated_commission DECIMAL(12,2),
  
  -- Talking points
  talking_points TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'open', -- open, contacted, converted, dismissed
  dismissed_reason TEXT,
  
  -- AI
  ai_confidence DECIMAL(3,2),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_policies_agent ON public.policies(agent_id);
CREATE INDEX idx_policies_contact ON public.policies(contact_id);
CREATE INDEX idx_policies_status ON public.policies(status);
CREATE INDEX idx_policies_renewal ON public.policies(renewal_date);
CREATE INDEX idx_coverage_gaps_contact ON public.coverage_gaps(contact_id);
CREATE INDEX idx_coverage_gaps_status ON public.coverage_gaps(status);

-- Triggers
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_coverage_gaps_updated_at
  BEFORE UPDATE ON public.coverage_gaps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 010_documents.sql
```sql
-- Document type enum
CREATE TYPE document_type AS ENUM (
  'policy', 'proposal', 'id', 'license', 
  'contract', 'claim', 'receipt', 'other'
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
  
  -- Document info
  name TEXT NOT NULL,
  description TEXT,
  document_type document_type DEFAULT 'other',
  
  -- File
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  
  -- Storage
  storage_path TEXT NOT NULL,
  
  -- OCR / AI
  extracted_text TEXT,
  ai_analysis JSONB,
  
  -- Access
  is_client_visible BOOLEAN DEFAULT false,
  
  -- Timestamps
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_agent ON public.documents(agent_id);
CREATE INDEX idx_documents_contact ON public.documents(contact_id);
CREATE INDEX idx_documents_policy ON public.documents(policy_id);
CREATE INDEX idx_documents_type ON public.documents(document_type);
```

### 011_landing_pages.sql
```sql
-- Landing page status enum
CREATE TYPE landing_page_status AS ENUM ('draft', 'published', 'archived');

-- Landing pages table
CREATE TABLE public.landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  
  -- Page info
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  
  -- Design
  template TEXT DEFAULT 'default',
  hero_image_url TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#2563EB',
  secondary_color TEXT DEFAULT '#1E3A8A',
  
  -- Content
  headline TEXT,
  subheadline TEXT,
  body_content TEXT,
  cta_text TEXT DEFAULT 'צור קשר',
  cta_url TEXT,
  
  -- Form fields
  form_fields JSONB DEFAULT '["name", "phone", "email"]',
  success_message TEXT DEFAULT 'תודה! ניצור קשר בהקדם',
  
  -- Status
  status landing_page_status DEFAULT 'draft',
  
  -- SEO
  meta_title TEXT,
  meta_description TEXT,
  
  -- Analytics
  views_count INTEGER DEFAULT 0,
  submissions_count INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN views_count > 0 
    THEN (submissions_count::DECIMAL / views_count * 100) 
    ELSE 0 END
  ) STORED,
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(agent_id, slug)
);

-- Landing page leads
CREATE TABLE public.landing_page_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  
  -- Submitted data
  form_data JSONB NOT NULL,
  name TEXT,
  phone TEXT,
  email TEXT,
  
  -- Source
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  referrer TEXT,
  
  -- Device
  user_agent TEXT,
  ip_address TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Landing page events (analytics)
CREATE TABLE public.landing_page_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  landing_page_id UUID NOT NULL REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  
  -- Event
  event_type TEXT NOT NULL, -- view, scroll, click, submit
  event_data JSONB DEFAULT '{}',
  
  -- Session
  session_id TEXT,
  
  -- Source
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_landing_pages_agent ON public.landing_pages(agent_id);
CREATE INDEX idx_landing_pages_status ON public.landing_pages(status);
CREATE INDEX idx_landing_pages_slug ON public.landing_pages(slug);
CREATE INDEX idx_landing_page_leads_page ON public.landing_page_leads(landing_page_id);
CREATE INDEX idx_landing_page_events_page ON public.landing_page_events(landing_page_id);

-- Trigger
CREATE TRIGGER update_landing_pages_updated_at
  BEFORE UPDATE ON public.landing_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 012_audit_logs.sql
```sql
-- Audit logs table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Action info
  action TEXT NOT NULL, -- create, update, delete, login, logout
  entity_type TEXT NOT NULL, -- users, contacts, leads, etc.
  entity_id UUID,
  
  -- Details
  old_data JSONB,
  new_data JSONB,
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security incidents
CREATE TABLE public.security_incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Incident info
  incident_type TEXT NOT NULL, -- failed_login, suspicious_activity, etc.
  severity TEXT DEFAULT 'low', -- low, medium, high, critical
  description TEXT,
  
  -- Details
  details JSONB DEFAULT '{}',
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  
  -- Resolution
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES public.users(id),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upload logs
CREATE TABLE public.upload_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Upload info
  file_name TEXT NOT NULL,
  batch_id TEXT,
  
  -- Stats
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  error_message TEXT,
  
  -- Details
  details JSONB DEFAULT '{}',
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);
CREATE INDEX idx_security_incidents_user ON public.security_incidents(user_id);
CREATE INDEX idx_upload_logs_agent ON public.upload_logs(agent_id);
```

### 013_rls_policies.sql
```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Helper function: Get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Get supervised agent IDs
CREATE OR REPLACE FUNCTION public.get_supervised_agents()
RETURNS UUID[] AS $$
  SELECT COALESCE(subordinates, '{}')
  FROM public.users
  WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Check if admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: Check if supervisor
CREATE OR REPLACE FUNCTION public.is_supervisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'supervisor')
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Users policies
CREATE POLICY "Users can view themselves" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT USING (public.is_admin());

CREATE POLICY "Supervisors can view their agents" ON public.users
  FOR SELECT USING (
    public.is_supervisor() AND id = ANY(public.get_supervised_agents())
  );

CREATE POLICY "Users can update themselves" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage all users" ON public.users
  FOR ALL USING (public.is_admin());

-- Contacts policies
CREATE POLICY "Agents own their contacts" ON public.contacts
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Leads policies
CREATE POLICY "Agents own their leads" ON public.leads
  FOR ALL USING (
    agent_id = auth.uid()
    OR supervisor_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Deals policies
CREATE POLICY "Agents own their deals" ON public.deals
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Tasks policies
CREATE POLICY "Agents own their tasks" ON public.tasks
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Meetings policies
CREATE POLICY "Agents own their meetings" ON public.meetings
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Messages policies
CREATE POLICY "Agents own their messages" ON public.messages
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Campaigns policies
CREATE POLICY "Agents own their campaigns" ON public.campaigns
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Policies policies
CREATE POLICY "Agents own their policies" ON public.policies
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Documents policies
CREATE POLICY "Agents own their documents" ON public.documents
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );

-- Landing pages policies
CREATE POLICY "Agents own their landing pages" ON public.landing_pages
  FOR ALL USING (
    agent_id = auth.uid()
    OR public.is_admin()
    OR (public.is_supervisor() AND agent_id = ANY(public.get_supervised_agents()))
  );
```

---

## 4. קומפוננטות UI

(המשך בקובץ הבא...)
## 4. קומפוננטות UI

### components/ui/button.tsx
```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"
import { Loader2 } from "lucide-react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25",
        destructive: "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30",
        outline: "border border-zinc-700 bg-transparent hover:bg-zinc-800 hover:text-white",
        secondary: "bg-zinc-800 text-white hover:bg-zinc-700",
        ghost: "hover:bg-zinc-800 hover:text-white",
        link: "text-blue-400 underline-offset-4 hover:underline",
        success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30",
        warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, isLoading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

### components/ui/card.tsx
```tsx
import * as React from "react"
import { cn } from "@/lib/utils/cn"

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }
>(({ className, hover = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm",
      hover && "transition-all hover:border-zinc-700 hover:bg-zinc-800/50",
      className
    )}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-xl font-semibold leading-none tracking-tight text-white", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-zinc-400", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

### components/ui/input.tsx
```tsx
import * as React from "react"
import { cn } from "@/lib/utils/cn"
import { LucideIcon } from "lucide-react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon: Icon, error, ...props }, ref) => {
    return (
      <div className="relative">
        {Icon && (
          <Icon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-xl border bg-zinc-900/50 px-4 py-2 text-sm text-white placeholder:text-zinc-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all duration-200",
            Icon && "pr-10",
            error 
              ? "border-red-500/50 focus:ring-red-500/50 focus:border-red-500" 
              : "border-zinc-700 hover:border-zinc-600",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-400">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
```

### components/ui/badge.tsx
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-zinc-800 text-zinc-300 border border-zinc-700",
        primary: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        success: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        danger: "bg-red-500/20 text-red-400 border border-red-500/30",
        info: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
        purple: "bg-violet-500/20 text-violet-400 border border-violet-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
```

### components/layout/sidebar.tsx
```tsx
"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'
import {
  LayoutDashboard, Users, UserPlus, Briefcase,
  CheckSquare, Calendar, MessageSquare, Megaphone,
  FileText, BarChart3, Settings, LogOut,
  ChevronLeft, ChevronRight, Shield, Building2,
  Globe
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles?: string[]
}

const mainNavItems: NavItem[] = [
  { title: 'דשבורד', href: '/dashboard', icon: LayoutDashboard },
  { title: 'אנשי קשר', href: '/contacts', icon: Users },
  { title: 'לידים', href: '/leads', icon: UserPlus },
  { title: 'עסקאות', href: '/deals', icon: Briefcase },
  { title: 'משימות', href: '/tasks', icon: CheckSquare },
  { title: 'יומן', href: '/calendar', icon: Calendar },
  { title: 'הודעות', href: '/messages', icon: MessageSquare },
  { title: 'קמפיינים', href: '/campaigns', icon: Megaphone },
  { title: 'דפי נחיתה', href: '/landing-pages', icon: Globe },
  { title: 'פוליסות', href: '/policies', icon: FileText },
  { title: 'דוחות', href: '/reports', icon: BarChart3 },
]

const adminNavItems: NavItem[] = [
  { title: 'ניהול משתמשים', href: '/admin/users', icon: Shield, roles: ['admin'] },
  { title: 'חברות ביטוח', href: '/admin/companies', icon: Building2, roles: ['admin'] },
  { title: 'הגדרות מערכת', href: '/admin/system', icon: Settings, roles: ['admin'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  const filteredAdminItems = adminNavItems.filter(item => 
    !item.roles || item.roles.includes(user?.role || '')
  )

  return (
    <aside 
      className={cn(
        "fixed right-0 top-0 z-40 h-screen bg-zinc-900/95 backdrop-blur-sm border-l border-zinc-800",
        "flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-white">SELAI</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
              isActive(item.href)
                ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/30"
                : "text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
          >
            <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive(item.href) && "text-blue-400")} />
            {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
          </Link>
        ))}

        {filteredAdminItems.length > 0 && (
          <>
            <div className="pt-4 pb-2">
              {!collapsed && <span className="px-3 text-xs font-medium text-zinc-500">ניהול</span>}
            </div>
            {filteredAdminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                  isActive(item.href)
                    ? "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 text-white border border-blue-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive(item.href) && "text-blue-400")} />
                {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-zinc-800">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50",
          collapsed && "justify-center"
        )}>
          <Avatar className="w-10 h-10">
            <AvatarImage src={user?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              {user?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
              <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>
        
        <button
          onClick={() => signOut()}
          className={cn(
            "mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl",
            "text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all",
            collapsed && "justify-center"
          )}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">התנתק</span>}
        </button>
      </div>
    </aside>
  )
}
```

### components/dashboard/stats-cards.tsx
```tsx
"use client"

import React from 'react'
import { Card } from '@/components/ui/card'
import { 
  Users, UserPlus, Briefcase, CheckSquare, 
  TrendingUp, TrendingDown, ArrowUpRight
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ElementType
  color: 'blue' | 'emerald' | 'violet' | 'amber' | 'cyan'
}

const colorClasses = {
  blue: 'from-blue-500 to-indigo-600',
  emerald: 'from-emerald-500 to-teal-600',
  violet: 'from-violet-500 to-purple-600',
  amber: 'from-amber-500 to-orange-600',
  cyan: 'from-cyan-500 to-blue-600',
}

function StatCard({ title, value, change, changeLabel, icon: Icon, color }: StatCardProps) {
  const isPositive = change && change > 0
  
  return (
    <Card className="p-6 hover:border-zinc-700 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span className={cn(
                "text-sm font-medium",
                isPositive ? "text-emerald-400" : "text-red-400"
              )}>
                {isPositive ? '+' : ''}{change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-zinc-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        
        <div className={cn(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center",
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </Card>
  )
}

interface StatsCardsProps {
  stats: {
    contacts: number
    leads: number
    deals: number
    tasks: number
    contactsChange?: number
    leadsChange?: number
    dealsChange?: number
    tasksChange?: number
  }
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="אנשי קשר"
        value={stats.contacts.toLocaleString()}
        change={stats.contactsChange}
        changeLabel="מהחודש שעבר"
        icon={Users}
        color="blue"
      />
      <StatCard
        title="לידים פעילים"
        value={stats.leads.toLocaleString()}
        change={stats.leadsChange}
        changeLabel="מהחודש שעבר"
        icon={UserPlus}
        color="emerald"
      />
      <StatCard
        title="עסקאות פתוחות"
        value={stats.deals.toLocaleString()}
        change={stats.dealsChange}
        changeLabel="מהחודש שעבר"
        icon={Briefcase}
        color="violet"
      />
      <StatCard
        title="משימות להיום"
        value={stats.tasks}
        change={stats.tasksChange}
        icon={CheckSquare}
        color="amber"
      />
    </div>
  )
}
```

### components/contacts/customer-360.tsx
```tsx
"use client"

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScoreGauge } from './score-gauge'
import { CoverageMap } from './coverage-map'
import { GapAnalysis } from './gap-analysis'
import { FamilyTree } from './family-tree'
import {
  User, Phone, Mail, MessageSquare, Calendar, MapPin,
  Car, Home, Heart, Shield, Briefcase, PiggyBank,
  AlertTriangle, CheckCircle, Clock, TrendingUp,
  Gift, Cake, Users, ChevronRight, Star, Zap, Target,
  Bell, Send, FileText, Activity, BarChart3
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Customer360Props {
  customer: {
    id: string
    name: string
    phone: string
    email: string
    avatar_url?: string
    birth_date?: string
    age?: number
    gender?: string
    marital_status?: string
    occupation?: string
    employer?: string
    city?: string
    customer_since?: string
    years_with_us?: number
    total_policies?: number
    total_premium_monthly?: number
    lifetime_value?: number
    scores?: {
      engagement: number
      satisfaction: number
      churn_risk: number
      growth_potential: number
    }
    family?: Array<{
      relationship: string
      name: string
      birth_date?: string
    }>
    policies?: Array<{
      id: string
      type: string
      category: string
      company: string
      premium_monthly: number
      renewal_date: string
      status: string
    }>
    gaps?: Array<{
      id: string
      category: string
      title: string
      priority: string
      description: string
      estimated_premium?: number
      estimated_commission?: number
      talking_points?: string[]
    }>
  }
}

export function Customer360({ customer }: Customer360Props) {
  const [activeTab, setActiveTab] = useState('overview')
  
  return (
    <div className="min-h-screen bg-black text-white p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={customer.avatar_url} />
              <AvatarFallback className="text-3xl bg-gradient-to-br from-cyan-500 to-blue-600">
                {customer.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{customer.name}</h1>
              <div className="flex items-center gap-4 mt-1 text-zinc-400">
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {customer.phone}
                </span>
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {customer.email}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {customer.years_with_us && (
                  <Badge variant="info">לקוח {customer.years_with_us} שנים</Badge>
                )}
                {customer.lifetime_value && (
                  <Badge variant="purple">ערך: ₪{customer.lifetime_value.toLocaleString()}</Badge>
                )}
                {customer.total_policies && (
                  <Badge variant="warning">{customer.total_policies} פוליסות</Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="success">
              <MessageSquare className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button variant="outline">
              <Phone className="w-4 h-4" />
              התקשר
            </Button>
          </div>
        </div>

        {/* Scores Row */}
        {customer.scores && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                ציוני לקוח
              </h3>
              <div className="grid grid-cols-4 gap-6">
                <ScoreGauge 
                  score={customer.scores.engagement} 
                  label="מעורבות" 
                  color="cyan"
                  icon={Zap}
                />
                <ScoreGauge 
                  score={customer.scores.growth_potential} 
                  label="פוטנציאל צמיחה" 
                  color="emerald"
                  icon={TrendingUp}
                />
                <ScoreGauge 
                  score={100 - customer.scores.churn_risk} 
                  label="נאמנות" 
                  color="violet"
                  icon={Heart}
                />
                <ScoreGauge 
                  score={customer.scores.satisfaction * 10} 
                  label="שביעות רצון" 
                  color="amber"
                  icon={Star}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
            <TabsTrigger value="policies">פוליסות</TabsTrigger>
            <TabsTrigger value="gaps">הזדמנויות</TabsTrigger>
            <TabsTrigger value="history">היסטוריה</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="grid grid-cols-3 gap-6">
            {/* Coverage Map */}
            <div className="col-span-2">
              {customer.policies && <CoverageMap policies={customer.policies} />}
            </div>
            
            {/* Family */}
            <div>
              {customer.family && <FamilyTree family={customer.family} />}
            </div>
          </TabsContent>
          
          <TabsContent value="policies">
            {/* Policies list */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">פוליסות פעילות</h3>
                <div className="space-y-4">
                  {customer.policies?.map(policy => (
                    <div 
                      key={policy.id}
                      className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-cyan-400" />
                        <div>
                          <p className="font-medium">{policy.type}</p>
                          <p className="text-sm text-zinc-400">{policy.company}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-medium">₪{policy.premium_monthly}/חודש</p>
                        <p className="text-sm text-zinc-400">חידוש: {policy.renewal_date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="gaps">
            {customer.gaps && <GapAnalysis gaps={customer.gaps} />}
          </TabsContent>
          
          <TabsContent value="history">
            {/* History timeline */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">היסטוריית אינטראקציות</h3>
                {/* Timeline component */}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
```

### components/contacts/score-gauge.tsx
```tsx
"use client"

import React from 'react'
import { cn } from '@/lib/utils/cn'
import { LucideIcon } from 'lucide-react'

interface ScoreGaugeProps {
  score: number
  label: string
  color: 'cyan' | 'emerald' | 'violet' | 'amber' | 'red' | 'blue'
  icon?: LucideIcon
}

const colorClasses = {
  cyan: { bg: 'bg-cyan-500', text: 'text-cyan-400', ring: 'ring-cyan-500/30' },
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500/30' },
  violet: { bg: 'bg-violet-500', text: 'text-violet-400', ring: 'ring-violet-500/30' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500/30' },
  red: { bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500/30' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-400', ring: 'ring-blue-500/30' },
}

export function ScoreGauge({ score, label, color, icon: Icon }: ScoreGaugeProps) {
  const colors = colorClasses[color]
  const circumference = 2 * Math.PI * 40
  const offset = circumference - (score / 100) * circumference
  
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-zinc-800"
          />
          {/* Progress circle */}
          <circle
            cx="48"
            cy="48"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={colors.text}
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon && <Icon className={cn("w-4 h-4 mb-1", colors.text)} />}
          <span className="text-xl font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="mt-2 text-sm text-zinc-400">{label}</span>
    </div>
  )
}
```

### components/contacts/coverage-map.tsx
```tsx
"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Car, Home, Heart, Shield, Briefcase, PiggyBank,
  CheckCircle, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Policy {
  id: string
  type: string
  category: string
  company: string
  premium_monthly: number
  status: string
}

interface CoverageMapProps {
  policies: Policy[]
  gaps?: Array<{ category: string }>
}

const categories = [
  { key: 'car', label: 'רכב', icon: Car },
  { key: 'home', label: 'דירה', icon: Home },
  { key: 'life', label: 'חיים', icon: Heart },
  { key: 'health', label: 'בריאות', icon: Shield },
  { key: 'business', label: 'עסק', icon: Briefcase },
  { key: 'savings', label: 'חיסכון', icon: PiggyBank },
]

export function CoverageMap({ policies, gaps = [] }: CoverageMapProps) {
  const hasCoverage = (category: string) => 
    policies.some(p => p.category === category && p.status === 'active')
  
  const hasGap = (category: string) => 
    gaps.some(g => g.category === category)
  
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-cyan-400" />
          מפת כיסויים
        </h3>
        
        <div className="grid grid-cols-3 gap-4">
          {categories.map(({ key, label, icon: Icon }) => {
            const covered = hasCoverage(key)
            const gap = hasGap(key)
            
            return (
              <div
                key={key}
                className={cn(
                  "flex flex-col items-center p-4 rounded-xl border transition-all",
                  covered 
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : gap
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-zinc-800/50 border-zinc-700"
                )}
              >
                <Icon className={cn(
                  "w-8 h-8 mb-2",
                  covered ? "text-emerald-400" : gap ? "text-red-400" : "text-zinc-500"
                )} />
                <span className="text-sm text-zinc-400">{label}</span>
                <div className="mt-2">
                  {covered ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : gap ? (
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

### components/contacts/gap-analysis.tsx
```tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, ChevronDown, ChevronUp, 
  Send, Calendar, Target, MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Gap {
  id: string
  category: string
  title: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  estimated_premium?: number
  estimated_commission?: number
  talking_points?: string[]
  recommended_product?: string
  recommended_company?: string
}

interface GapAnalysisProps {
  gaps: Gap[]
  onSendProposal?: (gapId: string) => void
  onScheduleMeeting?: (gapId: string) => void
}

const priorityColors = {
  low: 'default',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
} as const

const priorityLabels = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  critical: 'קריטי',
}

export function GapAnalysis({ gaps, onSendProposal, onScheduleMeeting }: GapAnalysisProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Sort by priority
  const sortedGaps = [...gaps].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 }
    return order[a.priority] - order[b.priority]
  })
  
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-cyan-400" />
          הזדמנויות מכירה
          <Badge variant="info" className="mr-2">{gaps.length}</Badge>
        </h3>
        
        <div className="space-y-4">
          {sortedGaps.map((gap) => {
            const isExpanded = expandedId === gap.id
            
            return (
              <div
                key={gap.id}
                className={cn(
                  "border rounded-xl overflow-hidden transition-all",
                  gap.priority === 'critical' 
                    ? "border-red-500/30 bg-red-500/5"
                    : gap.priority === 'high'
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-zinc-700 bg-zinc-800/50"
                )}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : gap.id)}
                  className="w-full flex items-center justify-between p-4 text-right"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={cn(
                      "w-5 h-5",
                      gap.priority === 'critical' && "text-red-400",
                      gap.priority === 'high' && "text-amber-400",
                      gap.priority === 'medium' && "text-yellow-400",
                      gap.priority === 'low' && "text-zinc-400"
                    )} />
                    <div>
                      <p className="font-medium text-white">{gap.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={priorityColors[gap.priority]}>
                          {priorityLabels[gap.priority]}
                        </Badge>
                        {gap.estimated_commission && (
                          <span className="text-sm text-emerald-400">
                            עמלה: ₪{gap.estimated_commission.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-zinc-400" />
                  )}
                </button>
                
                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-zinc-700/50 pt-4">
                    <p className="text-zinc-300 mb-4">{gap.description}</p>
                    
                    {/* Talking points */}
                    {gap.talking_points && gap.talking_points.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-zinc-400 mb-2">נקודות לשיחה:</p>
                        <ul className="space-y-1">
                          {gap.talking_points.map((point, i) => (
                            <li key={i} className="text-sm text-zinc-300 flex items-start gap-2">
                              <span className="text-cyan-400">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Recommendation */}
                    {gap.recommended_product && (
                      <div className="flex items-center gap-4 p-3 bg-zinc-800 rounded-lg mb-4">
                        <div>
                          <p className="text-xs text-zinc-400">מוצר מומלץ</p>
                          <p className="text-sm font-medium">{gap.recommended_product}</p>
                        </div>
                        {gap.recommended_company && (
                          <div>
                            <p className="text-xs text-zinc-400">חברה</p>
                            <p className="text-sm font-medium">{gap.recommended_company}</p>
                          </div>
                        )}
                        {gap.estimated_premium && (
                          <div>
                            <p className="text-xs text-zinc-400">פרמיה משוערת</p>
                            <p className="text-sm font-medium text-emerald-400">
                              ₪{gap.estimated_premium}/חודש
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button 
                        variant="primary" 
                        className="flex-1"
                        onClick={() => onSendProposal?.(gap.id)}
                      >
                        <Send className="w-4 h-4" />
                        שלח הצעה מותאמת
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => onScheduleMeeting?.(gap.id)}
                      >
                        <Calendar className="w-4 h-4" />
                        קבע פגישה
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

---

## 5. דפים (Pages)

### app/(dashboard)/page.tsx (Main Dashboard)
```tsx
import { createServerClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentLeads } from '@/components/dashboard/recent-leads'
import { UpcomingMeetings } from '@/components/dashboard/upcoming-meetings'
import { TasksWidget } from '@/components/dashboard/tasks-widget'
import { PerformanceChart } from '@/components/dashboard/performance-chart'

export default async function DashboardPage() {
  const supabase = createServerClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch stats
  const [contactsRes, leadsRes, dealsRes, tasksRes] = await Promise.all([
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('deals').select('id', { count: 'exact', head: true }).not('status', 'in', '("won","lost")'),
    supabase.from('tasks').select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .gte('due_date', new Date().toISOString().split('T')[0])
      .lte('due_date', new Date().toISOString().split('T')[0])
  ])
  
  const stats = {
    contacts: contactsRes.count || 0,
    leads: leadsRes.count || 0,
    deals: dealsRes.count || 0,
    tasks: tasksRes.count || 0,
  }
  
  // Fetch recent leads
  const { data: recentLeads } = await supabase
    .from('leads')
    .select('*, contact:contacts(name, phone, email)')
    .order('created_at', { ascending: false })
    .limit(5)
  
  // Fetch upcoming meetings
  const { data: upcomingMeetings } = await supabase
    .from('meetings')
    .select('*, contact:contacts(name, phone)')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(5)
  
  // Fetch today's tasks
  const { data: todayTasks } = await supabase
    .from('tasks')
    .select('*, contact:contacts(name)')
    .eq('status', 'pending')
    .gte('due_date', new Date().toISOString().split('T')[0])
    .lte('due_date', new Date().toISOString().split('T')[0])
    .order('priority', { ascending: false })
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">שלום, {user?.user_metadata?.full_name || 'משתמש'}</h1>
        <p className="text-zinc-400 mt-1">הנה סיכום הפעילות שלך להיום</p>
      </div>
      
      <StatsCards stats={stats} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <RecentLeads leads={recentLeads || []} />
          <PerformanceChart />
        </div>
        
        <div className="space-y-6">
          <UpcomingMeetings meetings={upcomingMeetings || []} />
          <TasksWidget tasks={todayTasks || []} />
        </div>
      </div>
    </div>
  )
}
```

### app/(dashboard)/contacts/page.tsx
```tsx
"use client"

import React, { useState } from 'react'
import { useContacts } from '@/hooks/useContacts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/shared/data-table'
import { ContactCard } from '@/components/contacts/contact-card'
import { 
  Plus, Search, Filter, Download, Upload,
  LayoutGrid, List, Users
} from 'lucide-react'
import Link from 'next/link'

export default function ContactsPage() {
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [search, setSearch] = useState('')
  const { contacts, isLoading, totalCount } = useContacts({ search })
  
  const columns = [
    {
      key: 'full_name',
      label: 'שם',
      render: (contact: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium">
            {contact.full_name?.charAt(0) || '?'}
          </div>
          <div>
            <p className="font-medium text-white">{contact.full_name}</p>
            <p className="text-sm text-zinc-400">{contact.email}</p>
          </div>
        </div>
      )
    },
    { key: 'phone', label: 'טלפון' },
    { key: 'city', label: 'עיר' },
    { key: 'source', label: 'מקור' },
    { key: 'status', label: 'סטטוס' },
    {
      key: 'created_at',
      label: 'נוצר',
      render: (contact: any) => new Date(contact.created_at).toLocaleDateString('he-IL')
    }
  ]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">אנשי קשר</h1>
          <p className="text-zinc-400 mt-1">{totalCount} אנשי קשר במערכת</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Upload className="w-4 h-4" />
            ייבוא
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4" />
            ייצוא
          </Button>
          <Link href="/contacts/new">
            <Button>
              <Plus className="w-4 h-4" />
              איש קשר חדש
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="חיפוש לפי שם, טלפון או אימייל..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4" />
              סינון
            </Button>
            <div className="flex items-center border border-zinc-700 rounded-lg">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-400'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Content */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={contacts}
          isLoading={isLoading}
          onRowClick={(contact) => window.location.href = `/contacts/${contact.id}`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} />
          ))}
        </div>
      )}
    </div>
  )
}
```

(המשך בקובץ הבא - חלק 3...)
## 6. שירותים (Services)

### services/contacts.service.ts
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

type Contact = Database['public']['Tables']['contacts']['Row']
type ContactInsert = Database['public']['Tables']['contacts']['Insert']
type ContactUpdate = Database['public']['Tables']['contacts']['Update']

interface ContactFilters {
  search?: string
  status?: string
  source?: string
  tags?: string[]
  page?: number
  pageSize?: number
}

export const contactsService = {
  // Get contacts with filters and pagination
  async getContacts(filters: ContactFilters = {}) {
    const supabase = createClientComponentClient<Database>()
    const { search, status, source, tags, page = 1, pageSize = 20 } = filters
    
    let query = supabase
      .from('contacts')
      .select('*, contact_scores(*), policies(count)', { count: 'exact' })
    
    // Search
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    // Status filter
    if (status) {
      query = query.eq('status', status)
    }
    
    // Source filter
    if (source) {
      query = query.eq('source', source)
    }
    
    // Tags filter
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }
    
    // Pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to).order('created_at', { ascending: false })
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    return {
      contacts: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  },
  
  // Get single contact with full details
  async getContact(id: string) {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        contact_family(*),
        contact_assets(*),
        contact_scores(*),
        policies(*),
        leads(*),
        deals(*),
        tasks(*, order: due_date.desc),
        meetings(*, order: start_time.desc),
        messages(*, order: created_at.desc),
        coverage_gaps(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },
  
  // Create contact
  async createContact(contact: ContactInsert) {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('contacts')
      .insert(contact)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Update contact
  async updateContact(id: string, updates: ContactUpdate) {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('contacts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Delete contact
  async deleteContact(id: string) {
    const supabase = createClientComponentClient<Database>()
    
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  },
  
  // Bulk import contacts
  async bulkImport(contacts: ContactInsert[]) {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('contacts')
      .upsert(contacts, { 
        onConflict: 'agent_id,phone',
        ignoreDuplicates: false 
      })
      .select()
    
    if (error) throw error
    return data
  },
  
  // Convert contact to lead
  async convertToLead(contactId: string, leadData: Partial<Database['public']['Tables']['leads']['Insert']>) {
    const supabase = createClientComponentClient<Database>()
    
    // Get contact data
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()
    
    if (contactError) throw contactError
    
    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        contact_id: contactId,
        agent_id: contact.agent_id,
        name: contact.full_name,
        phone: contact.phone || contact.mobile,
        email: contact.email,
        ...leadData
      })
      .select()
      .single()
    
    if (leadError) throw leadError
    
    // Update contact
    await supabase
      .from('contacts')
      .update({ 
        converted_to_lead: true, 
        lead_id: lead.id 
      })
      .eq('id', contactId)
    
    return lead
  }
}
```

### services/leads.service.ts
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database.types'

type Lead = Database['public']['Tables']['leads']['Row']
type LeadInsert = Database['public']['Tables']['leads']['Insert']
type LeadUpdate = Database['public']['Tables']['leads']['Update']

interface LeadFilters {
  search?: string
  status?: string
  priority?: string
  source?: string
  page?: number
  pageSize?: number
}

export const leadsService = {
  // Get leads with filters
  async getLeads(filters: LeadFilters = {}) {
    const supabase = createClientComponentClient<Database>()
    const { search, status, priority, source, page = 1, pageSize = 20 } = filters
    
    let query = supabase
      .from('leads')
      .select('*, contact:contacts(full_name, phone, email)', { count: 'exact' })
    
    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`)
    }
    
    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (source) query = query.eq('source', source)
    
    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1).order('created_at', { ascending: false })
    
    const { data, error, count } = await query
    
    if (error) throw error
    
    return {
      leads: data || [],
      totalCount: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  },
  
  // Get leads by status (for kanban board)
  async getLeadsByStatus() {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('leads')
      .select('*, contact:contacts(full_name, phone)')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Group by status
    const grouped = (data || []).reduce((acc, lead) => {
      if (!acc[lead.status]) acc[lead.status] = []
      acc[lead.status].push(lead)
      return acc
    }, {} as Record<string, Lead[]>)
    
    return grouped
  },
  
  // Get single lead
  async getLead(id: string) {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        contact:contacts(*),
        lead_activities(*, user:users(full_name)),
        deals(*),
        tasks(*)
      `)
      .eq('id', id)
      .single()
    
    if (error) throw error
    return data
  },
  
  // Create lead
  async createLead(lead: LeadInsert) {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('leads')
      .insert(lead)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Update lead
  async updateLead(id: string, updates: LeadUpdate) {
    const supabase = createClientComponentClient<Database>()
    
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Update lead status (for drag & drop)
  async updateLeadStatus(id: string, status: string) {
    return this.updateLead(id, { status: status as any })
  },
  
  // Add activity
  async addActivity(leadId: string, activity: { activity_type: string; description?: string; metadata?: any }) {
    const supabase = createClientComponentClient<Database>()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const { data, error } = await supabase
      .from('lead_activities')
      .insert({
        lead_id: leadId,
        user_id: user?.id,
        ...activity
      })
      .select()
      .single()
    
    if (error) throw error
    return data
  },
  
  // Convert to deal
  async convertToDeal(leadId: string, dealData: Partial<Database['public']['Tables']['deals']['Insert']>) {
    const supabase = createClientComponentClient<Database>()
    
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, contact:contacts(*)')
      .eq('id', leadId)
      .single()
    
    if (leadError) throw leadError
    
    // Create deal
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert({
        lead_id: leadId,
        contact_id: lead.contact_id,
        agent_id: lead.agent_id,
        title: dealData.title || `עסקה - ${lead.name}`,
        ...dealData
      })
      .select()
      .single()
    
    if (dealError) throw dealError
    
    // Update lead status
    await this.updateLead(leadId, { status: 'converted', converted_at: new Date().toISOString() })
    
    return deal
  }
}
```

### services/whatsapp.service.ts
```typescript
const GREENAPI_URL = process.env.NEXT_PUBLIC_GREENAPI_URL
const GREENAPI_INSTANCE = process.env.NEXT_PUBLIC_GREENAPI_INSTANCE
const GREENAPI_TOKEN = process.env.GREENAPI_TOKEN

interface WhatsAppMessage {
  phone: string
  message: string
  quotedMessageId?: string
}

interface WhatsAppMedia {
  phone: string
  mediaUrl: string
  caption?: string
}

export const whatsappService = {
  // Format phone for WhatsApp (Israeli format)
  formatPhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '')
    
    if (cleaned.startsWith('05')) {
      cleaned = '972' + cleaned.substring(1)
    } else if (cleaned.startsWith('5') && cleaned.length === 9) {
      cleaned = '972' + cleaned
    } else if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1)
    }
    
    return cleaned + '@c.us'
  },
  
  // Send text message
  async sendMessage({ phone, message, quotedMessageId }: WhatsAppMessage) {
    const chatId = this.formatPhone(phone)
    
    const response = await fetch(`${GREENAPI_URL}/waInstance${GREENAPI_INSTANCE}/sendMessage/${GREENAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        message,
        quotedMessageId
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to send WhatsApp message')
    }
    
    return response.json()
  },
  
  // Send media (image/document)
  async sendMedia({ phone, mediaUrl, caption }: WhatsAppMedia) {
    const chatId = this.formatPhone(phone)
    
    const response = await fetch(`${GREENAPI_URL}/waInstance${GREENAPI_INSTANCE}/sendFileByUrl/${GREENAPI_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        urlFile: mediaUrl,
        caption
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to send WhatsApp media')
    }
    
    return response.json()
  },
  
  // Send template message
  async sendTemplate(phone: string, templateName: string, variables: Record<string, string>) {
    // Replace template variables
    let message = templates[templateName]
    
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    
    return this.sendMessage({ phone, message })
  },
  
  // Check connection status
  async checkStatus() {
    const response = await fetch(`${GREENAPI_URL}/waInstance${GREENAPI_INSTANCE}/getStateInstance/${GREENAPI_TOKEN}`)
    return response.json()
  },
  
  // Get QR code for authentication
  async getQRCode() {
    const response = await fetch(`${GREENAPI_URL}/waInstance${GREENAPI_INSTANCE}/qr/${GREENAPI_TOKEN}`)
    return response.json()
  }
}

// Message templates
const templates: Record<string, string> = {
  welcome: `שלום {{name}}! 👋
תודה שפנית אלינו.
אשמח לעזור לך בכל שאלה.
{{agent_name}} - סלע ביטוח`,

  renewal_reminder: `שלום {{name}},
רציתי להזכיר שהפוליסה שלך ל{{policy_type}} מתחדשת בתאריך {{renewal_date}}.
האם נקבע שיחה לדון בחידוש?
{{agent_name}}`,

  meeting_reminder: `היי {{name}},
תזכורת לפגישה שלנו מחר ב-{{time}}.
{{location}}
מחכה לראותך!
{{agent_name}}`,

  birthday: `יום הולדת שמח {{name}}! 🎂🎉
מאחל/ת לך שנה נפלאה מלאה בבריאות ושמחה.
{{agent_name}} - סלע ביטוח`
}
```

### services/ai.service.ts
```typescript
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

interface GapAnalysisInput {
  contact: {
    name: string
    age: number
    marital_status: string
    occupation: string
    income_bracket: string
    family: Array<{ relationship: string; age?: number }>
    assets: Array<{ type: string; value?: number }>
  }
  policies: Array<{
    type: string
    category: string
    coverage_amount?: number
    premium_monthly?: number
  }>
}

interface ChurnPredictionInput {
  contact_id: string
  engagement_score: number
  last_interaction_days: number
  policies_count: number
  total_premium: number
  complaints_count: number
}

export const aiService = {
  // Analyze coverage gaps
  async analyzeGaps(input: GapAnalysisInput) {
    const prompt = `אתה מומחה ביטוח ישראלי. נתח את הפרופיל הבא וזהה פערי כיסוי:

**פרטי לקוח:**
- שם: ${input.contact.name}
- גיל: ${input.contact.age}
- מצב משפחתי: ${input.contact.marital_status}
- מקצוע: ${input.contact.occupation}
- רמת הכנסה: ${input.contact.income_bracket}
- בני משפחה: ${input.contact.family.map(f => `${f.relationship} (${f.age || '?'})`).join(', ')}
- נכסים: ${input.contact.assets.map(a => `${a.type}: ₪${a.value || '?'}`).join(', ')}

**פוליסות קיימות:**
${input.policies.map(p => `- ${p.type} (${p.category}): כיסוי ₪${p.coverage_amount || '?'}, פרמיה ₪${p.premium_monthly}/חודש`).join('\n')}

זהה 3-5 פערי כיסוי משמעותיים והצע פתרונות. החזר JSON בפורמט:
{
  "gaps": [
    {
      "category": "life|health|car|home|savings|business",
      "title": "כותרת הפער",
      "priority": "critical|high|medium|low",
      "description": "תיאור הבעיה והסיכון",
      "recommended_product": "שם המוצר המומלץ",
      "recommended_company": "חברת הביטוח המומלצת",
      "estimated_premium": 123,
      "estimated_commission": 456,
      "talking_points": ["נקודה 1", "נקודה 2", "נקודה 3"]
    }
  ]
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'אתה מומחה ביטוח ישראלי מנוסה. ענה תמיד בעברית ובפורמט JSON תקין.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0].message.content
    return JSON.parse(content || '{"gaps": []}')
  },

  // Predict churn risk
  async predictChurn(input: ChurnPredictionInput) {
    // Simple scoring model (in production, use ML model)
    let riskScore = 0
    
    // Low engagement
    if (input.engagement_score < 30) riskScore += 30
    else if (input.engagement_score < 50) riskScore += 15
    
    // No recent interaction
    if (input.last_interaction_days > 180) riskScore += 25
    else if (input.last_interaction_days > 90) riskScore += 10
    
    // Few policies
    if (input.policies_count === 1) riskScore += 15
    
    // Low premium (less invested)
    if (input.total_premium < 500) riskScore += 10
    
    // Has complaints
    riskScore += input.complaints_count * 10
    
    return {
      risk_score: Math.min(100, riskScore),
      risk_level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low',
      factors: [
        input.engagement_score < 50 && 'מעורבות נמוכה',
        input.last_interaction_days > 90 && 'אין קשר לאחרונה',
        input.policies_count === 1 && 'פוליסה אחת בלבד',
        input.complaints_count > 0 && 'היו תלונות'
      ].filter(Boolean)
    }
  },

  // Generate personalized message
  async generateMessage(context: {
    contact_name: string
    purpose: string
    tone: 'formal' | 'friendly' | 'urgent'
    additional_context?: string
  }) {
    const toneInstructions = {
      formal: 'שפה רשמית ומקצועית',
      friendly: 'שפה חמה וידידותית',
      urgent: 'שפה ישירה עם תחושת דחיפות'
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: `אתה סוכן ביטוח ישראלי. כתוב הודעות קצרות ואפקטיביות בעברית. 
          השתמש ב${toneInstructions[context.tone]}.
          ההודעה צריכה להיות מתאימה לוואטסאפ (קצרה, עם אימוג'י מתאימים).` 
        },
        { 
          role: 'user', 
          content: `כתוב הודעה ל${context.contact_name}.
מטרה: ${context.purpose}
${context.additional_context ? `הקשר נוסף: ${context.additional_context}` : ''}` 
        }
      ],
      temperature: 0.8,
      max_tokens: 300
    })

    return response.choices[0].message.content
  },

  // Transcribe voice message
  async transcribeVoice(audioBuffer: Buffer) {
    const response = await openai.audio.transcriptions.create({
      file: audioBuffer as any,
      model: 'whisper-1',
      language: 'he'
    })

    return response.text
  },

  // Analyze message and extract intent
  async analyzeMessage(message: string) {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `נתח הודעת לקוח וזהה:
1. כוונה (intent): inquiry, complaint, renewal, claim, general
2. סנטימנט: positive, neutral, negative
3. דחיפות: low, medium, high
4. נושא עיקרי
5. האם נדרשת פעולה מיידית

החזר JSON תקין.`
        },
        { role: 'user', content: message }
      ],
      response_format: { type: 'json_object' }
    })

    return JSON.parse(response.choices[0].message.content || '{}')
  }
}
```

---

## 7. Hooks

### hooks/useAuth.ts
```typescript
"use client"

import { useCallback, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  
  const supabase = createClientComponentClient()
  const router = useRouter()
  
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })
    
    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setProfile(null)
        }
        
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )
    
    return () => subscription.unsubscribe()
  }, [])
  
  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    setProfile(data)
  }
  
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  }, [])
  
  const signInWithGoogle = useCallback(async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) throw error
    return data
  }, [])
  
  const signUp = useCallback(async (email: string, password: string, metadata?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })
    
    if (error) throw error
    return data
  }, [])
  
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    router.push('/login')
  }, [router])
  
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    })
    
    if (error) throw error
  }, [])
  
  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signInWithGoogle,
    signUp,
    signOut,
    resetPassword,
    isAuthenticated: !!session
  }
}
```

### hooks/useContacts.ts
```typescript
"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsService } from '@/services/contacts.service'
import { toast } from 'sonner'

interface UseContactsOptions {
  search?: string
  status?: string
  source?: string
  page?: number
  pageSize?: number
}

export function useContacts(options: UseContactsOptions = {}) {
  const queryClient = useQueryClient()
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contacts', options],
    queryFn: () => contactsService.getContacts(options),
    staleTime: 30000, // 30 seconds
    keepPreviousData: true
  })
  
  const createMutation = useMutation({
    mutationFn: contactsService.createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('איש קשר נוצר בהצלחה')
    },
    onError: (error: any) => {
      toast.error(error.message || 'שגיאה ביצירת איש קשר')
    }
  })
  
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => 
      contactsService.updateContact(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('איש קשר עודכן בהצלחה')
    },
    onError: (error: any) => {
      toast.error(error.message || 'שגיאה בעדכון איש קשר')
    }
  })
  
  const deleteMutation = useMutation({
    mutationFn: contactsService.deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('איש קשר נמחק')
    },
    onError: (error: any) => {
      toast.error(error.message || 'שגיאה במחיקת איש קשר')
    }
  })
  
  return {
    contacts: data?.contacts || [],
    totalCount: data?.totalCount || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    totalPages: data?.totalPages || 0,
    isLoading,
    error,
    refetch,
    createContact: createMutation.mutate,
    updateContact: updateMutation.mutate,
    deleteContact: deleteMutation.mutate,
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading
  }
}

export function useContact(id: string) {
  const queryClient = useQueryClient()
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsService.getContact(id),
    enabled: !!id
  })
  
  const updateMutation = useMutation({
    mutationFn: (updates: any) => contactsService.updateContact(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('איש קשר עודכן')
    }
  })
  
  const convertToLeadMutation = useMutation({
    mutationFn: (leadData: any) => contactsService.convertToLead(id, leadData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success('הומר לליד בהצלחה')
    }
  })
  
  return {
    contact: data,
    isLoading,
    error,
    updateContact: updateMutation.mutate,
    convertToLead: convertToLeadMutation.mutate
  }
}
```

### hooks/useRealtime.ts
```typescript
"use client"

import { useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeOptions {
  table: string
  filter?: string
  onInsert?: (payload: any) => void
  onUpdate?: (payload: any) => void
  onDelete?: (payload: any) => void
}

export function useRealtime({
  table,
  filter,
  onInsert,
  onUpdate,
  onDelete
}: UseRealtimeOptions) {
  const supabase = createClientComponentClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  
  useEffect(() => {
    // Create channel
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new)
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new)
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old)
          }
        }
      )
      .subscribe()
    
    channelRef.current = channel
    
    // Cleanup
    return () => {
      channel.unsubscribe()
    }
  }, [table, filter, onInsert, onUpdate, onDelete])
  
  return channelRef.current
}

// Hook for real-time notifications
export function useRealtimeNotifications() {
  const supabase = createClientComponentClient()
  
  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `direction=eq.inbound`
        },
        (payload) => {
          // Show toast notification
          const { showNotification } = window.Notification
          if (showNotification) {
            new Notification('הודעה חדשה', {
              body: payload.new.content?.substring(0, 100),
              icon: '/icons/notification-icon.png'
            })
          }
        }
      )
      .subscribe()
    
    return () => {
      channel.unsubscribe()
    }
  }, [])
}
```

---

## 8. סדר ביצוע

### שלב 1: הקמת תשתית (יום 1-2)
```bash
# 1. יצירת פרויקט Next.js
npx create-next-app@latest selai-app --typescript --tailwind --app --src-dir --import-alias "@/*"
cd selai-app

# 2. התקנת תלויות
npm install @supabase/auth-helpers-nextjs @supabase/supabase-js
npm install @tanstack/react-query zustand
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge
npm install sonner # Toast notifications
npm install date-fns # Date formatting
npm install openai # AI integration
npm install recharts # Charts

# 3. הגדרת Supabase
npx supabase init
npx supabase start

# 4. קביעת משתני סביבה
cp .env.example .env.local
```

### שלב 2: מבנה בסיסי (יום 3-4)
1. יצירת מבנה תיקיות
2. הקמת Supabase tables (SQL migrations)
3. יצירת UI components בסיסיים
4. הקמת Auth flow

### שלב 3: Layout ו-Navigation (יום 5-6)
1. Sidebar
2. Header
3. Mobile navigation
4. Dashboard layout

### שלב 4: דפים עיקריים (יום 7-14)
1. Dashboard
2. Contacts (list + detail + form)
3. Leads (list + board + form)
4. Deals (pipeline + form)
5. Tasks
6. Calendar
7. Messages

### שלב 5: קומפוננטות מתקדמות (יום 15-20)
1. Customer 360
2. Coverage Map
3. Gap Analysis
4. Score Gauges
5. Data Tables
6. Charts

### שלב 6: אינטגרציות (יום 21-25)
1. WhatsApp (GreenAPI)
2. Cal.com
3. OpenAI
4. n8n webhooks

### שלב 7: PWA ו-Mobile (יום 26-28)
1. manifest.json
2. Service Worker
3. Responsive design
4. Push notifications

### שלב 8: בדיקות ו-QA (יום 29-30)
1. Unit tests
2. E2E tests
3. Performance optimization
4. Security audit

---

## 9. פקודות הפעלה

```bash
# Development
npm run dev

# Build
npm run build

# Start production
npm start

# Database migrations
npx supabase db push

# Generate types
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.types.ts

# Lint
npm run lint

# Test
npm run test
```

---

## 10. משתני סביבה (.env.local)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# GreenAPI (WhatsApp)
NEXT_PUBLIC_GREENAPI_URL=https://api.green-api.com
NEXT_PUBLIC_GREENAPI_INSTANCE=xxx
GREENAPI_TOKEN=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# Cal.com
CALCOM_API_KEY=xxx
NEXT_PUBLIC_CALCOM_URL=https://cal.com

# n8n
N8N_WEBHOOK_URL=https://selai.app.n8n.cloud/webhook
N8N_API_KEY=xxx

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## סיכום

זוהי תכנית בנייה מקיפה למערכת SELAI. התכנית כוללת:

✅ **72 טבלאות Supabase** עם RLS מלא  
✅ **~36 דפים** (Next.js App Router)  
✅ **~50+ קומפוננטות** (React + TypeScript)  
✅ **~10 Services** (API layer)  
✅ **~10 Hooks** (State management)  
✅ **אינטגרציות**: WhatsApp, Cal.com, OpenAI, n8n  
✅ **PWA** מלא עם תמיכה במובייל  
✅ **RTL** מלא (עברית)  

**זמן פיתוח משוער:** 30-40 ימים  
**גודל צפוי:** ~40,000 שורות קוד  

---

*מסמך זה נוצר ב-11.01.2025*  
*SELAI - מערכת ניהול סוכנויות ביטוח חכמה*
