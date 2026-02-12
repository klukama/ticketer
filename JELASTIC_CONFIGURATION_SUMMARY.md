# Jelastic Deployment Configuration Summary

## What Was Configured

Your Ticketer application is now properly configured for deployment on **Jelastic Cloud with a 3-node setup**:

1. ✅ **Nginx Load Balancer** - Receives traffic and forwards to Node.js
2. ✅ **Node.js Application Server** - Runs Next.js application
3. ✅ **MySQL Database** - Stores event and booking data

---

## Files Updated/Created

### New Files
1. **`.gitattributes`** - Ensures shell scripts use Unix (LF) line endings
2. **`JELASTIC_3NODE_SETUP.md`** - Step-by-step guide for your 3-node setup
3. **`DOCKER_FIXES.md`** - Documents Docker-related fixes

### Updated Files
1. **`manifest.jps`** - JPS manifest for one-click Jelastic installation
   - Updated to Node.js 22.x LTS (more stable than 25.x)
   - Updated to MySQL 9.x
   - Fixed memory issues with optimized build process
   - Increased cloudlets to 32 for build process

2. **`JELASTIC_DEPLOYMENT.md`** - Complete deployment guide
   - Updated Node.js version to 22.x LTS
   - Updated MySQL version to 9.x
   - Added memory-optimized build steps
   - Increased recommended cloudlets to avoid OOM kills
   - Simplified nginx configuration instructions

3. **`JELASTIC_QUICKSTART.md`** - Quick reference guide
   - Updated version numbers
   - Added cloudlet requirements
   - Updated build commands with memory optimization

4. **`jelastic-setup.sh`** - Automated setup script
   - Added memory optimization flags
   - Split dependency installation (prod first, then dev)
   - Added cleanup step to remove dev dependencies after build

5. **`docker-entrypoint.sh`** - Docker startup script
   - Removed deprecated `--skip-generate` flag
   - Changed to use compiled `seed.js` instead of `tsx`
   - Added `--accept-data-loss` flag for Prisma

6. **`Dockerfile`** - Docker image configuration
   - Added esbuild compilation for seed.ts → seed.js
   - Optimized file copying

7. **`package.json`** - Node.js dependencies
   - Added `esbuild` for TypeScript compilation

---

## Key Configuration Details

### Memory Requirements

| Phase | Cloudlets | RAM | Why |
|-------|-----------|-----|-----|
| **Build** | 32 | 16 GB | Next.js build is memory-intensive |
| **Runtime** | 8-16 | 4-8 GB | Sufficient for normal operation |

**Important**: Start with 32 cloudlets for initial build, then reduce to 8-16 for runtime to save costs.

### Node Specifications

```yaml
Nginx Load Balancer:
  Version: 1.28.x
  Cloudlets: 8 (can scale 2-8)
  Public IP: YES
  Role: Reverse proxy, SSL termination, load balancing

Node.js Application:
  Version: 22.x LTS
  Cloudlets: 32 (build) / 8-16 (runtime)
  Public IP: NO
  Role: Next.js application server
  Port: 3000

MySQL Database:
  Version: 9.x
  Cloudlets: 16 (can scale 4-16)
  Storage: 10GB+
  Public IP: NO
  Role: Data persistence
  Port: 3306
```

### Internal Communication

```
Nginx (public IP) ─┬─> Node.js (internal IP:3000)
                   └─> Node.js ─> MySQL (internal IP:3306)
```

All communication between nodes uses **internal IPs** (no internet traffic, faster and more secure).

---

## Deployment Options

### Option 1: One-Click Installation (Easiest)

1. Go to Jelastic dashboard → **Import**
2. URL: `https://raw.githubusercontent.com/YOUR_USERNAME/ticketer/main/manifest.jps`
3. Click **Import** → Fill database credentials → **Install**

**What it does automatically:**
- Creates all 3 nodes
- Configures MySQL database and user
- Deploys application code
- Installs dependencies and builds
- Configures Nginx
- Starts everything

### Option 2: Manual Setup (More Control)

Follow **`JELASTIC_3NODE_SETUP.md`** for detailed step-by-step instructions.

### Option 3: Automated Script

1. Create environment manually in Jelastic
2. Deploy code to Node.js node
3. SSH and run: `bash jelastic-setup.sh`

---

## Important Environment Variables

Set these in Node.js node → **Config** → **Variables**:

```bash
# Required
DATABASE_URL=mysql://ticketer:PASSWORD@MYSQL_IP:3306/ticketer
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0

# Optional but recommended
NEXT_TELEMETRY_DISABLED=1
```

**Replace:**
- `PASSWORD` - Your MySQL password
- `MYSQL_IP` - Your MySQL node's internal IP (find in Jelastic dashboard)

---

## Nginx Configuration

Create `/etc/nginx/conf.d/ticketer.conf` on Nginx node:

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

**Replace `NODEJS_INTERNAL_IP`** with your Node.js node's internal IP.

**Don't forget:** Disable default config by renaming `default.conf` to `default.conf.bak`

---

## Build Process (Optimized for Memory)

