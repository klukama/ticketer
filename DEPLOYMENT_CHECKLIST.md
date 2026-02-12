# Deployment Checklist

This checklist ensures a successful deployment to Jelastic/Virtuozzo Application Platform.

## Pre-Deployment Validation

### Local Validation

- [ ] **Run validation script**:
  ```bash
  bash validate-jelastic-config.sh
  ```
  
- [ ] **Verify Node.js version**: Ensure Node.js 18+ is available (25.6.0 for Jelastic)
  ```bash
  node --version
  ```

- [ ] **Install dependencies**:
  ```bash
  npm ci
  ```

- [ ] **Generate Prisma Client**:
  ```bash
  npm run db:generate
  ```

- [ ] **Run linter**:
  ```bash
  npm run lint
  ```

- [ ] **Build application**:
  ```bash
  npm run build
  ```

### Pre-Deployment Review

- [ ] **Review manifest.jps**: Ensure cloudlets allocation is appropriate
- [ ] **Review nginx.conf**: Verify upstream configuration
- [ ] **Check environment variables**: Verify .env.jelastic template is up to date
- [ ] **Review database schema**: Confirm schema.prisma is production-ready

## Deployment Methods

### Method 1: One-Click Deployment (Recommended)

- [ ] **Access Jelastic dashboard**
- [ ] **Import manifest**:
  - URL: `https://raw.githubusercontent.com/klukama/ticketer/main/manifest.jps`
- [ ] **Configure settings**:
  - Database User: `ticketer`
  - Database Password: Strong password (12+ characters)
  - Database Name: `ticketer`
- [ ] **Click "Install"**
- [ ] **Wait for deployment** (3-5 minutes)
- [ ] **Note environment URL** from success message

### Method 2: Manual Deployment

See [JELASTIC_DEPLOYMENT.md](JELASTIC_DEPLOYMENT.md) for detailed manual deployment steps.

## Post-Deployment Verification

### Health Checks

- [ ] **Test main application**:
  ```bash
  curl https://your-env.jelastic.provider.com
  ```

- [ ] **Test health endpoint**:
  ```bash
  curl https://your-env.jelastic.provider.com/api/health
  ```
  Expected response:
  ```json
  {
    "status": "healthy",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "database": "connected",
    "uptime": 123.456,
    "nodeVersion": "v25.6.0"
  }
  ```

- [ ] **Test API endpoints**:
  ```bash
  curl https://your-env.jelastic.provider.com/api/events
  ```

- [ ] **Access admin panel**:
  ```
  https://your-env.jelastic.provider.com/admin
  ```

### Database Verification

- [ ] **SSH into MySQL node**
- [ ] **Connect to database**:
  ```bash
  mysql -u ticketer -p ticketer
  ```
- [ ] **Verify tables exist**:
  ```sql
  SHOW TABLES;
  SELECT COUNT(*) FROM Event;
  SELECT COUNT(*) FROM Seat;
  SELECT COUNT(*) FROM Booking;
  ```

### Application Functionality

- [ ] **Browse events**: Verify events are displayed
- [ ] **View event details**: Click on an event
- [ ] **Check seat map**: Verify seat visualization works
- [ ] **Access admin panel**: Navigate to /admin
- [ ] **Create event** (admin): Test event creation form
- [ ] **Delete event** (admin): Test event deletion

### Performance Checks

- [ ] **Monitor resource usage**: Check CPU, RAM, disk in Jelastic dashboard
- [ ] **Check response times**: Use browser DevTools or curl -w
- [ ] **Review logs**:
  - Node.js application logs
  - Nginx access logs
  - Nginx error logs
  - MySQL logs

## Production Configuration

### Security Setup

- [ ] **Enable SSL/TLS**:
  - Settings → SSL/TLS → Let's Encrypt
  - Enter custom domain
  - Install certificate

- [ ] **Configure custom domain**:
  - Settings → Custom Domains
  - Add domain (e.g., tickets.yourdomain.com)
  - Update DNS records

- [ ] **Review firewall rules**: Verify Jelastic default rules are appropriate

