# Feature Registry - Selai Admin Hub

> **Quick Reference**: When reporting issues, use the Feature ID (e.g., `AUTH-LOGIN-001`) to pinpoint the exact functionality.

## Module Prefixes

| Prefix | Module | Description |
|--------|--------|-------------|
| `AUTH` | Authentication | Login, registration, 2FA, identity verification |
| `USER` | User Management | User CRUD, roles, permissions |
| `HIER` | Hierarchy | Supervisors, agents, organizational structure |
| `PROJ` | Projects | Project management, settings, creation |
| `DATA` | Data Management | Import, export, column mapping, tables |
| `DASH` | Dashboards | All dashboard types, charts, reports |
| `CRM` | CRM | Contacts, leads, deals, tasks, calendar |
| `MKT` | Marketing | Landing pages, campaigns, analytics, assets |
| `GUEST` | Guest Access | Shareable links, guest dashboards |
| `SEC` | Security | Encryption, audit logs, PII protection |
| `PORTAL` | Client Portal | Client-facing portal features |
| `AUTO` | Automation | Workflows, message templates, WhatsApp |
| `SYS` | System | Admin panel, health checks, settings |

---

## AUTH - Authentication Module

### Login & Session
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTH-LOGIN-001` | User Login | `src/app/(auth)/login/page.tsx`, `src/lib/stores/authStore.ts` | Main login flow with email/password |
| `AUTH-LOGIN-002` | Auth Callback | `src/app/api/auth/callback/route.ts`, `src/app/auth/callback/page.tsx` | OAuth callback handling |
| `AUTH-LOGIN-003` | Session Management | `src/lib/stores/authStore.ts` | User session state management |

### Registration
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTH-REG-001` | User Registration | `src/app/(auth)/register/page.tsx`, `src/app/api/auth/register-request/route.ts` | New user registration request |
| `AUTH-REG-002` | Agent Registration | `src/app/(auth)/register/agent/page.tsx`, `src/app/api/auth/register-agent/route.ts` | Agent-specific registration |
| `AUTH-REG-003` | Registration with Agent | `src/app/api/auth/register-with-agent/route.ts` | Client registration linked to agent |
| `AUTH-REG-004` | Pending Approval | `src/app/(auth)/pending-approval/page.tsx` | Waiting for admin approval screen |
| `AUTH-REG-005` | Admin Approval | `src/app/api/registration/[id]/approve/route.ts`, `src/components/admin/AdminRegistrationsContent.tsx` | Admin approves/rejects registrations |

### Two-Factor Authentication
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTH-2FA-001` | Enable 2FA | `src/app/api/auth/2fa/enable/route.ts`, `src/app/(auth)/setup-2fa/page.tsx` | Setup two-factor authentication |
| `AUTH-2FA-002` | Verify 2FA | `src/app/api/auth/2fa/verify/route.ts` | Verify 2FA code on login |
| `AUTH-2FA-003` | Disable 2FA | `src/app/api/auth/2fa/disable/route.ts` | Remove 2FA from account |

### Identity Verification
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTH-VERIFY-001` | Selai Verification | `src/app/api/auth/selai-verify/route.ts` | Verify user against Selai database |
| `AUTH-VERIFY-002` | Identity Check | `src/app/api/auth/verify-identity/route.ts` | General identity verification |
| `AUTH-VERIFY-003` | Profile Completion | `src/app/(auth)/complete-profile/page.tsx`, `src/app/(auth)/verify-profile/page.tsx` | Complete user profile after registration |

---

## USER - User Management Module

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `USER-LIST-001` | Users List | `src/app/(dashboard)/users/page.tsx`, `src/app/api/users/route.ts` | View all users in system |
| `USER-CRUD-001` | User CRUD | `src/app/api/users/route.ts` | Create, read, update, delete users |
| `USER-ACCESS-001` | User Access Control | `src/app/api/users/[userId]/access/route.ts` | Manage user permissions |
| `USER-INVITE-001` | User Invitation | `src/app/api/users/invite/route.ts`, `src/app/api/invitations/route.ts` | Invite new users via email |
| `USER-INVITE-002` | Accept Invitation | `src/app/api/invitations/[token]/route.ts` | Process invitation acceptance |
| `USER-PROFILE-001` | Agent Profile | `src/app/api/agent/profile/route.ts` | Agent profile management |
| `USER-STORE-001` | User State | `src/stores/userStore.ts` | User state management |

---

