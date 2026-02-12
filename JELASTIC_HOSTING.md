# Ticketer - Jelastic Cloud Hosting Guide

This guide explains how to deploy Ticketer event ticketing system on Jelastic PaaS (Platform as a Service).

## What is Ticketer?

Ticketer is a modern event ticketing and seat selection system featuring:
- **Real-time seat selection** with live booking updates
- **Interactive seat maps** for visualizing venue layouts
- **Admin panel** for comprehensive event management
- **Responsive design** that works on all devices
- **RESTful API** for integration with other systems

Built with Next.js 16, React 19, Mantine UI, and Prisma ORM.

## Automatic Deployment to Jelastic

The easiest way to get Ticketer running is with automatic installation.

### Prerequisites
- Access to any [Jelastic PaaS provider](https://jelastic.cloud/)
- Valid email address
- Database password (minimum 8 characters)

### One-Click Installation

1. Click the **Deploy to Jelastic** button:

   [![Deploy](https://github.com/jelastic-jps/git-push-deploy/raw/master/images/deploy-to-jelastic.png)](https://jelastic.com/install-application/?jps=https://raw.githubusercontent.com/klukama/ticketer/main/manifest.jps)

2. **Choose Provider**: Select from available [Jelastic Public Cloud providers](https://jelastic.cloud/)

3. **Configure Installation**:
   - Environment Name: Choose a name (e.g., `ticketer-prod`)
   - Region: Select closest to your users
   - Database User: `ticketer` (default)
   - Database Password: Enter a strong password (min 8 characters)
   - Database Name: `ticketer` (default)

4. **Install**: Click Install and wait 10-15 minutes

### What Gets Installed

The manifest automatically provisions:

**Infrastructure:**
- **Nginx Load Balancer** (8 cloudlets)
  - SSL/TLS termination ready
  - Reverse proxy configuration
  - Static asset caching
  
- **Node.js 22.x Application Server** (32 cloudlets)
  - Next.js application runtime
  - Optimized for production
  - Auto-scaling capable

- **MySQL 9.x Database** (16 cloudlets)
  - Configured for UTF-8MB4
  - Automatic backups available
  - Secure internal networking

**Application Setup:**
1. Downloads latest code from GitHub
2. Installs all dependencies
3. Builds Next.js application
4. Configures database connection
5. Initializes database schema
6. Seeds with sample events
7. Configures Nginx reverse proxy
8. Starts the application

### Post-Installation

After successful deployment, you'll receive:

**Access URLs:**
- **Application**: `https://your-env-name.provider.com`
- **Admin Panel**: `https://your-env-name.provider.com/admin`
- **Health Check**: `https://your-env-name.provider.com/api/health`

**Email Notification** with:
- Access credentials
- Database connection details
- Next steps and recommendations

### First Steps

1. **Visit Your Application**
   - Open the URL provided in the success message
   - You'll see the homepage with sample events

2. **Access Admin Panel**
   - Navigate to `/admin`
   - Create your first custom event
   - Configure seat layouts

3. **Enable SSL** (Recommended)
   - Go to Jelastic environment settings
   - Enable Let's Encrypt SSL
   - Force HTTPS redirect

4. **Optimize Resources**
   - Reduce Node.js cloudlets from 32 to 8-16
   - This saves costs while maintaining performance
   - Monitor usage and adjust as needed

## Manual Installation

If you need more control or custom configuration:

### Method 1: Import Manifest

1. **Log into Jelastic Dashboard**
2. **Import Application**:
   - Click "Import"
   - URL: `https://raw.githubusercontent.com/klukama/ticketer/main/manifest.jps`
   - Or upload `manifest.jps` file
3. **Configure & Install**
   - Set database password
   - Click Install

### Method 2: Manual Setup

For advanced users who want full control:

#### 1. Create Environment

In Jelastic Dashboard, create new environment:

**Topology:**
- **Load Balancer**: Nginx 1.28+
  - Cloudlets: 1 reserved, 8 scaling limit
  - Public IP: Enabled
  
- **Application Server**: Node.js 22.x
  - Cloudlets: 8 reserved, 32 scaling limit
  - Count: 1 (can scale horizontally later)
  
- **Database**: MySQL 9.x
  - Cloudlets: 4 reserved, 16 scaling limit
  - Storage: 10GB minimum

#### 2. Configure Database

SSH to MySQL node or use phpMyAdmin:

```sql
CREATE DATABASE ticketer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ticketer'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON ticketer.* TO 'ticketer'@'%';
FLUSH PRIVILEGES;
```

#### 3. Deploy Application

**Option A: From Git**
- In Node.js node settings, add Git repository
- URL: `https://github.com/klukama/ticketer.git`
- Branch: `main`
- Context: `ROOT`

**Option B: Upload Archive**
- Download latest release
- Upload via Deployment Manager

#### 4. Configure Environment

Set environment variables in Node.js node:

```bash
DATABASE_URL=mysql://ticketer:password@MYSQL_INTERNAL_IP:3306/ticketer
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0
```

Replace `password` and `MYSQL_INTERNAL_IP` with actual values.

#### 5. Build Application

SSH to Node.js node:

```bash
cd /home/jelastic/ROOT

# Run automated build script
bash jelastic-setup.sh
```

Or manually:

```bash
npm cache clean --force
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma
npm run db:generate
npx prisma db push --accept-data-loss
npm run db:seed
NODE_OPTIONS="--max-old-space-size=4096" npm run build
npm prune --production
```

#### 6. Configure Nginx

Create `/etc/nginx/conf.d/ticketer.conf`:

```nginx
upstream nodejs_backend {
    server NODEJS_INTERNAL_IP:3000 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name _;
    client_max_body_size 10M;

    location / {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static/ {
        proxy_pass http://nodejs_backend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    location /api/health {
        proxy_pass http://nodejs_backend;
        access_log off;
    }
}
```

Disable default config and reload:

```bash
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
nginx -t && nginx -s reload
```

#### 7. Start Application

Set Node.js start command to `npm start` and restart the node.

## Architecture

```
┌─────────────────────┐
│   Internet Users    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Nginx Load Balancer│ (Public IP)
│  - SSL Termination  │
│  - Static Caching   │
│  - Reverse Proxy    │
└──────────┬──────────┘
           │ Internal Network
           ▼
┌─────────────────────┐
│   Node.js Server    │
│  - Next.js Runtime  │
│  - API Endpoints    │
│  - Server-side      │
└──────────┬──────────┘
           │ Internal Network
           ▼
┌─────────────────────┐
│  MySQL Database     │
│  - Event Data       │
│  - Seat Bookings    │
│  - Persistent Store │
└─────────────────────┘
```

## Resource Requirements

### Development/Testing
- Nginx: 4-8 cloudlets
- Node.js: 8-16 cloudlets
- MySQL: 8-16 cloudlets
- **Total**: ~20-40 cloudlets

### Production (Low Traffic)
- Nginx: 4-8 cloudlets
- Node.js: 8-16 cloudlets
- MySQL: 8-16 cloudlets
- **Total**: ~20-40 cloudlets

### Production (High Traffic)
- Nginx: 8-16 cloudlets (or add more nodes)
- Node.js: 16-32 cloudlets (or horizontal scaling)
- MySQL: 16-32 cloudlets
- **Total**: ~40-80 cloudlets

**Note**: 1 cloudlet = 128 MB RAM + proportional CPU

## Cost Optimization

1. **Initial Build**: Requires 32 cloudlets for Node.js (memory-intensive)
2. **After Build**: Reduce to 8-16 cloudlets for runtime
3. **Auto-scaling**: Set triggers for CPU/RAM (scale at 70-80%)
4. **Reserved Cloudlets**: Use for baseline load (cheaper)
5. **Horizontal Scaling**: Add Node.js nodes for high availability

## SSL/TLS Setup

### Let's Encrypt (Recommended)

1. Go to environment **Settings**
2. Select **SSL/TLS**
3. Choose **Let's Encrypt**
4. Enter domain and email
5. Click **Install**

Auto-renewal is handled by Jelastic.

### Custom Certificate

1. Upload certificate files
2. Apply to load balancer
3. Configure renewal process

## Monitoring & Maintenance

### Health Checks

- Built-in endpoint: `/api/health`
- Returns application and database status
- Use for monitoring tools integration

### Logs

Access logs in Jelastic dashboard:
- **Node.js**: Application logs
- **Nginx**: Access and error logs
- **MySQL**: Database logs

### Backups

**Database Backups:**
1. Go to MySQL node settings
2. Enable automated backups
3. Schedule: Daily at 2 AM (recommended)
4. Retention: 7 days minimum

**Application Backups:**
- Use Git for version control
- Tag releases for rollback capability

### Updates

```bash
cd /home/jelastic/ROOT
git pull origin main
npm cache clean --force
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma
npm run db:generate
npx prisma db push --accept-data-loss
NODE_OPTIONS="--max-old-space-size=4096" npm run build
npm prune --production
# Restart via Jelastic dashboard
```

## Troubleshooting

### Build Fails with "Killed"
- **Cause**: Out of memory
- **Fix**: Increase Node.js cloudlets to 48 temporarily

### Nginx 502 Bad Gateway
- **Cause**: Node.js not running or wrong internal IP
- **Fix**: Check Node.js status, verify IP in nginx config

### Database Connection Failed
- **Cause**: Wrong DATABASE_URL
- **Fix**: Verify MySQL internal IP and credentials

### Application Won't Start
- **Cause**: Build failed or missing .env
- **Fix**: Check logs, verify .env exists with correct values

## Support & Resources

- **Documentation**: https://github.com/klukama/ticketer
- **Jelastic Docs**: https://docs.jelastic.com/
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs

## Features

### User Features
- Browse upcoming events
- Interactive seat map visualization
- Real-time seat availability
- Simple booking process
- Responsive mobile design

### Admin Features
- Create and manage events
- Configure venue layouts
- View booking statistics
- Manage seat reservations
- Track revenue and attendance

### Technical Features
- Server-side rendering (SSR)
- API-first architecture
- Database migrations via Prisma
- Health monitoring endpoint
- Production-optimized builds

## Customization

### Branding
- Update logo in `/public`
- Modify colors in Mantine theme
- Customize homepage layout

### Seat Layouts
- Configure rows and columns per section
- Support for left, right, and back sections
- Flexible venue configurations

### Integrations
- RESTful API for external systems
- Webhook support (future)
- Payment gateway integration (future)

## License

MIT License - Free for personal and commercial use

## About Jelastic

[Jelastic PaaS](https://jelastic.com/) provides automated DevOps for running applications in the cloud with:
- **Auto-scaling**: Vertical and horizontal
- **Pay-per-use**: Only pay for resources used
- **Multi-cloud**: Deploy across multiple providers
- **Zero downtime**: Rolling updates and migrations
- **Enterprise-grade**: Security and compliance

Choose from [public cloud providers](https://jelastic.cloud/) or run on private infrastructure.
