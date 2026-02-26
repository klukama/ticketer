# Virtuozzo Application Platform Deployment Guide

Quick reference guide for deploying Ticketer on Virtuozzo Application Platform.

## Prerequisites

- Virtuozzo Application Platform account (or compatible provider like Jelastic)
- Basic understanding of PaaS deployments

## Deployment Steps

### 1. Create Environment

In your Virtuozzo dashboard:

1. Click **New Environment**
2. Add topology:
   - **Node.js** application server (18+ recommended)
   - **MySQL** database (8.0+ recommended)
3. Set environment name (e.g., `ticketer-prod`)
4. Click **Create**

### 2. Configure MySQL Database

After environment creation:

1. Access MySQL admin console or note down:
   - Database host (usually `mysql-{node-id}`)
   - Database name
   - Username
   - Password
2. Create database if not automatically created:
   ```sql
   CREATE DATABASE ticketer;
   ```

### 3. Set Environment Variables

In your Node.js node settings, add:

```env
DATABASE_URL=mysql://username:password@mysql-host:3306/ticketer
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

Replace with your actual MySQL credentials provided by the platform.

### 4. Deploy Application

Option A - Via Git:
1. In dashboard, click **Deployment Manager**
2. Add your Git repository
3. Deploy to Node.js node

Option B - Via Archive:
1. Create deployment archive: `zip -r ticketer.zip . -x "node_modules/*" ".git/*" ".next/*"`
2. Upload via **Deployment Manager**

### 5. Initialize Database

After deployment:

1. Open **Web SSH** to your Node.js node
2. Navigate to application directory (usually `/home/jelastic/ROOT`)
3. Run initialization:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

### 6. Restart Application

Restart your Node.js node to apply all changes.

### 7. Access Application

Your application will be available at:
- `https://your-env-name.provider-domain.com`

Test endpoints:
- Health: `/api/health`
- Events: `/api/events`
- Admin: `/admin`

## Post-Deployment

### Monitoring

- Use platform's built-in monitoring for Node.js metrics
- Monitor `/api/health` endpoint for application health
- Check MySQL node for database performance

### Scaling

If needed, you can:
- Add more cloudlets to Node.js node
- Enable horizontal scaling for Node.js
- Upgrade MySQL resources

### Updates

To deploy updates:
1. Push changes to Git repository (if using Git deployment)
2. Or upload new archive via Deployment Manager
3. Restart Node.js node

## Troubleshooting

**Cannot connect to database:**
- Verify `DATABASE_URL` environment variable
- Check MySQL node is running
- Verify credentials match MySQL admin console

**App connects to the wrong database name (e.g., `ticketing` instead of `ticketer`):**

This typically happens on Jelastic/Virtuozzo when the MySQL addon **automatically injects its own `DATABASE_URL`** into the Node.js app process using the database name it created (which may differ from what you intend). The value you see with `echo $DATABASE_URL` in an SSH shell reflects only the shell session, not necessarily the environment of the running app process.

To resolve this:
1. Open the Jelastic dashboard and navigate to your **Node.js node settings** (not the SSH terminal).
2. Go to **Variables** (environment variables for the app process).
3. Set `DATABASE_URL` there explicitly — e.g., `mysql://username:password@mysql-host:3306/ticketer`.
4. Restart the Node.js node.

At startup, the application logs the effective `DATABASE_URL` (with the password masked) so you can verify which URL the app is actually using:
```
Initializing Prisma Client (NODE_ENV=production, DATABASE_URL=mysql://username:***@mysql-host:3306/ticketer)
```
Check this log line to confirm the correct database name is being used.

**Application won't start:**
- Check Node.js logs in dashboard
- Verify all dependencies installed
- Ensure `npm run db:generate` was run

**Port conflicts:**
- Platform automatically handles port configuration
- Application should run on port 3000 by default

## Support

For platform-specific issues, contact your Virtuozzo provider support.
For application issues, check the main [README.md](README.md).