## HIER - Hierarchy Module

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `HIER-VIEW-001` | Hierarchy View | `src/app/(dashboard)/hierarchy/page.tsx` | Organizational hierarchy display |
| `HIER-STATS-001` | Hierarchy Stats | `src/app/api/hierarchy/stats/route.ts` | Statistics for hierarchy |
| `HIER-SUP-001` | Supervisors List | `src/app/api/selai/supervisors/route.ts`, `src/app/api/auth/supervisors/route.ts`, `src/app/api/users/supervisors/route.ts` | Get all supervisors |
| `HIER-AGT-001` | Agents List | `src/app/api/selai/agents/route.ts` | Get all agents |
| `HIER-AGT-002` | Find Agent | `src/app/api/auth/find-agent/route.ts` | Search for specific agent |
| `HIER-AGT-003` | Agents by Supervisor | `src/app/api/selai/hierarchy/route.ts` | Get agents under a supervisor |
| `HIER-SUP-PAGE-001` | Supervisor Dashboard | `src/app/(dashboard)/supervisor/page.tsx` | Supervisor's team overview |

---

## PROJ - Projects Module

### Project Management
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `PROJ-LIST-001` | Projects List | `src/app/(dashboard)/projects/page.tsx`, `src/lib/stores/projectsStore.ts` | View all projects |
| `PROJ-CREATE-001` | Create Project | `src/app/api/projects/create/route.ts`, `src/components/projects/NewProjectModal.tsx` | Create new project |
| `PROJ-VIEW-001` | Project Details | `src/app/(dashboard)/projects/[id]/page.tsx`, `src/app/api/projects/[id]/route.ts` | View single project |
| `PROJ-SETTINGS-001` | Project Settings | `src/app/(dashboard)/projects/[id]/settings/page.tsx` | Project configuration |
| `PROJ-SETUP-001` | Project Setup | `src/app/(dashboard)/projects/[id]/setup/page.tsx`, `src/components/insurance/ProjectSetupWizard.tsx` | Initial project setup wizard |
| `PROJ-CARD-001` | Project Card | `src/components/ProjectCard.tsx` | Project card component |

### Project Data
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `PROJ-DATA-001` | Project Data View | `src/app/(dashboard)/projects/[id]/data/page.tsx`, `src/app/api/projects/[id]/data/route.ts` | View project data |
| `PROJ-DATA-002` | Data Stream | `src/app/api/projects/[id]/data-stream/route.ts` | Real-time data streaming |
| `PROJ-STATS-001` | Project Stats | `src/app/api/projects/[id]/stats/route.ts` | Project statistics |
| `PROJ-TABLES-001` | Project Tables | `src/app/api/projects/[id]/tables/route.ts`, `src/app/api/projects/[id]/tables/create/route.ts` | Manage project tables |
| `PROJ-CONN-001` | Test Connection | `src/app/api/projects/[id]/test-connection/route.ts` | Test database connection |
| `PROJ-CRED-001` | Update Credentials | `src/app/api/projects/[id]/update-credentials/route.ts` | Update project DB credentials |
| `PROJ-DECRYPT-001` | Decrypt Key | `src/app/api/projects/decrypt-key/route.ts` | Decrypt project encryption key |

---

## DATA - Data Import/Export Module

### Excel Import
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DATA-IMPORT-001` | Import Page | `src/app/(dashboard)/projects/[id]/import/page.tsx`, `src/app/(dashboard)/projects/[id]/data-import/page.tsx` | Data import interface |
| `DATA-IMPORT-002` | Excel Parse | `src/app/api/projects/[id]/excel/parse/route.ts` | Parse Excel file |
| `DATA-IMPORT-003` | Excel Analyze | `src/app/api/projects/[id]/excel/analyze/route.ts`, `src/app/api/projects/[id]/analyze/route.ts` | Analyze Excel structure |
| `DATA-IMPORT-004` | Excel Import | `src/app/api/projects/[id]/excel/import/route.ts` | Execute Excel import |
| `DATA-IMPORT-005` | Master Data Import | `src/app/api/projects/[id]/excel/import-master/route.ts` | Import to master_data table |
| `DATA-IMPORT-006` | Import History | `src/app/api/projects/[id]/import-history/route.ts`, `src/app/api/projects/[id]/import-logs/route.ts`, `src/components/ImportHistory.tsx` | View import history |
| `DATA-IMPORT-007` | Import Modal | `src/components/ImportModal.tsx` | Import modal component |
| `DATA-IMPORT-008` | Excel Uploader | `src/components/admin/ExcelUploader.tsx` | Excel file uploader |

### Column Mapping
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DATA-MAP-001` | Column Mapping Wizard | `src/components/data-mapping/ColumnMappingWizard.tsx` | Map Excel columns to DB |
| `DATA-MAP-002` | Column Mapping API | `src/app/api/projects/[id]/column-mapping/route.ts` | Column mapping CRUD |
| `DATA-MAP-003` | Auto-Map Columns | `src/app/api/projects/[id]/column-mapping/auto-map/route.ts` | AI-powered auto mapping |
| `DATA-MAP-004` | Suggest Mapping | `src/app/api/projects/[id]/column-mapping/suggest/route.ts` | Get mapping suggestions |
| `DATA-MAP-005` | Data Preview | `src/components/data-mapping/DataPreview.tsx` | Preview mapped data |
| `DATA-MAP-006` | Raw Columns | `src/app/api/projects/[id]/raw-columns/route.ts` | Get raw column names |

