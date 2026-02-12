# Jelastic Manifest (JPS) - One-Click Deployment

This repository includes a Jelastic Packaging Standard (JPS) manifest file (`manifest.jps`) that enables **one-click deployment** of the Ticketer application on any Virtuozzo/Jelastic PaaS platform.

## What is JPS?

JPS (Jelastic Packaging Standard) is a deployment automation format used by Virtuozzo Application Platform and Jelastic Cloud providers. It allows you to:

- Deploy complex multi-tier applications with a single click
- Automatically provision infrastructure (load balancers, app servers, databases)
- Configure networking, environment variables, and dependencies
- Initialize databases and seed data
- Set up SSL/TLS certificates

## Features of This Manifest

The `manifest.jps` file in this repository provides:

✅ **Automated Infrastructure Provisioning**:
- Nginx 1.28+ load balancer with external IP
- Node.js 25+ application server(s)
- MySQL 8+ database server

✅ **Automatic Configuration**:
- Database creation and user setup
- Environment variables configuration
- Nginx reverse proxy configuration
- SSL/TLS ready (configure after deployment)

✅ **Application Setup**:
- Dependency installation
- Database schema migration
- Database seeding with sample data
- Application build and deployment

✅ **Production-Ready Settings**:
- Health check endpoint at `/api/health`
- Static asset caching
- Rate limiting
- Security headers
- Gzip compression

## How to Use

### Method 1: Import via URL (Recommended)

1. **Log in to your Jelastic/Virtuozzo dashboard**

2. **Click "Import"** or "New Environment"

3. **Enter the manifest URL**:
   ```
   https://raw.githubusercontent.com/klukama/ticketer/main/manifest.jps
   ```

4. **Configure settings**:
   - Database User (default: `ticketer`)
   - Database Password (minimum 8 characters)
   - Database Name (default: `ticketer`)

5. **Click "Install"**

6. **Wait for deployment** (typically 3-5 minutes)

7. **Access your application** at the provided URL

### Method 2: Upload Manifest File

1. **Download `manifest.jps`** from this repository

2. **Log in to your Jelastic/Virtuozzo dashboard**

3. **Click "Import"** and **upload the file**

4. **Follow steps 4-7 from Method 1**

### Method 3: Direct Installation Link

Share this installation link with users:

```
https://jelastic.com/install-application/?jps=https://raw.githubusercontent.com/klukama/ticketer/main/manifest.jps
```

Replace `jelastic.com` with your specific Jelastic provider's domain (e.g., `app.infomaniak.com`, `app.mircloud.host`, etc.).

## Post-Deployment Steps

After successful deployment:

### 1. Access Your Application

- **Main Application**: `https://your-env-name.jelastic.provider.com`
- **Admin Panel**: `https://your-env-name.jelastic.provider.com/admin`
- **Health Check**: `https://your-env-name.jelastic.provider.com/api/health`

### 2. Configure SSL/TLS (Recommended)

Enable HTTPS for production:

1. Go to **Settings → SSL/TLS** in Jelastic dashboard
2. Choose **Let's Encrypt** for free SSL
3. Enter your custom domain
4. Click **Install**

### 3. Set Up Custom Domain (Optional)

1. Go to **Settings → Custom Domains**
2. Add your domain (e.g., `tickets.yourdomain.com`)
3. Update your DNS records:
   - **CNAME**: Point to your Jelastic environment URL
   - **Or A Record**: Point to the external IP

### 4. Configure Backups

Set up automated backups:

1. Go to **Settings → Backup Storage**
2. Enable automated backups
3. Schedule: Daily backups recommended
4. Retention: 7 days minimum

### 5. Set Up Monitoring

Configure alerts:

1. Go to **Settings → Alerts**
2. Set up email notifications for:
   - High CPU usage (> 80%)
   - High memory usage (> 90%)
   - Application downtime

### 6. Enable Auto-Scaling (Optional)

For production environments:

1. Go to **Settings → Auto-Scaling**
2. Configure triggers:
   - **CPU**: Scale at > 70% for 5 minutes
   - **RAM**: Scale at > 80% for 5 minutes
3. Set scaling limits (e.g., 1-3 nodes)

## Architecture

The manifest creates the following topology:

