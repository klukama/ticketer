# MySQL Docker Setup Guide

This guide provides additional information about the MySQL Docker setup for the Ticketer application.

## Overview

The application uses a multi-container Docker setup:
- **MySQL Container**: Runs MySQL 8.0 database
- **App Container**: Runs the Next.js application

The containers are orchestrated using Docker Compose with health checks and automatic startup order.

## Quick Start

```bash
# Start everything
docker compose up -d

# Check status
docker compose ps

# View all logs
docker compose logs -f

# Stop everything
docker compose down
```

## Architecture

```
┌─────────────────────┐
│   ticketer-app      │
│   (Next.js App)     │
│   Port: 3000        │
└──────────┬──────────┘
           │
           │ DATABASE_URL
           │ mysql://ticketer:ticketerpassword@mysql:3306/ticketer
           │
           ▼
┌─────────────────────┐
│   ticketer-mysql    │
│   (MySQL 8.0)       │
│   Port: 3306        │
└─────────────────────┘
```

## Container Startup Process

1. **MySQL Container** starts first
   - Initializes database and creates user
   - Health check runs every 10 seconds
   - Becomes "healthy" when MySQL is ready

2. **App Container** waits for MySQL health check
   - Only starts after MySQL is healthy
   - Runs database migrations (`prisma db push`)
   - Seeds the database with sample data
   - Starts the Next.js application

## Database Credentials

Default credentials (configured in `docker-compose.yml`):

```yaml
Database: ticketer
User: ticketer
Password: ticketerpassword
Root Password: rootpassword
Port: 3306
```

**⚠️ Important:** These are development credentials. Change them for production!

## Data Persistence

Database data is stored in a Docker volume named `mysql-data`. This means:
- Data persists across container restarts
- Data is preserved when you stop/start containers
- To delete all data, run: `docker compose down -v`

## Common Commands

### View Logs

```bash
# All logs
docker compose logs -f

# Only app logs
docker compose logs -f ticketer

# Only database logs
docker compose logs -f mysql
```

### Access MySQL CLI

```bash
# Connect to MySQL
docker compose exec mysql mysql -u ticketer -ptickereterpassword ticketer

# Or as root
docker compose exec mysql mysql -u root -prootpassword ticketer
```

### Rebuild After Code Changes

```bash
# Rebuild and restart app container
docker compose up -d --build ticketer

# Or rebuild everything
docker compose up -d --build
```

### Reset Database

```bash
# Stop and remove everything including volumes
docker compose down -v

# Start fresh (will recreate database and seed it)
docker compose up -d
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker compose logs ticketer
docker compose logs mysql
```

### Database Connection Error

1. Check MySQL is healthy:
```bash
docker compose ps
```

2. Verify credentials in `docker-compose.yml` match

3. Restart containers:
```bash
docker compose restart
```

### Port Already in Use

If port 3000 or 3306 is already in use, modify `docker-compose.yml`:

```yaml
ports:
  - "3001:3000"  # Change host port to 3001
```

### Slow First Startup

The first time you run `docker compose up`:
- MySQL image needs to be downloaded (~500MB)
- App image needs to be built
- Database needs to be initialized and seeded

This can take 2-5 minutes. Subsequent startups are much faster.

## Production Considerations

For production deployment:

1. **Change all passwords** in `docker-compose.yml`
2. **Use environment files** instead of hardcoded values:
   ```yaml
   env_file:
     - .env.production
   ```
3. **Use secrets management** for sensitive data
4. **Set up regular backups** of the mysql-data volume
5. **Configure resource limits**:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
   ```
6. **Use a reverse proxy** (nginx/traefik) in front of the app
7. **Enable SSL/TLS** for database connections

## Connecting from Host Machine

The MySQL port is exposed on `localhost:3306`. You can connect using:

```bash
mysql -h localhost -P 3306 -u ticketer -ptickerpassword ticketer
```

Or using a GUI tool like:
- MySQL Workbench
- DBeaver
- TablePlus

Connection details:
- Host: `localhost`
- Port: `3306`
- Database: `ticketer`
- Username: `ticketer`
- Password: `ticketerpassword`