### Templates
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DATA-TPL-001` | Templates | `src/app/api/projects/[id]/templates/route.ts`, `src/lib/stores/templatesStore.ts` | Import templates management |
| `DATA-TPL-002` | Template from Import | `src/app/api/projects/[id]/templates/from-import/route.ts` | Create template from import |
| `DATA-TPL-003` | Smart Templates | `src/app/api/projects/[id]/smart-templates/route.ts` | AI-generated templates |
| `DATA-TPL-004` | Template Builder | `src/components/TemplateBuilder.tsx` | Build custom templates |
| `DATA-TPL-005` | Template Suggestions | `src/components/import/TemplateSuggestions.tsx` | Template suggestions UI |

### Master Data
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DATA-MASTER-001` | Master Data | `src/app/api/projects/[id]/master-data/route.ts` | Access master data |
| `DATA-MASTER-002` | Clear Master Data | `src/app/api/projects/[id]/master-data/clear/route.ts` | Clear all master data |
| `DATA-MASTER-003` | Drill Down | `src/app/api/projects/[id]/master-data/drill-down/route.ts`, `src/components/dashboard/DrillDownModal.tsx` | Drill down into data |

---

## DASH - Dashboards Module

### Smart Dashboard
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DASH-SMART-001` | Smart Dashboard | `src/app/(dashboard)/projects/[id]/smart-dashboard/page.tsx` | AI-powered dashboard |
| `DASH-SMART-002` | Smart Dashboard Store | `src/lib/stores/smartDashboardStore.ts` | Smart dashboard state |
| `DASH-SMART-003` | Smart Field Selector | `src/components/SmartFieldSelector.tsx` | Smart field selection |

### Sales Dashboard
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DASH-SALES-001` | Sales Dashboard Page | `src/app/(dashboard)/projects/[id]/sales-dashboard/page.tsx` | Sales dashboard view |
| `DASH-SALES-002` | Sales Dashboard API | `src/app/api/projects/[id]/sales-dashboard/route.ts` | Sales dashboard data |
| `DASH-SALES-003` | Sales Reports | `src/app/(dashboard)/projects/[id]/reports/page.tsx`, `src/app/api/projects/[id]/sales-reports/route.ts` | Sales reports |

### View Dashboard (Gemel/Nifraim)
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DASH-VIEW-001` | View Dashboard Page | `src/app/(dashboard)/projects/[id]/view-dashboard/page.tsx` | Generic view dashboard |
| `DASH-VIEW-002` | View Dashboard API | `src/app/api/projects/[id]/view-dashboard/route.ts` | View dashboard data |
| `DASH-UNIFIED-001` | Unified Dashboard | `src/app/api/projects/[id]/unified-dashboard/route.ts` | Combined dashboard data |
| `DASH-GENERIC-001` | Generic Dashboard | `src/app/api/projects/[id]/generic-dashboard/route.ts` | Generic dashboard API |

### Other Dashboards
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DASH-COMMISSION-001` | Commission Dashboard | `src/app/(dashboard)/projects/[id]/commission-dashboard/page.tsx` | Commissions dashboard |
| `DASH-EXEC-001` | Executive Dashboard | `src/app/(dashboard)/projects/[id]/executive-dashboard/page.tsx` | Executive overview |
| `DASH-INS-001` | Insurance Dashboard | `src/app/(dashboard)/projects/[id]/insurance-dashboard/page.tsx`, `src/components/insurance/InsuranceDashboard.tsx` | Insurance-specific dashboard |
| `DASH-MAIN-001` | Main Dashboard | `src/app/(dashboard)/dashboard/page.tsx` | System main dashboard |

