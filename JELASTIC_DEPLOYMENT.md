# Deployment Guide for Infomaniak Jelastic Cloud

This guide walks you through deploying the Ticketer application on Infomaniak Jelastic Cloud with the following infrastructure:
- **Load Balancer**: Nginx 1.28.0
- **Application Server**: Node.js 25.6.0
- **Database**: MySQL 9.6.0

## Architecture Overview

```
Internet → Nginx Load Balancer (1.28.0) → Node.js App Server (25.6.0) → MySQL Database (9.6.0)
```

## Prerequisites

1. Infomaniak Jelastic Cloud account
2. Access to Jelastic dashboard
3. Basic knowledge of environment management in Jelastic

## Step 1: Create the Environment in Jelastic

### 1.1 Create New Environment

1. Log in to your Infomaniak Jelastic dashboard
2. Click **"New Environment"**
3. Configure the topology:

#### Load Balancer Layer
- **Type**: Nginx
- **Version**: 1.28.0
- **Cloudlets**: 
  - Reserved: 1-2 (adjust based on expected traffic)
  - Scaling limit: 8-16 (for auto-scaling under load)
- **Public IP**: Enable (required for external access)

#### Application Server Layer
- **Type**: Node.js
- **Version**: 25.6.0
- **Cloudlets**:
  - Reserved: 2-4 (recommended minimum)
  - Scaling limit: 16-32 (adjust based on expected load)
- **Horizontal Scaling**: Optional (add more nodes for high availability)
  - Start with 1 node
  - Can scale up to 3-5 nodes for production

#### Database Layer
- **Type**: MySQL
- **Version**: 9.6.0
- **Cloudlets**:
  - Reserved: 2-4
  - Scaling limit: 16-32
- **Storage**: 10GB minimum (adjust based on expected data volume)

4. **Environment Name**: Choose a meaningful name (e.g., `ticketer-prod`)
5. Click **"Create"**

## Step 2: Configure MySQL Database

### 2.1 Access MySQL Admin Panel

1. In Jelastic dashboard, click on **MySQL node** → **Open in Browser** → **phpMyAdmin**
2. Or use the database credentials from Jelastic environment variables

### 2.2 Create Database and User

```sql
-- Create database
CREATE DATABASE ticketer CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (if not using default Jelastic user)
CREATE USER 'ticketer'@'%' IDENTIFIED BY 'your_secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON ticketer.* TO 'ticketer'@'%';
FLUSH PRIVILEGES;
```

### 2.3 Note Database Connection Details

You'll need:
- **Host**: Internal hostname (e.g., `mysql-ticketer-prod.jelastic.cloudhosted.com` or internal IP)
- **Port**: 3306 (default)
- **Database**: `ticketer`
- **Username**: Your database username
- **Password**: Your database password

**Security Note**: Use strong passwords in production. Jelastic provides secure internal networking between nodes.

## Step 3: Configure Node.js Application

### 3.1 Deploy Application Code

**Option A: Deploy from Git (Recommended)**

1. In Jelastic dashboard, select your **Node.js node**
2. Click **"Git/SVN"** button
3. Configure:
   - **URL**: `https://github.com/klukama/ticketer.git`
   - **Branch**: `main` (or your production branch)
   - **Deploy on commit**: Enable for auto-deployment
4. Click **"Add"**

**Option B: Deploy via Archive**

1. Create a deployment archive:
   ```bash
   # On your local machine
   git clone https://github.com/klukama/ticketer.git
   cd ticketer
   tar -czf ticketer.tar.gz --exclude=node_modules --exclude=.git .
   ```
2. Upload via Jelastic dashboard → Node.js → **Deployment Manager** → **Upload**

### 3.2 Configure Environment Variables

1. In Jelastic dashboard, click on **Node.js node** → **Configuration** → **Variables**
2. Add the following environment variables:

```bash
# Database Configuration
DATABASE_URL=mysql://ticketer:your_password@mysql-node-hostname:3306/ticketer

# Node.js Environment
NODE_ENV=production

# Next.js Configuration
NEXT_TELEMETRY_DISABLED=1

# Port Configuration (Jelastic typically uses 8080 or as configured)
PORT=3000
HOSTNAME=0.0.0.0
```

**Important**: Replace the DATABASE_URL with your actual database credentials:
- `ticketer` → your database username
- `your_password` → your database password
- `mysql-node-hostname` → your MySQL node's internal hostname (found in Jelastic dashboard)

### 3.3 Install Dependencies and Build

**IMPORTANT**: Ensure your Node.js node has at least **8 cloudlets (4 GB RAM)** allocated before running these commands.

SSH into your Node.js node or use Jelastic Web SSH:

```bash
# Navigate to application directory
cd /home/jelastic/ROOT

# Clear npm cache to free memory
npm cache clean --force

# Step 1: Install production dependencies first (uses less memory)
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev

# Step 2: Install only the dev dependencies needed for build
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma

# Step 3: Generate Prisma client
npm run db:generate

# Step 4: Push database schema (creates tables)
npx prisma db push --accept-data-loss

# Step 5: Seed database with initial data
npm run db:seed || echo "Seeding skipped or failed"

# Step 6: Build Next.js application with increased memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Step 7: Remove dev dependencies to save space (optional but recommended)
npm prune --production
```

**Troubleshooting OOM (Out of Memory) Errors**:
- If you get "Killed" during npm install, increase cloudlets temporarily to 16-32
- After successful build, you can reduce cloudlets back to 8-16 for runtime
- Monitor memory usage in Jelastic dashboard during build

### 3.4 Configure Application Start Script

1. Go to **Node.js node** → **Configuration** → **Scripts**
2. In the **Start Command**, set:

```bash
npm start
```

Or if you prefer using the standalone server:

```bash
node .next/standalone/server.js
```

### 3.5 Restart Node.js Server

Click **"Restart Nodes"** on the Node.js layer to apply changes.

## Step 4: Configure Nginx Load Balancer

### 4.1 Get Your Node.js Internal Address

First, find your Node.js node's internal address:
1. In Jelastic dashboard, click on your **Node.js node**
2. Look for the **Internal IP** or **Internal Hostname** (e.g., `node123456-env-name.jelastic.internal` or `192.168.x.x`)
3. Note this down - you'll need it in the next step

### 4.2 Configure Nginx

**Option A: Use Jelastic Web Interface (Recommended)**

1. In Jelastic dashboard, click on **Nginx node** → **Config**
2. Navigate to `/etc/nginx/conf.d/` folder
3. Create a new file called `ticketer.conf`
4. Paste the following configuration, **replacing `YOUR_NODEJS_INTERNAL_IP` with the IP from Step 4.1**:

```nginx
upstream nodejs_backend {
    server YOUR_NODEJS_INTERNAL_IP:3000 max_fails=3 fail_timeout=30s;
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

    # Cache static assets from Next.js
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

5. Save the file
6. **Important**: Remove or rename the default nginx config to avoid conflicts:
   - In `/etc/nginx/conf.d/`, rename `default.conf` to `default.conf.bak`

**Option B: Use SSH**

```bash
# SSH into Nginx node
cat > /etc/nginx/conf.d/ticketer.conf << 'EOF'
upstream nodejs_backend {
    server YOUR_NODEJS_INTERNAL_IP:3000 max_fails=3 fail_timeout=30s;
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
EOF

# Disable default config
mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.bak
```

**Remember**: Replace `YOUR_NODEJS_INTERNAL_IP` with your actual Node.js internal IP!

### 4.2 Test Nginx Configuration

SSH into Nginx node:

```bash
nginx -t
```

If successful, you should see:
```
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 4.3 Restart Nginx

Click **"Restart Nodes"** on the Nginx layer.

## Step 5: Configure Domain and SSL (Optional but Recommended)

### 5.1 Add Custom Domain

1. In Jelastic dashboard, go to **Settings** → **Custom Domains**
2. Add your domain (e.g., `ticketer.yourdomain.com`)
3. Update your DNS provider with the CNAME or A record pointing to your Jelastic environment

### 5.2 Enable SSL/TLS

Jelastic provides Let's Encrypt integration:

1. Go to **Settings** → **SSL/TLS**
2. Select **Let's Encrypt**
3. Enter your domain and email
4. Click **"Install"**

Alternatively, upload your own SSL certificate.

### 5.3 Update Nginx for HTTPS

If using SSL, uncomment and configure the HTTPS server block in `nginx.conf`.

## Step 6: Verification and Testing

### 6.1 Access the Application

1. **Via Environment URL**: 
   - `http://your-env-name.jelastic.cloudhosted.com`
2. **Via Custom Domain** (if configured):
   - `https://ticketer.yourdomain.com`

### 6.2 Test Core Functionality

1. **Homepage**: Should load and display events
2. **Admin Panel**: Access at `/admin`
3. **API Endpoints**: Test creating/viewing events
4. **Database Connection**: Verify data persists across restarts

### 6.3 Check Logs

Monitor application logs:
- **Node.js logs**: Jelastic dashboard → Node.js node → **Log**
- **Nginx logs**: Jelastic dashboard → Nginx node → **Log**
- **MySQL logs**: Jelastic dashboard → MySQL node → **Log**

## Step 7: Production Best Practices

### 7.1 Environment Variables Security

- Store sensitive credentials in Jelastic environment variables
- Never commit `.env` files with production credentials to Git
- Rotate database passwords regularly

### 7.2 Backup Strategy

1. **Database Backups**:
   - Configure automated MySQL backups in Jelastic
   - Recommended: Daily backups with 7-day retention
   
2. **Application Backups**:
   - Use Git for version control
   - Tag releases for easy rollback

### 7.3 Monitoring

Set up monitoring in Jelastic:
- CPU and Memory usage alerts
- Disk space alerts
- Application uptime monitoring
- Enable Jelastic built-in monitoring tools

### 7.4 Auto-Scaling Configuration

Configure auto-scaling triggers:
- **CPU**: Scale up when > 70% for 5 minutes
- **RAM**: Scale up when > 80% for 5 minutes
- **Requests**: Configure based on your traffic patterns

### 7.5 Database Optimization

For MySQL 9.6.0, consider:
```sql
-- Optimize tables regularly
OPTIMIZE TABLE Event, Seat, Booking;

-- Add indexes if needed (already defined in schema)
SHOW INDEX FROM Event;
SHOW INDEX FROM Seat;
SHOW INDEX FROM Booking;
```

## Troubleshooting

### Issue: Application Not Starting

**Check**:
1. Node.js logs for errors
2. Verify `DATABASE_URL` is correct
3. Ensure Prisma client is generated: `npm run db:generate`
4. Verify database is accessible: `mysql -h hostname -u username -p`

### Issue: Nginx 502 Bad Gateway

**Check**:
1. Node.js application is running: `ps aux | grep node`
2. Nginx upstream configuration points to correct Node.js hostname
3. Port 3000 is accessible from Nginx node
4. Check firewall rules in Jelastic

### Issue: Database Connection Failed

**Check**:
1. MySQL service is running
2. Database credentials are correct
3. Database `ticketer` exists
4. User has proper permissions
5. Internal network connectivity between nodes

### Issue: Slow Performance

**Optimize**:
1. Increase cloudlets for Node.js and MySQL
2. Enable horizontal scaling for Node.js
3. Configure MySQL query cache
4. Review Nginx access logs for high traffic endpoints
5. Implement caching strategy (Redis/Memcached)

## Updating the Application

### Via Git Deployment

If you configured Git deployment:
1. Push changes to your repository
2. Jelastic will auto-deploy (if enabled)
3. Or manually pull in Jelastic dashboard → **Update from Git**

### Manual Update Process

```bash
# SSH into Node.js node
cd /home/jelastic/ROOT

# Pull latest changes (if using Git)
git pull origin main

# Clear cache
npm cache clean --force

# Install production dependencies
NODE_OPTIONS="--max-old-space-size=4096" npm ci --omit=dev

# Install build dependencies
npm install --save-dev typescript @types/node @types/react @types/react-dom esbuild tsx prisma

# Regenerate Prisma client (if schema changed)
npm run db:generate

# Run migrations (if needed)
npx prisma db push --accept-data-loss

# Rebuild application
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Clean up
npm prune --production

# Restart application via Jelastic dashboard or:
pm2 restart all
# Or use Jelastic dashboard to restart Node.js nodes
```

## Cost Optimization

1. **Right-size cloudlets**: Start small, monitor, and adjust
2. **Use reserved cloudlets**: For baseline load (cheaper than dynamic)
3. **Auto-scaling**: Set appropriate limits to avoid unexpected costs
4. **Monitoring**: Regularly review resource usage
5. **Vertical vs Horizontal scaling**: Choose based on your needs

## Support and Resources

- **Infomaniak Jelastic Docs**: [https://www.infomaniak.com/en/support/faq](https://www.infomaniak.com/en/support/faq)
- **Jelastic Documentation**: [https://docs.jelastic.com/](https://docs.jelastic.com/)
- **Application Issues**: Create an issue in the GitHub repository

## Security Checklist

- [ ] Strong database passwords configured
- [ ] Environment variables properly set (not in code)
- [ ] SSL/TLS enabled for production
- [ ] Firewall rules configured (Jelastic default is good)
- [ ] Regular security updates scheduled
- [ ] Backup strategy implemented
- [ ] Monitoring and alerts configured
- [ ] Rate limiting enabled (via nginx.conf)
- [ ] Security headers configured (via nginx.conf)
- [ ] Database user has minimal required permissions

## Next Steps

After successful deployment:

1. Set up monitoring and alerts
2. Configure automated backups
3. Implement CI/CD pipeline for automated deployments
4. Consider adding Redis for session management and caching
5. Set up log aggregation for better debugging
6. Implement application performance monitoring (APM)

---

For questions or issues specific to this deployment, please refer to the main README.md or create an issue in the repository.
