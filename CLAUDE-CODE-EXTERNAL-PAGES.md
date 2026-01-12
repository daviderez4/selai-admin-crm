# SELAI External Pages - Claude Code Implementation Guide

## 🎯 Mission
Create external-facing pages for SELAI that include:
1. Landing Page (marketing homepage)
2. Client Portal (customer self-service)
3. Auth Pages (login, register, forgot password)

**IMPORTANT: Do NOT modify any existing internal dashboard pages!**

---

## 📁 File Structure to Create

```
src/
├── app/
│   ├── (public)/                    # Public pages group
│   │   ├── page.tsx                 # Landing page (homepage)
│   │   ├── layout.tsx               # Public layout (no auth)
│   │   ├── features/page.tsx        # Features page
│   │   └── contact/page.tsx         # Contact page
│   │
│   ├── (auth)/                      # Auth pages group
│   │   ├── layout.tsx               # Auth layout
│   │   ├── login/page.tsx           # Login page
│   │   ├── register/page.tsx        # Register page
│   │   └── forgot-password/page.tsx # Forgot password
│   │
│   └── portal/                      # Client portal
│       ├── layout.tsx               # Portal layout with sidebar
│       ├── page.tsx                 # Portal dashboard
│       ├── policies/page.tsx        # My policies
│       ├── documents/page.tsx       # My documents
│       ├── messages/page.tsx        # Messages
│       └── profile/page.tsx         # Profile settings
│
├── components/
│   ├── landing/                     # Landing page components
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   ├── Stats.tsx
│   │   ├── CTA.tsx
│   │   └── Footer.tsx
│   │
│   └── portal/                      # Portal components
│       ├── PortalSidebar.tsx
│       └── PortalHeader.tsx
```

---

## 🚀 Step-by-Step Implementation

### Step 1: Create Public Layout
Create `src/app/(public)/layout.tsx`:

```tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
```

### Step 2: Copy Component Files
Copy these files from the provided code:
- `LandingPage.tsx` → Use components in `src/app/(public)/page.tsx`
- `ClientPortal.tsx` → Use in `src/app/portal/` pages
- `AuthPages.tsx` → Use in `src/app/(auth)/` pages

### Step 3: Create Landing Page
`src/app/(public)/page.tsx`:

```tsx
import LandingPage from '@/components/landing/LandingPage';
export default LandingPage;
```

Or split into components and use:
```tsx
import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import Stats from '@/components/landing/Stats';
import CTA from '@/components/landing/CTA';
import Footer from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <CTA />
      <Footer />
    </main>
  );
}
```

### Step 4: Create Auth Pages

`src/app/(auth)/login/page.tsx`:
```tsx
'use client';
import { LoginPage } from '@/components/auth/AuthPages';
export default LoginPage;
```

`src/app/(auth)/register/page.tsx`:
```tsx
'use client';
import { RegisterPage } from '@/components/auth/AuthPages';
export default RegisterPage;
```

### Step 5: Create Portal Pages

`src/app/portal/layout.tsx`:
```tsx
'use client';
import { PortalLayout } from '@/components/portal/ClientPortal';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}
```

`src/app/portal/page.tsx`:
```tsx
'use client';
import { PortalDashboard } from '@/components/portal/ClientPortal';
export default PortalDashboard;
```

---

## 🎨 Design Requirements

### Colors (match existing)
- Primary: Blue to Purple gradient (`from-blue-500 to-purple-600`)
- Background: White (`bg-white`) and Slate-50 (`bg-slate-50`)
- Text: Slate-800 for headings, Slate-500 for body
- Borders: Slate-200

### Typography
- Headings: Bold, using system fonts
- Body: Regular weight

### Components Style
- Rounded corners: `rounded-xl` (12px) or `rounded-2xl` (16px)
- Shadows: `shadow-sm` to `shadow-xl`
- Transitions: `transition-all` or `transition-colors`

### RTL Support
- All pages must have `dir="rtl"` on main container
- Text alignment: `text-right` for Hebrew content

---

## 🔗 Routes Summary

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Landing page | No |
| `/features` | Features page | No |
| `/contact` | Contact form | No |
| `/login` | Login page | No |
| `/register` | Registration | No |
| `/forgot-password` | Password reset | No |
| `/portal` | Client dashboard | Yes (client) |
| `/portal/policies` | My policies | Yes (client) |
| `/portal/documents` | My documents | Yes (client) |
| `/portal/messages` | Messages | Yes (client) |
| `/dashboard` | Agent dashboard | Yes (agent) |

---

## ⚠️ Important Notes

1. **DO NOT modify** any files in `src/app/(dashboard)/`
2. Keep internal dashboard style separate from external pages
3. External pages use darker gradients for headers
4. Internal dashboard remains white and clean
5. All new pages must support Hebrew RTL
6. Use existing Supabase auth integration
7. Connect to existing `users` table for portal access

---

## 🧪 Testing Checklist

- [ ] Landing page loads at `/`
- [ ] Login page loads at `/login`
- [ ] Register page loads at `/register`
- [ ] Portal loads at `/portal` (requires auth)
- [ ] Mobile responsive on all pages
- [ ] RTL text displays correctly
- [ ] Navigation links work
- [ ] Google login button present
- [ ] Forms validate correctly

---

## 📱 Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`

---

Run `npm run dev` and test all routes!