### Dashboard Builder
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DASH-BUILD-001` | Dashboard Builder | `src/app/(dashboard)/projects/[id]/dashboard-builder/page.tsx` | Build custom dashboards |
| `DASH-BUILD-002` | Dashboard Wizard | `src/components/DashboardWizard.tsx` | Dashboard creation wizard |
| `DASH-BUILD-003` | Dashboard Renderer | `src/components/DashboardRenderer.tsx` | Render dashboard config |
| `DASH-BUILD-004` | Template Dashboard | `src/app/(dashboard)/projects/[id]/dashboard/[templateId]/page.tsx` | View template-based dashboard |

### Dashboard Components
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DASH-COMP-001` | Dashboard Charts | `src/components/DashboardCharts.tsx` | Chart components |
| `DASH-COMP-002` | Data Table | `src/components/dashboard/DataTable.tsx`, `src/components/DataTable.tsx` | Data table component |
| `DASH-COMP-003` | Filter Sidebar | `src/components/dashboard/FilterSidebar.tsx` | Dashboard filters |
| `DASH-COMP-004` | Summary Cards | `src/components/SummaryCards.tsx`, `src/components/dashboard/QuickViews.tsx` | Summary statistics |
| `DASH-COMP-005` | Bulk Actions | `src/components/dashboard/BulkActionsToolbar.tsx` | Bulk operations toolbar |
| `DASH-COMP-006` | Record Details | `src/components/dashboard/RecordDetails.tsx` | Single record view |

### Reports
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DASH-REPORT-001` | Reports Page | `src/app/(dashboard)/reports/page.tsx` | General reports page |

---

## CRM - Customer Relationship Management Module

### CRM Core
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-MAIN-001` | CRM Dashboard | `src/app/(dashboard)/projects/[id]/crm/page.tsx` | CRM main page |
| `CRM-STORE-001` | CRM Store | `src/lib/stores/crmStore.ts` | CRM state management |

### Contacts
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-CONTACT-001` | Contacts List | `src/app/(dashboard)/projects/[id]/crm/contacts/page.tsx`, `src/app/api/projects/[id]/crm/contacts/route.ts` | View all contacts |
| `CRM-CONTACT-002` | Contact Details | `src/app/(dashboard)/projects/[id]/crm/contacts/[contactId]/page.tsx`, `src/app/api/projects/[id]/crm/contacts/[contactId]/route.ts` | Single contact view |
| `CRM-CONTACT-003` | New Contact | `src/app/(dashboard)/projects/[id]/crm/contacts/new/page.tsx` | Create new contact |
| `CRM-CONTACT-004` | Contact Form | `src/components/crm/contacts/ContactForm.tsx` | Contact form component |
| `CRM-CONTACT-005` | Contact List Component | `src/components/crm/contacts/ContactList.tsx` | Contact list component |
| `CRM-CONTACT-006` | Customer 360 | `src/components/crm/contacts/Customer360.tsx` | Full customer view |

### Leads
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-LEAD-001` | Leads List | `src/app/(dashboard)/projects/[id]/crm/leads/page.tsx`, `src/app/api/projects/[id]/crm/leads/route.ts` | View all leads |
| `CRM-LEAD-002` | Lead Details | `src/app/api/projects/[id]/crm/leads/[leadId]/route.ts` | Single lead operations |
| `CRM-LEAD-003` | Lead Board | `src/components/crm/leads/LeadBoard.tsx` | Kanban lead board |

### Deals
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-DEAL-001` | Deals List | `src/app/(dashboard)/projects/[id]/crm/deals/page.tsx`, `src/app/api/projects/[id]/crm/deals/route.ts` | View all deals |
| `CRM-DEAL-002` | Deal Details | `src/app/api/projects/[id]/crm/deals/[dealId]/route.ts` | Single deal operations |
| `CRM-DEAL-003` | Pipeline Board | `src/components/crm/deals/PipelineBoard.tsx` | Deal pipeline kanban |

### Tasks
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-TASK-001` | Tasks List | `src/app/(dashboard)/projects/[id]/crm/tasks/page.tsx`, `src/app/api/projects/[id]/crm/tasks/route.ts` | View all tasks |
| `CRM-TASK-002` | Task Details | `src/app/api/projects/[id]/crm/tasks/[taskId]/route.ts` | Single task operations |
| `CRM-TASK-003` | Task List Component | `src/components/crm/tasks/TaskList.tsx` | Task list component |

