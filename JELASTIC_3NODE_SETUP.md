# Jelastic 3-Node Setup Guide

This guide is specifically for deploying Ticketer on a **3-node Jelastic environment**:
1. **Nginx Load Balancer**
2. **Node.js Application Server**
3. **MySQL Database**

## Overview

```
┌─────────────────────┐
│  Internet Traffic   │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Nginx (Port 80)   │  ← Load Balancer Node
│    Reverse Proxy    │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  Node.js (Port 3000)│  ← Application Server Node
│  Next.js App        │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│  MySQL (Port 3306)  │  ← Database Node
│  ticketer database  │
└─────────────────────┘
```

## Node Configuration

### 1. Nginx Load Balancer Node
- **Software**: Nginx 1.28.x
- **Cloudlets**: 8 (reserved: 2, scaling: 8)
- **Public IP**: YES (required for external access)
- **Role**: Receives HTTP/HTTPS traffic and forwards to Node.js

### 2. Node.js Application Node
- **Software**: Node.js 22.x LTS
- **Cloudlets**: 
  - **During Build**: 32 cloudlets (16 GB RAM) - required for Next.js build
  - **After Build**: 8-16 cloudlets (4-8 GB RAM) - sufficient for runtime
- **Public IP**: NO (communicates internally)
- **Role**: Runs Next.js application

### 3. MySQL Database Node
- **Software**: MySQL 9.x
- **Cloudlets**: 16 (reserved: 4, scaling: 16)
- **Storage**: 10 GB minimum
- **Public IP**: NO (communicates internally)
- **Role**: Stores application data

## Step-by-Step Deployment

### Step 1: Create Jelastic Environment

1. **Log in** to your Jelastic dashboard (Infomaniak or other provider)
2. Click **"New Environment"**
3. **Configure topology**:

   **Load Balancer:**
   - Type: Nginx
   - Version: 1.28.x (latest)
   - Cloudlets: 2-8
   - ✅ Public IPv4

   **Application Server:**
   - Type: Node.js
   - Version: 22.x LTS
   - Cloudlets: 8-32 (start with 32 for build)
   - Count: 1 node

   **Database:**
   - Type: MySQL
   - Version: 9.x
   - Cloudlets: 4-16
   - Storage: 10 GB

4. **Name your environment** (e.g., `ticketer-prod`)
5. Click **"Create"**

### Step 2: Configure MySQL Database

1. **Access MySQL** via Jelastic dashboard → MySQL node → **phpMyAdmin** or **Web SSH**

2. **Create database and user**:
```sql
CREATE DATABASE ticketer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ticketer'@'%' IDENTIFIED BY 'YOUR_SECURE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON ticketer.* TO 'ticketer'@'%';
FLUSH PRIVILEGES;
```

3. **Note the MySQL internal IP**:
   - In Jelastic dashboard, click on MySQL node
   - Look for **Internal IP** (e.g., `192.168.1.10` or similar)
   - You'll need this for the DATABASE_URL

### Step 3: Deploy Application Code to Node.js

**Option A: Git Deployment (Recommended)**

1. Go to Node.js node → **Git/SVN**
2. Add repository:
   - **URL**: `https://github.com/your-username/ticketer.git`
   - **Branch**: `main`
   - **Context**: `ROOT`
3. Click **"Add"**

**Option B: Upload Archive**

1. Create archive locally: `tar -czf ticketer.tar.gz --exclude=node_modules --exclude=.git .`
2. Upload via Node.js node → **Deployment Manager**

### Step 4: Configure Environment Variables

1. Go to Node.js node → **Config** → **Variables**
2. Add these environment variables:

```bash
DATABASE_URL=mysql://ticketer:YOUR_PASSWORD@MYSQL_INTERNAL_IP:3306/ticketer
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0
```

**Important**: 
- Replace `YOUR_PASSWORD` with the password you set in Step 2
- Replace `MYSQL_INTERNAL_IP` with the MySQL node's internal IP from Step 2

### Step 5: Build the Application

1. **SSH into Node.js node** (via Jelastic Web SSH or your SSH client)

2. **Navigate to app directory**:
```bash
cd /home/jelastic/ROOT
```

3. **Run the optimized build process**:
```bash
# Clear cache
npm cache clean --force

# Install production dependencies
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev

# Install build dependencies
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma

# Generate Prisma client
npm run db:generate

# Push database schema to MySQL
npx prisma db push --accept-data-loss

# Seed database with sample data
npm run db:seed || echo "Seeding skipped"

# Build Next.js application
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Clean up dev dependencies
npm prune --production
```

**Alternative**: Use the automated script:
```bash
bash jelastic-setup.sh
```

4. **If you get "Killed" error**:
   - Your node ran out of memory
   - Temporarily increase cloudlets to 32-48 in Jelastic dashboard
   - Retry the build
   - Reduce cloudlets back to 8-16 after successful build