- [ ] **Rotate default passwords**: Change MySQL root password if needed

- [ ] **Review nginx security headers**: Verify headers in nginx.conf are applied

### Backup Configuration

- [ ] **Enable automated backups**:
  - Settings → Backup Storage
  - Schedule: Daily
  - Retention: 7-14 days

- [ ] **Test backup restoration**: Perform a test restore to verify backups work

### Monitoring & Alerts

- [ ] **Configure email alerts**:
  - Settings → Alerts
  - CPU > 80% for 5 minutes
  - RAM > 90% for 5 minutes
  - Disk > 85%
  - Application downtime

- [ ] **Set up uptime monitoring**:
  - Use external service (e.g., UptimeRobot, Pingdom)
  - Monitor: https://your-domain.com/api/health

- [ ] **Enable Jelastic monitoring**: Review built-in metrics

### Scaling Configuration

- [ ] **Configure auto-scaling** (if needed):
  - Settings → Auto-Scaling
  - CPU trigger: > 70% for 5 minutes
  - RAM trigger: > 80% for 5 minutes
  - Scale up/down limits

- [ ] **Test horizontal scaling** (if enabled):
  - Manually scale to 2-3 Node.js nodes
  - Verify nginx load balances correctly
  - Check session persistence

### Optimization

- [ ] **Enable Gzip compression**: Verify in nginx.conf
- [ ] **Configure static asset caching**: Check Cache-Control headers
- [ ] **Review database indexes**: Ensure optimal query performance
- [ ] **Set up CDN** (optional): For static assets

## Troubleshooting

### Common Issues

| Issue | Check | Solution |
|-------|-------|----------|
| 502 Bad Gateway | Node.js running? | Restart Node.js nodes |
| Database error | MySQL accessible? | Verify DATABASE_URL |
| Slow performance | Resource usage? | Increase cloudlets |
| Build fails | Dependencies installed? | Run npm ci again |
| Health check fails | Database connected? | Check MySQL service |

### Log Locations

- **Node.js logs**: Jelastic Dashboard → Node.js node → Log
- **Nginx access**: `/var/log/nginx/access.log`
- **Nginx error**: `/var/log/nginx/error.log`
- **MySQL logs**: Jelastic Dashboard → MySQL node → Log

### SSH Access

```bash
# SSH into nodes
ssh [node-id]@[provider-domain]

# Check running processes
ps aux | grep node
ps aux | grep nginx
ps aux | grep mysql

# Check ports
netstat -tlnp | grep :3000
netstat -tlnp | grep :80
netstat -tlnp | grep :3306
```

## Rollback Procedure

If deployment fails or issues arise:

- [ ] **Restore from backup**: Settings → Backup Storage → Restore
- [ ] **Redeploy previous version**: Via Git or archive upload
- [ ] **Check logs for errors**: Review all logs before retry
- [ ] **Contact support**: If issue persists, contact Jelastic support

## Final Checklist

Before marking deployment as complete:

- [ ] Application is accessible via HTTPS
- [ ] Health endpoint returns healthy status
- [ ] All core features work (browse, view, book, admin)
- [ ] SSL/TLS is configured and working
- [ ] Custom domain is configured (if applicable)
- [ ] Backups are enabled and tested
- [ ] Monitoring and alerts are configured
- [ ] Documentation is updated with environment details
- [ ] Stakeholders are notified of deployment
- [ ] Post-deployment review meeting scheduled

## Post-Deployment Monitoring (First 24 Hours)

- [ ] **Hour 1**: Check logs for errors
- [ ] **Hour 4**: Review resource usage trends
- [ ] **Hour 8**: Verify backups are running
- [ ] **Hour 24**: Full functionality test
- [ ] **Day 7**: Performance review and optimization

## Documentation Updates

- [ ] **Update README**: Add production URL
- [ ] **Document credentials**: Securely store all passwords
- [ ] **Create runbook**: Document common operations
- [ ] **Share with team**: Ensure all team members have access

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Environment URL**: _______________
**Notes**: _______________
