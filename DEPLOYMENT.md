# SELAI Admin Hub - Production Deployment Guide
# סלע דשבורדים | Sela Dashboards

## Table of Contents
1. [Quick Start](#quick-start)
2. [Docker Configuration](#docker-configuration)
3. [SSL/TLS Setup](#ssltls-setup)
4. [Security Checklist for Financial Institutions](#security-checklist)
5. [Backup Strategy](#backup-strategy)
6. [Monitoring & Logging](#monitoring--logging)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# 1. Clone and configure
git clone <repository-url>
cd selai-admin-hub

# 2. Create production environment file
cp .env.production.example .env.production
# Edit .env.production with your values

# 3. Generate security keys
openssl rand -hex 32  # For ENCRYPTION_KEY
openssl rand -hex 32  # For SESSION_SECRET

# 4. Build and deploy
docker compose -f docker-compose.yml up -d --build

# 5. View logs
docker compose logs -f
```

---

## Docker Configuration

### Architecture Overview

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

### Container Security Features

| Container | Security Features |
|-----------|-------------------|
| selai-hub | Non-root user, read-only filesystem, no-new-privileges |
| nginx | Read-only configs, no-new-privileges |
| redis | Password protected, persistence enabled, no-new-privileges |

### Resource Limits

```yaml
# Configured in docker-compose.yml
resources:
  limits:
    cpus: '2'
    memory: 2G
  reservations:
    cpus: '0.5'
    memory: 512M
```

### Health Checks

All services include health checks:
- **selai-hub**: HTTP check on `/api/health` every 30s
- **redis**: Redis PING every 10s
- **nginx**: Depends on selai-hub health

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended for Production)

#### Initial Certificate Setup

```bash
# 1. Start nginx without SSL first (for ACME challenge)
docker compose up -d nginx

# 2. Obtain certificate
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email admin@sela-insurance.co.il \
  --agree-tos \
  --no-eff-email \
  -d selai.sela-insurance.co.il

# 3. Restart all services
docker compose down
docker compose up -d
```

#### Auto-Renewal

Certbot container automatically renews certificates every 12 hours.

To manually trigger renewal:
```bash
docker compose exec certbot certbot renew --dry-run
```

### Option 2: Manual SSL Certificate

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Copy your certificates
cp /path/to/fullchain.pem nginx/ssl/
cp /path/to/privkey.pem nginx/ssl/

# Set permissions
chmod 600 nginx/ssl/*.pem
```

### SSL Configuration Details

The nginx config includes:
- TLS 1.2 and 1.3 only (TLS 1.0/1.1 disabled)
- Strong cipher suites (ECDHE-based)
- HSTS enabled (1 year, includeSubDomains)
- OCSP stapling ready
- Session resumption enabled

---

## Security Checklist

### ✅ Pre-Deployment Checklist for Financial Institutions

#### Infrastructure Security
- [ ] **Network Isolation**: Deploy in private subnet with controlled ingress
- [ ] **Firewall Rules**: Only ports 80/443 exposed, internal traffic restricted
- [ ] **VPN Access**: Admin access only via VPN or bastion host
- [ ] **DDoS Protection**: CloudFlare, AWS Shield, or similar enabled
- [ ] **WAF**: Web Application Firewall configured (ModSecurity, AWS WAF)

#### Application Security
- [ ] **Environment Variables**: All secrets in `.env.production`, not in code
- [ ] **Encryption Keys**: Generated using cryptographically secure methods
- [ ] **2FA Enabled**: Two-factor authentication mandatory for all users
- [ ] **Session Security**: Secure cookies, short session timeouts
- [ ] **CORS Policy**: Strict origin validation (configured in next.config.ts)
- [ ] **CSP Headers**: Content Security Policy configured

#### Container Security
- [ ] **Non-root Users**: All containers run as non-root (✓ configured)
- [ ] **Read-only Filesystem**: App container is read-only (✓ configured)
- [ ] **No New Privileges**: Security option enabled (✓ configured)
- [ ] **Image Scanning**: Run `docker scan` before deployment
- [ ] **Base Image Updates**: Node and Nginx images are latest stable

#### Database Security (Supabase)
- [ ] **Row Level Security**: RLS enabled on all tables
- [ ] **Service Role Key**: Protected, never exposed to client
- [ ] **Connection Pooling**: PgBouncer enabled for production
- [ ] **Audit Logging**: Enabled for sensitive tables
- [ ] **Backup Encryption**: Point-in-time recovery enabled

#### Compliance Requirements
- [ ] **Data Classification**: All data fields classified (PII, financial, etc.)
- [ ] **Audit Trail**: All user actions logged with timestamps
- [ ] **Data Retention**: Policies defined and implemented
- [ ] **Access Logs**: Nginx logs retained for 90+ days
- [ ] **Encryption at Rest**: Supabase encrypts data at rest
- [ ] **Encryption in Transit**: TLS 1.2+ enforced

#### Monitoring & Alerting
- [ ] **Health Checks**: All services have health endpoints
- [ ] **Error Tracking**: Sentry or similar configured
- [ ] **Log Aggregation**: Centralized logging (ELK, CloudWatch)
- [ ] **Uptime Monitoring**: External monitoring configured
- [ ] **Alert Thresholds**: CPU, memory, error rate alerts set

#### Access Control
- [ ] **Principle of Least Privilege**: Users have minimal required permissions
- [ ] **Regular Access Review**: Quarterly access audits scheduled
- [ ] **Password Policy**: Strong passwords enforced via Supabase
- [ ] **API Key Rotation**: Schedule for rotating Supabase keys
- [ ] **SSH Key Management**: No shared keys, individual access only

### Security Headers (Configured)

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

---

## Backup Strategy

### Backup Components

| Component | Backup Method | Frequency | Retention |
|-----------|---------------|-----------|-----------|
| Supabase Database | Point-in-time recovery | Continuous | 7 days |
| Redis Cache | AOF persistence | Real-time | Session data only |
| SSL Certificates | Volume backup | Weekly | 30 days |
| Nginx Logs | Log rotation + backup | Daily | 90 days |
| Application Config | Git repository | On change | Forever |

### Supabase Backup

Supabase Pro plan includes:
- **Point-in-time Recovery (PITR)**: Restore to any second in the last 7 days
- **Daily Backups**: Automatic, retained for 7 days

Manual backup via CLI:
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create backup
supabase db dump -p YOUR_PROJECT_REF > backup_$(date +%Y%m%d).sql
```

### Automated Backup Script

Create `scripts/backup.sh`:

```bash
#!/bin/bash
# SELAI Backup Script

set -e

BACKUP_DIR="/backups/selai"
DATE=$(date +%Y%m%d_%H%M%S)
S3_BUCKET="${BACKUP_S3_BUCKET:-selai-backups}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup SSL certificates
tar -czf "$BACKUP_DIR/ssl_$DATE.tar.gz" -C /app/nginx ssl/

# Backup environment (encrypted)
gpg --symmetric --cipher-algo AES256 \
  -o "$BACKUP_DIR/env_$DATE.gpg" \
  /app/.env.production

# Backup Redis (if using)
docker exec selai-redis redis-cli -a "$REDIS_PASSWORD" BGSAVE

# Upload to S3 (if configured)
if [ -n "$AWS_ACCESS_KEY_ID" ]; then
  aws s3 sync "$BACKUP_DIR" "s3://$S3_BUCKET/$DATE/"
fi

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

### Disaster Recovery Plan

1. **RTO (Recovery Time Objective)**: 1 hour
2. **RPO (Recovery Point Objective)**: 5 minutes (Supabase PITR)

#### Recovery Steps

```bash
# 1. Restore Supabase database (via Dashboard or CLI)
supabase db restore --point-in-time "2024-01-15T10:30:00Z"

# 2. Restore SSL certificates
tar -xzf ssl_backup.tar.gz -C nginx/

# 3. Restore environment file
gpg -d env_backup.gpg > .env.production

# 4. Rebuild and deploy
docker compose up -d --build
```

---

## Monitoring & Logging

### Log Locations

| Service | Log Location | Rotation |
|---------|-------------|----------|
| selai-hub | Docker JSON logs | 5 files x 10MB |
| nginx | `/var/log/nginx/` volume | 5 files x 10MB |
| redis | Docker JSON logs | 5 files x 10MB |

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f selai-hub

# Last 100 lines
docker compose logs --tail=100 nginx
```

### Log Format (Nginx)

```
$remote_addr - $remote_user [$time_local] "$request"
$status $body_bytes_sent "$http_referer"
"$http_user_agent" "$http_x_forwarded_for"
```

### Health Check Endpoint

Create `/api/health/route.ts`:

```typescript
export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  })
}
```

### Recommended Monitoring Stack

1. **Uptime**: Uptime Robot, Pingdom, or Better Uptime
2. **APM**: Sentry, New Relic, or Datadog
3. **Logs**: Papertrail, Logtail, or ELK Stack
4. **Metrics**: Prometheus + Grafana

---

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker compose logs selai-hub

# Check container status
docker compose ps

# Rebuild without cache
docker compose build --no-cache
```

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in nginx/ssl/fullchain.pem -text -noout

# Test SSL configuration
curl -vI https://selai.sela-insurance.co.il
```

#### Database Connection Issues

```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
  https://YOUR_PROJECT.supabase.co/rest/v1/
```

#### Memory Issues

```bash
# Check container memory usage
docker stats

# Increase memory limit in docker-compose.yml
```

### Useful Commands

```bash
# Restart all services
docker compose restart

# Rebuild and restart single service
docker compose up -d --build selai-hub

# Enter container shell
docker compose exec selai-hub sh

# Check disk usage
docker system df

# Clean up unused resources
docker system prune -af
```

---

## Contact & Support

- **Technical Issues**: [GitHub Issues]
- **Security Concerns**: security@sela-insurance.co.il
- **Emergency**: Contact system administrator

---

*Last Updated: January 2026*
*Version: 1.0.0*