### Calendar & Meetings
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-CAL-001` | Calendar | `src/app/(dashboard)/projects/[id]/crm/calendar/page.tsx` | CRM calendar |
| `CRM-CAL-002` | Calendar View | `src/components/crm/calendar/CalendarView.tsx` | Calendar component |
| `CRM-MEET-001` | Meetings | `src/app/api/projects/[id]/crm/meetings/route.ts` | Meetings management |
| `CRM-MEET-002` | Meeting Details | `src/app/api/projects/[id]/crm/meetings/[meetingId]/route.ts` | Single meeting ops |

### Messages & Campaigns
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-MSG-001` | Messages | `src/app/(dashboard)/projects/[id]/crm/messages/page.tsx` | CRM messages |
| `CRM-MSG-002` | Message Inbox | `src/components/crm/messages/MessageInbox.tsx` | Message inbox component |
| `CRM-CAMP-001` | CRM Campaigns | `src/app/(dashboard)/projects/[id]/crm/campaigns/page.tsx` | CRM campaigns |
| `CRM-CAMP-002` | Campaign List | `src/components/crm/campaigns/CampaignList.tsx` | Campaign list component |

### Policies
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `CRM-POL-001` | Policies | `src/app/(dashboard)/projects/[id]/crm/policies/page.tsx` | Insurance policies |
| `CRM-POL-002` | Policy List | `src/components/crm/policies/PolicyList.tsx` | Policy list component |

---

## MKT - Marketing Module

### Marketing Studio
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `MKT-MAIN-001` | Marketing Dashboard | `src/app/(dashboard)/marketing/page.tsx` | Marketing main page |
| `MKT-STORE-001` | Marketing Store | `src/stores/marketingStore.ts` | Marketing state management |

### Landing Pages
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `MKT-LP-001` | Landing Pages List | `src/app/(dashboard)/marketing/landing-pages/page.tsx`, `src/app/api/marketing/landing-pages/route.ts` | View all landing pages |
| `MKT-LP-002` | Landing Page Builder | `src/app/(dashboard)/marketing/landing-pages/builder/[id]/page.tsx` | Build/edit landing page |
| `MKT-LP-003` | Landing Page Details | `src/app/api/marketing/landing-pages/[id]/route.ts` | Single LP operations |
| `MKT-LP-004` | Landing Page by Slug | `src/app/api/marketing/landing-pages/by-slug/[slug]/route.ts` | Get LP by URL slug |
| `MKT-LP-005` | Public Landing Page | `src/app/lp/[slug]/page.tsx` | Public LP view |
| `MKT-LP-006` | Create Landing Page | `src/app/(dashboard)/marketing/create/page.tsx` | Create new LP |

### Campaigns
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `MKT-CAMP-001` | Campaigns List | `src/app/(dashboard)/marketing/campaigns/page.tsx`, `src/app/api/marketing/campaigns/route.ts` | Marketing campaigns |

### Leads & Analytics
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `MKT-LEAD-001` | Marketing Leads | `src/app/(dashboard)/marketing/leads/page.tsx`, `src/app/api/marketing/leads/route.ts` | Marketing leads |
| `MKT-ANALYTICS-001` | Marketing Analytics | `src/app/(dashboard)/marketing/analytics/page.tsx`, `src/app/api/marketing/analytics/route.ts` | Analytics dashboard |

### Assets
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `MKT-ASSETS-001` | Media Library | `src/app/(dashboard)/marketing/assets/page.tsx` | Image/media library |
| `MKT-ASSETS-002` | Marketing Images | `src/lib/marketing-images.ts` | Image utilities |

### Marketing Components
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `MKT-COMP-001` | Stats Cards | `src/components/marketing/dashboard/StatsCards.tsx` | Marketing stats |
| `MKT-COMP-002` | Leads Chart | `src/components/marketing/dashboard/LeadsChart.tsx` | Leads visualization |
| `MKT-COMP-003` | Campaign Performance | `src/components/marketing/dashboard/CampaignPerformanceChart.tsx` | Campaign charts |
| `MKT-COMP-004` | Traffic Sources | `src/components/marketing/dashboard/TrafficSourcesChart.tsx` | Traffic analysis |
| `MKT-COMP-005` | Quick Actions | `src/components/marketing/dashboard/QuickActions.tsx` | Marketing quick actions |
| `MKT-COMP-006` | Recent Activity | `src/components/marketing/dashboard/RecentActivity.tsx` | Activity feed |

