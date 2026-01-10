# SELAI Admin Hub - מדריך פריסה לשרת
# Sela Dashboards | סלע דשבורדים

מדריך זה מיועד למנהל מערכות מידע להתקנת והפעלת הדשבורד בסביבת Production.

## 📋 תוכן עניינים

1. [התחלה מהירה](#התחלה-מהירה)
2. [ארכיטקטורה](#ארכיטקטורה)
3. [אפשרות 1: PM2 (מומלץ לשרת יחיד)](#אפשרות-1-pm2)
4. [אפשרות 2: Docker](#אפשרות-2-docker)
5. [הגדרות Supabase](#הגדרות-supabase)
6. [משתני סביבה](#משתני-סביבה)
7. [הגדרת Nginx](#הגדרת-nginx)
8. [SSL ואבטחה](#ssl-ואבטחה)
9. [דומיין והפניות](#דומיין-והפניות)
10. [גיבוי ותחזוקה](#גיבוי-ותחזוקה)
11. [פתרון בעיות](#פתרון-בעיות)
12. [רשימת בדיקות לפני Go-Live](#רשימת-בדיקות)

---

## התחלה מהירה

### דרישות מקדימות

| רכיב | גרסה מינימלית | בדיקה |
|------|---------------|-------|
| Node.js | 20.x LTS | `node --version` |
| npm | 10.x | `npm --version` |
| Git | 2.x | `git --version` |
| OS | Ubuntu 22.04 LTS / Windows Server 2019+ | - |

### חומרה מומלצת
- **CPU**: 2+ cores
- **RAM**: 4GB (מומלץ 8GB)
- **Storage**: 20GB SSD

### התקנה מהירה (PM2)

```bash
# 1. Clone
git clone https://github.com/selamagic/selai-admin-hub.git
cd selai-admin-hub

# 2. Install
npm install

# 3. Configure
cp .env.production.example .env.local
nano .env.local  # הכנס את המפתחות

# 4. Build
npm run build

# 5. Install PM2 and run
npm install -g pm2
pm2 start npm --name "selai-hub" -- start
pm2 save
pm2 startup
```

---

## ארכיטקטורה

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION SERVER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐     ┌──────────┐     ┌─────────────────────┐    │
│   │  Nginx   │────▶│   PM2    │────▶│  Next.js App        │    │
│   │  :80/443 │     │          │     │  (localhost:3000)   │    │
│   └──────────┘     └──────────┘     └─────────────────────┘    │
│        │                                      │                  │
│        │                                      ▼                  │
│        │                            ┌─────────────────────┐     │
│        │                            │   Supabase Cloud    │     │
│        │                            │  ┌───────────────┐  │     │
│        │                            │  │ Hub Supabase  │  │     │
│        │                            │  │ (Auth+Data)   │  │     │
│        │                            │  └───────────────┘  │     │
│        │                            │  ┌───────────────┐  │     │
│        │                            │  │SELAI Supabase │  │     │
│        │                            │  │ (Agents Data) │  │     │
│        │                            │  └───────────────┘  │     │
│        │                            └─────────────────────┘     │
└────────┼────────────────────────────────────────────────────────┘
         │
         ▼
    ┌──────────┐
    │ Internet │
    │ Users    │
    └──────────┘
```

### שתי מערכות Supabase

| מערכת | כתובת | תפקיד |
|-------|-------|-------|
| **Hub Supabase** | `vcskhgqeqctitubryoet.supabase.co` | אימות משתמשים, פרויקטים, הזמנות |
| **SELAI Supabase** | `jlsnbsxmyucmgfzaawxc.supabase.co` | נתוני סוכנים (398), מפקחים (12) |

---

## אפשרות 1: PM2

### שלב 1: התקנה על השרת

```bash
# התחברות לשרת
ssh user@your-server-ip

# יצירת תיקיית פרויקטים
sudo mkdir -p /var/www
cd /var/www

# Clone הפרויקט
sudo git clone https://github.com/selamagic/selai-admin-hub.git
cd selai-admin-hub

# הרשאות
sudo chown -R $USER:$USER /var/www/selai-admin-hub

# התקנת dependencies
npm install
```

### שלב 2: הגדרת Environment

```bash
cp .env.production.example .env.local
nano .env.local
```

ראה [משתני סביבה](#משתני-סביבה) למטה.

### שלב 3: Build

```bash
npm run build
```

### שלב 4: הגדרת PM2

צור קובץ `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'selai-admin-hub',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/selai-admin-hub',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/selai-hub-error.log',
    out_file: '/var/log/pm2/selai-hub-out.log',
    time: true
  }]
};
```

### שלב 5: הפעלה

```bash
# יצירת תיקיית לוגים
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# הפעלה
pm2 start ecosystem.config.js

# שמירה להפעלה אוטומטית
pm2 startup
pm2 save

# בדיקת סטטוס
pm2 status
```

### פקודות PM2 שימושיות

```bash
pm2 logs selai-admin-hub    # צפייה בלוגים
pm2 restart selai-admin-hub # הפעלה מחדש
pm2 stop selai-admin-hub    # עצירה
pm2 monit                   # מוניטורינג
```

---

## אפשרות 2: Docker

### Docker Compose Quick Start

```bash
# 1. Configure
cp .env.production.example .env.production
nano .env.production

# 2. Generate keys
openssl rand -hex 32  # For ENCRYPTION_KEY

# 3. Build and run
docker compose up -d --build

# 4. View logs
docker compose logs -f
```

### Docker Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                              │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS (443)
┌─────────────────────▼───────────────────────────────────┐
│              Nginx Reverse Proxy                         │
│         (SSL Termination, Rate Limiting)                 │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTP (3000)
┌─────────────────────▼───────────────────────────────────┐
│              SELAI Next.js App                           │
│            (Node.js 20 Alpine)                           │
└─────────────────────┬───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
┌─────────────────┐      ┌─────────────────┐
│  Redis Cache    │      │    Supabase     │
│   (Optional)    │      │   (External)    │
└─────────────────┘      └─────────────────┘
```

### Container Security

| Container | Security Features |
|-----------|-------------------|
| selai-hub | Non-root user, read-only filesystem |
| nginx | Read-only configs, no-new-privileges |
| redis | Password protected, persistence enabled |

---

## הגדרות Supabase

### Hub Supabase - הגדרות נדרשות

1. **כניסה ל-Dashboard**: https://supabase.com/dashboard/project/vcskhgqeqctitubryoet

2. **הרצת SQL Migration**:
   - לך ל-SQL Editor
   - העתק והרץ את: `supabase/migrations/20260110_hub_invitations.sql`

3. **Authentication Settings**:
   - Settings → Authentication
   - Site URL: `https://your-domain.com`
   - Redirect URLs: `https://your-domain.com/**`

4. **קבלת מפתחות** (Settings → API):
   - `Project URL`
   - `anon public key`
   - `service_role key`

### SELAI Supabase - בדיקת הרשאות

כתובת: https://supabase.com/dashboard/project/jlsnbsxmyucmgfzaawxc

וודא גישת קריאה לטבלאות:
- `external_agents` (398 סוכנים)
- `supervisors` (12 מפקחים)
- `agent_supervisor_relations`

---

## משתני סביבה

צור קובץ `.env.local` (או `.env.production` ל-Docker):

```env
# ===========================================
# Hub Supabase (Authentication + Projects)
# ===========================================
NEXT_PUBLIC_SUPABASE_URL=https://vcskhgqeqctitubryoet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# SELAI Supabase (Agents Data - Read Only)
# ===========================================
SELAI_SUPABASE_URL=https://jlsnbsxmyucmgfzaawxc.supabase.co
SELAI_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ===========================================
# Security
# ===========================================
# Generate: openssl rand -hex 32
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# ===========================================
# Application
# ===========================================
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### אבטחת הקובץ
```bash
chmod 600 .env.local
```

---

## הגדרת Nginx

### יצירת קובץ הגדרות

```bash
sudo nano /etc/nginx/sites-available/selai-admin-hub
```

### תוכן הקובץ

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL (יווצרו ע"י Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json;

    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, immutable, max-age=31536000";
    }
}
```

### הפעלה

```bash
# קישור
sudo ln -s /etc/nginx/sites-available/selai-admin-hub /etc/nginx/sites-enabled/

# בדיקה
sudo nginx -t

# הפעלה
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## SSL ואבטחה

### Let's Encrypt עם Certbot

```bash
# התקנה
sudo apt install certbot python3-certbot-nginx

# קבלת תעודה
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# בדיקת חידוש אוטומטי
sudo certbot renew --dry-run
```

### Firewall (UFW)

```bash
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

---

## דומיין והפניות

### הגדרת DNS

| Type | Name | Value |
|------|------|-------|
| A | @ | YOUR_SERVER_IP |
| A | www | YOUR_SERVER_IP |
| CNAME | dashboard | your-domain.com |

### לינקים לאחר פריסה

| עמוד | כתובת |
|------|--------|
| **דף הבית** | `https://your-domain.com/` |
| **התחברות** | `https://your-domain.com/login` |
| **הרשמה (עם טוקן)** | `https://your-domain.com/register?token=XXX` |
| **הרשמה (אימות זהות)** | `https://your-domain.com/register` |
| **ניהול פרויקטים** | `https://your-domain.com/projects` |
| **היררכיה ארגונית** | `https://your-domain.com/hierarchy` |
| **ניהול משתמשים** | `https://your-domain.com/users` |

---

## גיבוי ותחזוקה

### סקריפט גיבוי אוטומטי

צור `backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/selai-admin-hub"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# גיבוי קוד
tar -czf $BACKUP_DIR/code_$DATE.tar.gz /var/www/selai-admin-hub \
  --exclude='node_modules' --exclude='.next'

# גיבוי env
cp /var/www/selai-admin-hub/.env.local $BACKUP_DIR/env_$DATE.backup

# מחיקת גיבויים ישנים (7 ימים)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Cron Job

```bash
crontab -e
# הוסף:
0 2 * * * /var/www/selai-admin-hub/backup.sh >> /var/log/selai-backup.log 2>&1
```

### עדכון מ-GitHub

```bash
cd /var/www/selai-admin-hub
git pull origin main
npm install
npm run build
pm2 restart selai-admin-hub
```

---

## פתרון בעיות

### האפליקציה לא עולה

```bash
pm2 logs selai-admin-hub --err
sudo lsof -i :3000
pm2 restart selai-admin-hub
```

### 502 Bad Gateway

```bash
pm2 status
sudo nginx -t
sudo systemctl restart nginx
```

### שגיאות Supabase

```bash
# בדיקת משתני סביבה
cat .env.local | grep SUPABASE

# בדיקת חיבוריות
curl https://vcskhgqeqctitubryoet.supabase.co/rest/v1/
```

---

## רשימת בדיקות

### לפני Go-Live

- [ ] Node.js 20+ מותקן
- [ ] PM2 / Docker מותקן ומוגדר
- [ ] `.env.local` מוגדר עם כל המפתחות
- [ ] `npm run build` הצליח
- [ ] האפליקציה רצה (PM2/Docker)
- [ ] Nginx מוגדר ורץ
- [ ] SSL תקין (HTTPS)
- [ ] DNS מצביע לשרת
- [ ] Firewall מוגדר
- [ ] SQL Migration הורץ ב-Hub Supabase
- [ ] משתמש Admin נוצר

### יצירת משתמש Admin ראשון

1. גש ל-Hub Supabase Dashboard
2. Authentication → Users → Invite user
3. לאחר הרשמה, עדכן role:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'admin@example.com';
```

---

## תמיכה

- **GitHub Issues**: https://github.com/selamagic/selai-admin-hub/issues

---

*עודכן לאחרונה: ינואר 2026*
