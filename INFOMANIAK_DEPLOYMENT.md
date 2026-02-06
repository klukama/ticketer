# Deployment Guide for Infomaniak Public Cloud

This guide explains how to deploy the Ticketer application on Infomaniak Public Cloud with a managed MySQL database.

## Prerequisites

1. **Infomaniak Public Cloud Account**: Sign up at [Infomaniak Public Cloud](https://www.infomaniak.com/en/hosting/public-cloud)
2. **Infomaniak Managed MySQL Database**: Provision a database at [Infomaniak Database](https://www.infomaniak.com/en/hosting/public-cloud/database)
3. **Docker installed** on your deployment machine (for containerized deployment)
4. **Node.js 20+** (if deploying without Docker)

## Database Setup

### 1. Create Infomaniak Managed Database

1. Log in to your Infomaniak account
2. Navigate to Public Cloud Database section
3. Create a new MySQL 8.0 database instance
4. Note down the following credentials:
   - Database host (e.g., `your-db-host.infomaniak.com`)
   - Database name
   - Database username
   - Database password
   - Database port (usually 3306)

### 2. Configure Database Connection

Create a `.env` file in the project root with your Infomaniak database credentials:

```env
DATABASE_URL="mysql://username:password@your-db-host.infomaniak.com:3306/your-database-name"
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

**Security Note**: Never commit your `.env` file to version control. It's already excluded in `.gitignore`.

## Deployment Options

### Option 1: Docker Deployment (Recommended)

Docker deployment provides a consistent environment and easier management.

#### Step 1: Build the Docker Image

```bash
docker build -t ticketer:latest .
```

#### Step 2: Run the Container

```bash
docker run -d \
  --name ticketer \
  -p 3000:3000 \
  -e DATABASE_URL="mysql://username:password@your-db-host.infomaniak.com:3306/your-database-name" \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  --restart unless-stopped \
  ticketer:latest
```

Replace the `DATABASE_URL` with your actual Infomaniak database credentials.

#### Step 3: Verify Deployment

Check the container logs:
```bash
docker logs -f ticketer
```

Access the application at `http://your-server-ip:3000`

#### Health Check

The application includes a health check endpoint at `/api/health` that verifies:
- Application status
- Database connectivity

Access it at: `http://your-server-ip:3000/api/health`

Expected response when healthy:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-06T17:30:00.000Z",
  "database": "connected"
}
```

### Option 2: Direct Node.js Deployment

If you prefer to deploy without Docker:

#### Step 1: Install Dependencies

```bash
npm ci --production
```

#### Step 2: Generate Prisma Client

```bash
npm run db:generate
```

#### Step 3: Set Up Database Schema

```bash
npm run db:push
```

#### Step 4: Seed Database (Optional)

```bash
npm run db:seed
```

#### Step 5: Build the Application

```bash
npm run build
```

#### Step 6: Start the Application

```bash
npm start
```

The application will start on port 3000 by default.

### Option 3: Using Docker Compose (Development/Testing)

For testing with a local database before deploying to Infomaniak:

```bash
docker compose up -d
```

This will start both the application and a local MySQL instance. Modify `docker-compose.yml` to use your Infomaniak database instead.

## Environment Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` |
| `NODE_ENV` | Environment mode | `production` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | `3000` |
| `HOSTNAME` | Bind hostname | `0.0.0.0` |
| `NEXT_TELEMETRY_DISABLED` | Disable Next.js telemetry | `1` |

## Post-Deployment Steps

### 1. Initialize Database

The Docker entrypoint script automatically runs:
- Database schema migrations (`prisma db push`)
- Database seeding (`npm run db:seed`)

If deploying without Docker, run these manually:
```bash
npm run db:push
npm run db:seed
```

### 2. Verify Application

1. Access the application at `http://your-server-ip:3000`
2. Check the health endpoint: `http://your-server-ip:3000/api/health`
3. Access the admin panel: `http://your-server-ip:3000/admin`

### 3. Configure Reverse Proxy (Recommended)

For production, use a reverse proxy (nginx, Apache, Caddy) to:
- Handle SSL/TLS termination
- Provide a custom domain
- Improve security and performance

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Maintenance

### Application Logs

**Docker deployment:**
```bash
docker logs -f ticketer
```

**Direct deployment:**
Check your process manager logs (systemd, pm2, etc.)

### Database Backups

Infomaniak provides automated database backups. Ensure they are:
1. Enabled in your Infomaniak dashboard
2. Set to an appropriate frequency
3. Tested regularly for restore capability

### Health Monitoring

Set up monitoring for the `/api/health` endpoint to receive alerts when:
- Database connectivity is lost
- Application becomes unhealthy

Recommended monitoring tools:
- UptimeRobot
- Pingdom
- Custom monitoring scripts

### Updating the Application

1. Pull the latest code:
   ```bash
   git pull origin main
   ```

2. Rebuild and restart (Docker):
   ```bash
   docker build -t ticketer:latest .
   docker stop ticketer
   docker rm ticketer
   # Then run the docker run command again
   ```

3. Or rebuild and restart (Direct):
   ```bash
   npm ci --production
   npm run db:generate
   npm run build
   # Restart your process manager
   ```

## Scaling Considerations

### Horizontal Scaling

To run multiple instances:
1. Use a load balancer to distribute traffic
2. Ensure all instances connect to the same Infomaniak database
3. Use shared session storage if implementing authentication

### Database Connection Pooling

Prisma automatically handles connection pooling. For heavy load:
- Monitor database connection count in Infomaniak dashboard
- Adjust `connection_limit` in `DATABASE_URL` if needed:
  ```
  DATABASE_URL="mysql://user:pass@host:3306/db?connection_limit=10"
  ```

## Troubleshooting

### Database Connection Errors

1. **Verify credentials**: Double-check username, password, host, and database name
2. **Network access**: Ensure your Infomaniak Public Cloud instance can reach the database
3. **Firewall rules**: Check Infomaniak firewall settings to allow connections
4. **SSL/TLS**: If required, add SSL parameters to `DATABASE_URL`:
   ```
   DATABASE_URL="mysql://user:pass@host:3306/db?sslmode=require"
   ```

### Application Won't Start

1. Check logs for errors:
   ```bash
   docker logs ticketer
   ```
2. Verify environment variables are set correctly
3. Ensure port 3000 is not already in use

### Performance Issues

1. **Database optimization**:
   - Review slow queries in Infomaniak dashboard
   - Consider adding indexes to frequently queried fields
   
2. **Application optimization**:
   - Enable response caching
   - Optimize database queries
   - Use Infomaniak CDN for static assets

### Health Check Failing

1. Check database connectivity from the application server:
   ```bash
   docker exec -it ticketer sh
   # Inside container:
   node -e "require('@/lib/prisma').prisma.\$queryRaw\`SELECT 1\`.then(console.log)"
   ```

2. Verify Infomaniak database is running and accessible
3. Check network connectivity between app and database

## Security Best Practices

1. **Environment Variables**: Never commit sensitive data to git
2. **Database Credentials**: Use strong passwords and rotate them regularly
3. **Network Security**: Use Infomaniak's firewall to restrict database access
4. **SSL/TLS**: Enable SSL for database connections in production
5. **Updates**: Keep dependencies updated with `npm audit` and `npm update`
6. **Rate Limiting**: Implement rate limiting for API endpoints
7. **HTTPS**: Always use HTTPS in production with a reverse proxy

## Support

- **Application Issues**: Check the GitHub repository issues
- **Infomaniak Support**: Contact Infomaniak support for cloud infrastructure and database issues
- **Documentation**: Refer to Next.js, Prisma, and Docker documentation for specific features

## Quick Reference

**Application URL**: `http://your-server-ip:3000`
**Admin Panel**: `http://your-server-ip:3000/admin`
**Health Check**: `http://your-server-ip:3000/api/health`

**Database**: Infomaniak Public Cloud Database (MySQL 8.0)
**Application**: Next.js 16.x with Prisma ORM
**Runtime**: Node.js 20 Alpine Linux (Docker)