---

## GUEST - Guest Access Module

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `GUEST-VIEW-001` | Guest Dashboard | `src/app/guest/[token]/page.tsx` | Guest dashboard view |
| `GUEST-API-001` | Guest Token Validation | `src/app/api/guest/[token]/route.ts` | Validate guest token |
| `GUEST-DATA-001` | Guest Data Access | `src/app/api/guest/[token]/data/route.ts` | Get data for guest |
| `GUEST-DASH-001` | Guest View Dashboard | `src/app/api/guest/[token]/view-dashboard/route.ts` | Dashboard for guest |
| `GUEST-MANAGE-001` | Guest Management | `src/app/api/projects/[id]/guests/route.ts`, `src/components/projects/GuestManagement.tsx` | Manage project guests |
| `GUEST-EMAIL-001` | Guest Invitation Email | `src/lib/email/guest-invitation.ts` | Send guest invite email |

### Public Shares (Legacy)
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `GUEST-SHARE-001` | Public Share Page | `src/app/share/[token]/page.tsx` | Public share view |
| `GUEST-SHARE-002` | Public Shares API | `src/app/api/public-shares/route.ts` | Create/list shares |
| `GUEST-SHARE-003` | Share Token | `src/app/api/public-shares/[token]/route.ts` | Validate share token |
| `GUEST-SHARE-004` | Share Data | `src/app/api/public-shares/[token]/data/route.ts` | Get shared data |

---

## SEC - Security Module

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SEC-ENC-001` | Encryption | `src/lib/security/encryption.ts` | Data encryption utilities |
| `SEC-AUDIT-001` | Audit Logger | `src/lib/security/audit-logger.ts`, `src/lib/audit.ts` | Security audit logging |
| `SEC-PII-001` | PII Redaction | `src/lib/security/pii-redaction.ts` | Personal data protection |
| `SEC-MW-001` | Security Middleware | `src/lib/security/middleware.ts` | Security middleware |
| `SEC-AI-001` | Secure AI | `src/lib/security/secure-ai.ts` | AI security layer |
| `SEC-RLS-001` | RLS Documentation | `src/app/(dashboard)/rls-docs/page.tsx`, `src/components/RLSDocumentation.tsx` | Row-level security docs |
| `SEC-AUDIT-VIEW-001` | Audit Log View | `src/app/(dashboard)/audit/page.tsx`, `src/components/AuditLog.tsx` | View audit logs |
| `SEC-STORE-001` | Audit Store | `src/lib/stores/auditStore.ts` | Audit state management |

---

## PORTAL - Client Portal Module

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `PORTAL-MAIN-001` | Portal Dashboard | `src/app/portal/page.tsx`, `src/components/portal/PortalDashboard.tsx` | Client portal main |
| `PORTAL-LAYOUT-001` | Portal Layout | `src/components/portal/PortalLayout.tsx` | Portal layout component |
| `PORTAL-POL-001` | Portal Policies | `src/app/portal/policies/page.tsx`, `src/components/portal/PoliciesPage.tsx` | Client policies view |
| `PORTAL-CLAIM-001` | Portal Claims | `src/app/portal/claims/page.tsx`, `src/components/portal/ClaimsPage.tsx` | Client claims |
| `PORTAL-DOC-001` | Portal Documents | `src/app/portal/documents/page.tsx`, `src/components/portal/DocumentsPage.tsx` | Client documents |
| `PORTAL-MSG-001` | Portal Messages | `src/app/portal/messages/page.tsx`, `src/components/portal/MessagesPage.tsx` | Client messages |
| `PORTAL-PROFILE-001` | Portal Profile | `src/app/portal/profile/page.tsx`, `src/components/portal/ProfilePage.tsx` | Client profile |

---

## AUTO - Automation Module

### Workflows
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTO-FLOW-001` | Workflows Page | `src/app/(dashboard)/workflows/page.tsx` | Workflow management |
| `AUTO-FLOW-002` | Project Automation | `src/app/(dashboard)/projects/[id]/automation/page.tsx` | Project-specific automation |