The build process is now optimized to avoid "Killed" errors:

```bash
# 1. Clean cache
npm cache clean --force

# 2. Install production deps first (lighter)
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev

# 3. Add only build tools
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma

# 4. Generate Prisma client
npm run db:generate

# 5. Push schema to database
npx prisma db push --accept-data-loss

# 6. Seed database
npm run db:seed || echo "Skipped"

# 7. Build Next.js (with 4GB memory limit)
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 8. Remove build tools to save space
npm prune --production
```

This approach:
- ✅ Uses less memory than `npm ci --include=dev`
- ✅ Installs only what's needed
- ✅ Cleans up after build
- ✅ Avoids OOM (Out of Memory) kills

---

## Post-Deployment Checklist

After deployment, complete these tasks:

### Security
- [ ] Set strong MySQL password (min 12 chars)
- [ ] Enable SSL/TLS (Let's Encrypt via Jelastic)
- [ ] Configure firewall rules (Jelastic default is secure)
- [ ] Verify environment variables are not exposed

### Performance
- [ ] Reduce Node.js cloudlets from 32 to 8-16 after build
- [ ] Set up auto-scaling triggers (CPU > 70%, RAM > 80%)
- [ ] Monitor resource usage in first 24-48 hours
- [ ] Adjust cloudlets based on actual usage

### Reliability
- [ ] Configure MySQL automated backups (daily, 7-day retention)
- [ ] Test application restart (ensure it auto-starts)
- [ ] Set up monitoring alerts (CPU, RAM, disk, uptime)
- [ ] Test health endpoint: `/api/health`

### Custom Domain (Optional)
- [ ] Add custom domain in Jelastic settings
- [ ] Update DNS records (CNAME or A record)
- [ ] Install SSL certificate for custom domain
- [ ] Update nginx server_name if needed

---

## Troubleshooting Common Issues

### Issue: "Killed" during npm install
**Cause:** Out of memory  
**Fix:** Increase cloudlets to 32-48 temporarily, retry, then reduce after build

### Issue: Nginx 502 Bad Gateway
**Cause:** Node.js not running or wrong internal IP  
**Fix:** 
1. Check Node.js is running: `ps aux | grep node`
2. Verify nginx upstream uses correct Node.js internal IP
3. Restart both nginx and Node.js nodes

### Issue: Database connection failed
**Cause:** Wrong credentials or MySQL not accessible  
**Fix:**
1. Check DATABASE_URL in Node.js environment variables
2. Verify MySQL internal IP is correct
3. Test: `mysql -h MYSQL_IP -u ticketer -p`
4. Check MySQL is running

### Issue: Application builds but doesn't start
**Cause:** Missing standalone server or wrong start command  
**Fix:**
1. Verify `next.config.ts` has `output: 'standalone'`
2. Check start command is `npm start`
3. Look for errors in Node.js logs

---

## Cost Estimation

### Development/Testing
- **Total**: ~20 cloudlets = ~$5-10/month
  - Nginx: 4 cloudlets
  - Node.js: 8 cloudlets
  - MySQL: 8 cloudlets

### Production (Low Traffic)
- **Total**: ~30 cloudlets = ~$15-20/month
  - Nginx: 6 cloudlets
  - Node.js: 12 cloudlets
  - MySQL: 12 cloudlets

### Production (High Traffic)
- **Total**: ~50-80 cloudlets = ~$30-50/month
  - Nginx: 8-16 cloudlets
  - Node.js: 24-32 cloudlets (or 2 nodes @ 16 each)
  - MySQL: 16-32 cloudlets

*Prices vary by provider. Check your Jelastic provider's pricing.*

---

## Quick Reference Commands

### SSH to Node.js Node
```bash
# Check logs
pm2 logs

# Restart app
pm2 restart all

# Check memory
free -h

# Check disk
df -h
```

### SSH to Nginx Node
```bash
# Test config
nginx -t

# Reload config
nginx -s reload

# Check logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### SSH to MySQL Node
```bash
# Connect to database
mysql -u ticketer -p ticketer

# Show tables
SHOW TABLES;

# Check database size
SELECT table_schema AS "Database", 
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS "Size (MB)" 
FROM information_schema.TABLES 
WHERE table_schema = "ticketer";
```

---

## Support Resources

- **Detailed Guide**: See `JELASTIC_3NODE_SETUP.md`
- **Quick Reference**: See `JELASTIC_QUICKSTART.md`
- **Full Documentation**: See `JELASTIC_DEPLOYMENT.md`
- **Docker Issues**: See `DOCKER_FIXES.md`

---

## Next Steps

1. **Review** `JELASTIC_3NODE_SETUP.md` for step-by-step deployment
2. **Choose** deployment method (one-click vs manual)
3. **Deploy** following the guide
4. **Test** application thoroughly
5. **Configure** SSL, backups, and monitoring
6. **Optimize** cloudlet allocation based on actual usage
7. **Monitor** for 48 hours and adjust as needed

**Ready to deploy?** Start with `JELASTIC_3NODE_SETUP.md`! 🚀
