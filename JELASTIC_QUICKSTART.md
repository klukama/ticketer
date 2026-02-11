# Jelastic Cloud Deployment - Quick Reference

This is a quick reference guide for deploying Ticketer on Infomaniak Jelastic Cloud.

## Infrastructure Specifications

| Component | Version | Purpose |
|-----------|---------|---------|
| **Nginx** | 1.28.0 | Load Balancer / Reverse Proxy |
| **Node.js** | 25.6.0 | Application Server |
| **MySQL** | 9.6.0 | Database Server |

## Files Overview

| File | Description |
|------|-------------|
| `JELASTIC_DEPLOYMENT.md` | Complete deployment guide with step-by-step instructions |
| `nginx.conf` | Nginx configuration for the load balancer |
| `.env.jelastic` | Environment variables template for production |
| `jelastic-setup.sh` | Automated setup script for Node.js server |
| `validate-jelastic-config.sh` | Validation script to check configuration |
| `Dockerfile` | Updated to use Node.js 25 (compatible with 25.6.0) |

## Quick Setup Steps

### 1. Validate Configuration (Before Deployment)
```bash
./validate-jelastic-config.sh
```

### 2. Create Jelastic Environment
- Load Balancer: Nginx 1.28.0
- Application Server: Node.js 25.6.0 (1+ nodes)
- Database: MySQL 9.6.0

### 3. Configure Database
```sql
CREATE DATABASE ticketer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ticketer'@'%' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON ticketer.* TO 'ticketer'@'%';
FLUSH PRIVILEGES;
```

### 4. Deploy Application
**Option A: Git Deployment (Recommended)**
- URL: `https://github.com/klukama/ticketer.git`
- Branch: `main`

**Option B: Manual Upload**
- Upload archive to Node.js server

### 5. Configure Environment Variables
On Node.js node, set:
```bash
DATABASE_URL=mysql://ticketer:password@mysql-hostname:3306/ticketer
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0
```

### 6. Run Setup Script
SSH into Node.js server:
```bash
cd /home/jelastic/ROOT
bash jelastic-setup.sh
```

This will:
- Install dependencies
- Generate Prisma client
- Push database schema
- Seed database
- Build application

### 7. Configure Nginx
1. Upload `nginx.conf` to Nginx node at `/etc/nginx/nginx.conf`
2. Update `upstream nodejs_backend` with your Node.js hostname
3. Test config: `nginx -t`
4. Restart Nginx

### 8. Start Application
```bash
npm start
```

### 9. Access Application
- Via Jelastic URL: `http://env-name.jelastic.cloudhosted.com`
- Via custom domain: Configure in Jelastic settings

## Common Commands

### On Node.js Server
```bash
# Check application logs
pm2 logs

# Restart application
npm start

# View database connection
echo $DATABASE_URL

# Update application
git pull origin main
npm ci
npm run db:generate
npm run build
npm start
```

### On Nginx Server
```bash
# Test configuration
nginx -t

# Reload configuration (without restart)
nginx -s reload

# View logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### On MySQL Server
```bash
# Connect to database
mysql -u ticketer -p ticketer

# Check tables
SHOW TABLES;

# View events
SELECT * FROM Event;
```

## Environment URLs

- **Application**: `http://your-env.jelastic.cloudhosted.com`
- **Admin Panel**: `http://your-env.jelastic.cloudhosted.com/admin`
- **API Endpoint**: `http://your-env.jelastic.cloudhosted.com/api/events`

## Monitoring

### Check Application Health
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/events
```

### Resource Monitoring
- Jelastic Dashboard → Monitor tab
- Check CPU, RAM, Disk usage
- Configure auto-scaling triggers

## Scaling

### Horizontal Scaling (Multiple Node.js Nodes)
1. Jelastic Dashboard → Environment → Topology
2. Set Node.js node count (e.g., 2-3 nodes)
3. Update nginx.conf with all Node.js hostnames:
```nginx
upstream nodejs_backend {
    server node1-hostname:3000;
    server node2-hostname:3000;
    server node3-hostname:3000;
    keepalive 32;
}
```

### Vertical Scaling (More Resources)
- Increase cloudlets per node
- Reserved: 2-4 (baseline)
- Dynamic limit: 16-32 (burst capacity)

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| 502 Bad Gateway | Check Node.js is running, verify nginx upstream config |
| Database connection failed | Verify DATABASE_URL, check MySQL service |
| Build failures | Clear cache: `rm -rf .next node_modules && npm ci` |
| Port conflicts | Check PORT variable, ensure no other service on 3000 |

## Security Checklist

- [ ] Strong database password set
- [ ] SSL/TLS configured (Let's Encrypt)
- [ ] Environment variables properly configured
- [ ] Firewall rules verified
- [ ] Regular backups enabled
- [ ] Security updates scheduled
- [ ] Rate limiting configured (in nginx.conf)

## Support

- **Full Guide**: See `JELASTIC_DEPLOYMENT.md`
- **Application Issues**: GitHub repository issues
- **Jelastic Support**: Infomaniak support portal

---

**Last Updated**: For the latest information, always refer to `JELASTIC_DEPLOYMENT.md`