### Message Templates
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTO-TPL-001` | Message Templates API | `src/app/api/projects/[id]/message-templates/route.ts` | Message templates CRUD |
| `AUTO-TPL-002` | Template Details | `src/app/api/projects/[id]/message-templates/[templateId]/route.ts` | Single template ops |
| `AUTO-TPL-003` | Message Templates UI | `src/components/automation/MessageTemplates.tsx` | Templates component |

### WhatsApp
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTO-WA-001` | WhatsApp Generate | `src/app/api/projects/[id]/whatsapp/generate/route.ts` | Generate WhatsApp message |
| `AUTO-WA-002` | WhatsApp Preview | `src/components/automation/WhatsAppPreview.tsx` | Preview WhatsApp message |
| `AUTO-WA-003` | WhatsApp Service | `src/lib/services/whatsapp.ts` | WhatsApp service |

### Email
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `AUTO-EMAIL-001` | Inbound Email | `src/app/api/webhooks/inbound-email/route.ts` | Process incoming emails |

---

## SYS - System Module

### Admin Panel
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SYS-ADMIN-001` | Admin Dashboard | `src/app/(dashboard)/admin/page.tsx` | Admin main page |
| `SYS-ADMIN-002` | Admin Projects | `src/app/api/admin/projects/route.ts`, `src/components/admin/AdminProjectsContent.tsx` | Admin project management |
| `SYS-ADMIN-003` | Admin Users | `src/components/admin/AdminUsersContent.tsx` | Admin user management |
| `SYS-ADMIN-004` | Admin Settings | `src/components/admin/AdminSettingsContent.tsx` | Admin settings |
| `SYS-ADMIN-005` | User Approval | `src/components/admin/UserApprovalManager.tsx` | Approve user registrations |

### Health & Debug
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SYS-HEALTH-001` | Health Check | `src/app/api/health/route.ts` | System health endpoint |
| `SYS-HEALTH-002` | Data Health | `src/app/(dashboard)/admin/data-health/page.tsx`, `src/components/admin/health/DataHealthDashboard.tsx` | Data health dashboard |
| `SYS-DEBUG-001` | Debug Schema | `src/app/api/debug/schema/route.ts` | Debug database schema |
| `SYS-DEBUG-002` | Debug Columns | `src/app/api/debug/columns/route.ts` | Debug column info |
| `SYS-DEBUG-003` | Project Debug | `src/app/api/projects/[id]/debug/route.ts`, `src/app/api/projects/[id]/debug-data/route.ts` | Debug project data |

### Schema Registry
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SYS-SCHEMA-001` | Schema Registry | `src/app/(dashboard)/admin/schema-registry/page.tsx`, `src/components/admin/health/SchemaRegistryManager.tsx` | Manage DB schemas |

### Settings & Preferences
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SYS-SETTINGS-001` | Settings Page | `src/app/(dashboard)/settings/page.tsx` | User settings |
| `SYS-PREF-001` | User Preferences | `src/lib/stores/userPreferencesStore.ts` | User preferences state |

### Layout
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SYS-LAYOUT-001` | Sidebar | `src/components/layout/Sidebar.tsx` | Main navigation sidebar |
| `SYS-LAYOUT-002` | Header | `src/components/layout/Header.tsx` | Page header |
| `SYS-PROTECT-001` | Protected Route | `src/components/auth/ProtectedRoute.tsx` | Auth route protection |

### AI Services
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SYS-AI-001` | AI Service | `src/lib/services/ai.ts` | AI service integration |
| `SYS-AI-002` | Knowledge Chat | `src/components/assistant/KnowledgeChat.tsx` | AI chat assistant |
| `SYS-AI-003` | Navigation Assistant | `src/components/assistant/NavigationAssistant.tsx` | AI navigation help |

### Workspace
| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `SYS-WORK-001` | Workspace Contacts | `src/app/(dashboard)/workspace/contacts/page.tsx`, `src/app/api/workspace/contacts/route.ts` | Agent workspace contacts |
| `SYS-WORK-002` | Workspace Contact Details | `src/app/api/workspace/contacts/[id]/route.ts` | Single contact ops |

---

## Smart Table Components

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `TBL-SMART-001` | Smart Table | `src/components/smart-table/SmartTable.tsx` | Smart data table |
| `TBL-SMART-002` | Dynamic Filter | `src/components/smart-table/DynamicFilterBar.tsx` | Dynamic filtering |
| `TBL-SMART-003` | Filter Presets | `src/components/smart-table/FilterPresets.tsx` | Saved filter presets |
| `TBL-SMART-004` | Summary Row | `src/components/smart-table/SummaryRow.tsx` | Table summary row |

---