### Step 6: Configure Nginx Load Balancer

1. **Get Node.js internal IP**:
   - In Jelastic dashboard, click on Node.js node
   - Note the **Internal IP** (e.g., `192.168.1.20`)

2. **Configure Nginx**:
   - Go to Nginx node → **Config**
   - Navigate to `/etc/nginx/conf.d/`
   - Create new file: `ticketer.conf`

3. **Add this configuration** (replace `NODEJS_INTERNAL_IP` with actual IP):

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

    # Cache Next.js static assets
    location /_next/static/ {
        proxy_pass http://nodejs_backend;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /api/health {
        proxy_pass http://nodejs_backend;
        access_log off;
    }
}
```

4. **Disable default Nginx config**:
   - Rename `/etc/nginx/conf.d/default.conf` to `default.conf.bak`

5. **Test Nginx configuration**:
```bash
nginx -t
```

6. **Restart Nginx node** via Jelastic dashboard

### Step 7: Start Application

1. **Configure Node.js start command**:
   - Go to Node.js node → **Config** → **Variables** → **Run Config**
   - Set: `npm start`

2. **Restart Node.js node** via Jelastic dashboard

### Step 8: Verify Deployment

1. **Access your application**:
   - URL: `http://your-env-name.jelastic.provider.com`
   - Should show the Ticketer homepage

2. **Test endpoints**:
   - Admin panel: `/admin`
   - Health check: `/api/health`
   - Events page: `/events`

3. **Check logs** if issues:
   - Node.js logs: Node.js node → **Log**
   - Nginx logs: Nginx node → **Log**
   - MySQL logs: MySQL node → **Log**

## Post-Deployment

### Add SSL/TLS (Recommended for Production)

1. Go to environment **Settings** → **SSL/TLS**
2. Select **Let's Encrypt**
3. Enter domain and email
4. Click **Install**

### Add Custom Domain

1. Go to **Settings** → **Custom Domains**
2. Add your domain (e.g., `tickets.yourdomain.com`)
3. Update DNS with provided CNAME/A record

### Configure Backups

1. Go to MySQL node → **Add-Ons** → **Backup**
2. Set schedule (e.g., daily at 2 AM)
3. Retention: 7 days recommended

### Optimize Cloudlets

After successful build and verification:

1. **Reduce Node.js cloudlets**:
   - From 32 → to 8-16
   - Monitor CPU/RAM usage
   - Adjust as needed

2. **Set auto-scaling triggers**:
   - CPU > 70% for 5 min → scale up
   - RAM > 80% for 5 min → scale up

## Troubleshooting

### Application Won't Start
```bash
# SSH to Node.js node
cd /home/jelastic/ROOT

# Check if .next folder exists
ls -la .next/

# Check environment variables
cat .env

# Try manual start
npm start
```

### Nginx 502 Bad Gateway
- Check Node.js is running: `ps aux | grep node`
- Verify internal IP in nginx config matches Node.js IP
- Check Node.js logs for errors

### Database Connection Failed
- Verify DATABASE_URL has correct credentials
- Check MySQL is running
- Test connection: `mysql -h MYSQL_IP -u ticketer -p`

### Out of Memory During Build
- Increase cloudlets to 32-48 temporarily
- Run build steps one at a time
- Monitor memory usage in dashboard

## Cost Optimization

**Development/Staging:**
- Nginx: 2-4 cloudlets
- Node.js: 8-16 cloudlets
- MySQL: 4-8 cloudlets

**Production (Light Traffic):**
- Nginx: 2-8 cloudlets
- Node.js: 8-16 cloudlets  
- MySQL: 8-16 cloudlets

**Production (High Traffic):**
- Nginx: 4-16 cloudlets
- Node.js: 16-32 cloudlets (or horizontal scaling to 2-3 nodes)
- MySQL: 16-32 cloudlets

## Updating the Application

```bash
# SSH to Node.js node
cd /home/jelastic/ROOT

# Pull latest code (if using Git)
git pull origin main

# Run update
npm cache clean --force
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma
npm run db:generate
npx prisma db push --accept-data-loss
NODE_OPTIONS="--max-old-space-size=4096" npm run build
npm prune --production

# Restart via Jelastic dashboard
```

## One-Click Installation Alternative

Use the JPS manifest for automated setup:

1. Go to Jelastic dashboard → **Import**
2. Paste URL: `https://raw.githubusercontent.com/your-username/ticketer/main/manifest.jps`
3. Click **Import**
4. Fill in database credentials
5. Click **Install**

The manifest will automatically:
- Create all 3 nodes
- Configure MySQL database
- Deploy and build application
- Configure Nginx
- Start everything

---

**Need Help?** See [JELASTIC_DEPLOYMENT.md](JELASTIC_DEPLOYMENT.md) for detailed instructions.