```
┌─────────────────────────────────────────────────┐
│  Internet                                       │
└────────────────┬────────────────────────────────┘
                 │
        ┌────────▼─────────┐
        │  Nginx (1.28+)   │  ← Load Balancer
        │  External IP     │     (8 cloudlets)
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  Node.js (25+)   │  ← Application Server
        │  Port 3000       │     (16 cloudlets)
        └────────┬─────────┘
                 │
        ┌────────▼─────────┐
        │  MySQL (8+)      │  ← Database
        │  Port 3306       │     (16 cloudlets)
        └──────────────────┘
```

## Cloudlets Configuration

| Component | Reserved | Dynamic Limit |
|-----------|----------|---------------|
| Nginx     | 1        | 8             |
| Node.js   | 2        | 16            |
| MySQL     | 2        | 16            |

**Note**: 1 cloudlet = 128 MB RAM + proportional CPU. Adjust based on your expected load.

## Environment Variables

The manifest automatically configures:

```bash
DATABASE_URL=mysql://[user]:[password]@[mysql-ip]:3306/[database]
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
PORT=3000
HOSTNAME=0.0.0.0
```

## Customizing the Manifest

To modify the deployment:

1. **Fork this repository**
2. **Edit `manifest.jps`**:
   - Adjust cloudlets allocation
   - Change Node.js/MySQL versions
   - Modify environment variables
   - Add custom installation steps
3. **Commit and push changes**
4. **Use your forked repository URL** for import

### Common Customizations

**Add more Node.js nodes for high availability**:

```json
{
  "nodeType": "nodejs25",
  "cloudlets": 16,
  "count": 3,  // ← Change from 1 to 3
  ...
}
```

**Increase resources**:

```json
{
  "nodeType": "nodejs25",
  "cloudlets": 32,  // ← Increase from 16 to 32
  ...
}
```

**Use different MySQL version**:

```json
{
  "nodeType": "mysql9",  // ← Change from mysql8
  "cloudlets": 16,
  ...
}
```

## Troubleshooting

### Installation Fails

**Check**:
- Your Jelastic account has sufficient resources
- Database password meets requirements (8+ characters)
- Your provider supports the required node types

**Solution**:
- Review installation logs in Jelastic dashboard
- Check email for error notifications
- Contact Jelastic support if needed

### Application Not Accessible

**Check**:
1. Nginx is running: Dashboard → Nginx node → Statistics
2. Node.js is running: Dashboard → Node.js node → Log
3. Health endpoint: `curl http://your-env/api/health`

**Solution**:
- Restart nodes from Jelastic dashboard
- Check logs for errors
- Verify database connection

### Database Connection Issues

**Check**:
- MySQL service is running
- Database credentials are correct
- Node.js can reach MySQL (internal network)

**Solution**:
```bash
# SSH into Node.js node
mysql -h [mysql-internal-ip] -u [user] -p
```

## Security Best Practices

✅ **Use strong database passwords** (12+ characters, mixed case, numbers, symbols)
✅ **Enable SSL/TLS** immediately after deployment
✅ **Set up firewall rules** (Jelastic provides defaults)
✅ **Keep software updated** (Jelastic handles OS updates)
✅ **Regular backups** (configure automated backups)
✅ **Monitor logs** regularly for suspicious activity
✅ **Use custom domains** instead of default Jelastic URLs

## Cost Optimization

- **Start with minimal cloudlets**: Scale up as needed
- **Use reserved cloudlets**: For baseline load (cheaper)
- **Enable auto-scaling**: Only pay for resources when needed
- **Monitor resource usage**: Adjust limits based on actual usage
- **Set up alerts**: Prevent unexpected resource consumption

## Support

- **Application Issues**: [GitHub Issues](https://github.com/klukama/ticketer/issues)
- **Jelastic/Virtuozzo Issues**: Contact your hosting provider
- **Deployment Help**: See [JELASTIC_DEPLOYMENT.md](JELASTIC_DEPLOYMENT.md)

## Additional Resources

- [Jelastic Documentation](https://docs.jelastic.com/)
- [JPS Specification](https://docs.jelastic.com/jps/)
- [Virtuozzo Application Platform](https://www.virtuozzo.com/application-platform/)
- [Full Deployment Guide](JELASTIC_DEPLOYMENT.md)

## License

Same as the main application - MIT License