## Landing Page (Public Website)

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `LAND-MAIN-001` | Landing Page | `src/app/landing/page.tsx` | Public landing page |
| `LAND-HOME-001` | Home Page | `src/app/page.tsx` | Root page |
| `LAND-HERO-001` | Hero Section | `src/components/landing/HeroSection.tsx` | Landing hero |
| `LAND-FEAT-001` | Features Section | `src/components/landing/FeaturesSection.tsx`, `src/components/landing/FeatureCard.tsx` | Features showcase |
| `LAND-CTA-001` | CTA Section | `src/components/landing/CTASection.tsx` | Call to action |
| `LAND-STATS-001` | Stats Section | `src/components/landing/StatsSection.tsx` | Statistics display |
| `LAND-NAV-001` | Navbar | `src/components/landing/Navbar.tsx` | Landing navigation |
| `LAND-FOOT-001` | Footer | `src/components/landing/Footer.tsx` | Landing footer |

---

## Partner & Agent Pages

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `PARTNER-001` | Partner Page | `src/app/partner/page.tsx` | Partner landing |
| `AGENT-001` | Agent Dashboard | `src/app/(dashboard)/agent/page.tsx` | Agent main page |

---

## Database & Supabase

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `DB-CLIENT-001` | Supabase Client | `src/lib/supabase/client.ts` | Browser Supabase client |
| `DB-SERVER-001` | Supabase Server | `src/lib/supabase/server.ts` | Server Supabase client |
| `DB-SELAI-001` | Selai DB Client | `src/lib/supabase/selai-client.ts` | Selai-specific DB client |
| `DB-MW-001` | Supabase Middleware | `src/lib/supabase/middleware.ts` | Auth middleware |
| `DB-PERM-001` | Permissions Utils | `src/lib/utils/permissions.ts` | Permission utilities |
| `DB-PROJ-001` | Project Database Utils | `src/lib/utils/projectDatabase.ts` | Project DB helpers |
| `DB-COL-001` | Column Analyzer | `src/lib/utils/columnAnalyzer.ts` | Column analysis utils |

---

## Utility Libraries

| Feature ID | Name | Files | Description |
|------------|------|-------|-------------|
| `UTIL-001` | General Utils | `src/lib/utils.ts` | General utilities |
| `UTIL-002` | Dashboard Types | `src/lib/dashboardTypes.ts` | Dashboard type definitions |
| `UTIL-003` | Insurance Patterns | `src/lib/insurance-patterns.ts` | Insurance data patterns |
| `UTIL-004` | Project Analyzer | `src/lib/project-analyzer.ts` | Project analysis utils |
| `UTIL-HOOK-001` | 2FA Hook | `src/lib/hooks/use2FA.ts` | Two-factor auth hook |
| `UTIL-HOOK-002` | Excel Import Hook | `src/lib/hooks/useExcelImport.ts` | Excel import hook |

---

## Quick Reference by Issue Type

### "Agent not visible to Supervisor"
Check: `HIER-AGT-003`, `HIER-SUP-001`, `HIER-SUP-PAGE-001`

### "Login not working"
Check: `AUTH-LOGIN-001`, `AUTH-LOGIN-002`, `AUTH-LOGIN-003`

### "Registration stuck in pending"
Check: `AUTH-REG-004`, `AUTH-REG-005`

### "Guest can't access dashboard"
Check: `GUEST-VIEW-001`, `GUEST-API-001`, `GUEST-DASH-001`, `GUEST-MANAGE-001`

### "Landing page not showing"
Check: `MKT-LP-001`, `MKT-LP-005`, `SYS-LAYOUT-001`

### "Data import failing"
Check: `DATA-IMPORT-002`, `DATA-IMPORT-003`, `DATA-IMPORT-004`, `DATA-MAP-001`

### "Dashboard not loading"
Check: `DASH-VIEW-001`, `DASH-VIEW-002`, `DASH-SMART-001`

### "CRM contacts missing"
Check: `CRM-CONTACT-001`, `CRM-CONTACT-002`, `CRM-STORE-001`

### "Marketing stats wrong"
Check: `MKT-ANALYTICS-001`, `MKT-COMP-001`, `MKT-STORE-001`

---

## Statistics

| Category | Count |
|----------|-------|
| Total Features | ~180 |
| API Routes | 92 |
| Pages | 74 |
| Components | 102 |
| Stores | 9 |
| Modules | 13 |

---

*Last Updated: January 2026*
*Version: 1.0.0*
