# SELAI Admin Hub

מערכת דשבורדים לניהול סוכנים, מפקחים ונתונים עסקיים עבור סלע ביטוח.

## תכונות

- ניהול פרויקטים ודשבורדים
- ייבוא נתונים מקבצי Excel
- היררכיה ארגונית (מנהלים, מפקחים, סוכנים)
- מערכת הזמנות והרשמה
- אימות זהות מול אפליקציית SELAI
- תצוגות מותאמות לפי תפקיד

## התקנה מהירה (Development)

```bash
# Clone
git clone https://github.com/selamagic/selai-admin-hub.git
cd selai-admin-hub

# התקנה
npm install

# הגדרת env
cp .env.production.example .env.local
# ערוך את .env.local עם המפתחות הנכונים

# הרצה
npm run dev
```

## פריסה (Production)

ראה את המדריך המלא: [DEPLOYMENT.md](./DEPLOYMENT.md)

## מבנה הפרויקט

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # דפי אימות (login, register)
│   ├── (dashboard)/       # דפי הדשבורד
│   │   ├── hierarchy/     # היררכיה ארגונית
│   │   ├── projects/      # ניהול פרויקטים
│   │   └── users/         # ניהול משתמשים
│   └── api/               # API Routes
│       ├── auth/          # APIs אימות
│       ├── invitations/   # APIs הזמנות
│       ├── projects/      # APIs פרויקטים
│       └── selai/         # APIs מול SELAI
├── components/            # React Components
├── lib/                   # Utilities
│   ├── supabase/         # Supabase clients
│   ├── stores/           # Zustand stores
│   └── utils/            # Helper functions
└── types/                # TypeScript types
```

## Environment Variables

```env
# Hub Supabase (Auth + Projects)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# SELAI Supabase (Agents Data)
SELAI_SUPABASE_URL=
SELAI_SERVICE_ROLE_KEY=

# Encryption
ENCRYPTION_KEY=

# App URL (for invitation links)
NEXT_PUBLIC_APP_URL=
```

## טכנולוגיות

- **Framework**: Next.js 16 (App Router)
- **UI**: Tailwind CSS, shadcn/ui, Radix
- **Database**: Supabase (PostgreSQL)
- **State**: Zustand
- **Auth**: Supabase Auth
- **Charts**: Recharts
- **Excel**: xlsx

## Scripts

```bash
npm run dev      # הרצה בפיתוח
npm run build    # בנייה לפרודקשן
npm run start    # הרצה בפרודקשן
npm run lint     # בדיקת קוד
```

## תמיכה

- **Issues**: https://github.com/selamagic/selai-admin-hub/issues
