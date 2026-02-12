# Ticketer - Event Seating System

A modern event ticketing and seat selection system built with Next.js, React, Mantine UI, TanStack Query, and Prisma.

## Features

- Browse upcoming events
- Real-time seat selection with live updates
- Interactive seat map visualization
- Seat booking system
- Admin panel for event management
- Responsive design

## Tech Stack

- **Frontend**: React 19, Mantine UI, TanStack Query
- **Backend**: Next.js 16 API Routes
- **Database**: MySQL via Prisma ORM
- **Deployment**: Docker, Jelastic Cloud

## Quick Start

### Local Development (SQLite)

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

### Local Development (MySQL)

Create `.env`:
```env
DATABASE_URL="mysql://user:password@localhost:3306/ticketer"
```

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

### Docker Deployment

```bash
docker compose up
```

Access at http://localhost:3000

### Jelastic Cloud Deployment

Deploy Ticketer with one click to any [Jelastic PaaS](https://jelastic.cloud/) provider.

#### Automatic Installation

Click the **Deploy to Jelastic** button, specify your email address, choose one of the [Jelastic Public Cloud providers](https://jelastic.cloud/) and press **Install**.

[![Deploy](https://github.com/jelastic-jps/git-push-deploy/raw/master/images/deploy-to-jelastic.png)](https://jelastic.com/install-application/?jps=https://raw.githubusercontent.com/klukama/ticketer/main/manifest.jps)

The deployment will automatically:
- Create an Nginx load balancer (8 cloudlets)
- Set up Node.js 22.x application server (32 cloudlets)
- Configure MySQL 9.x database (16 cloudlets)
- Install all dependencies and build the application
- Configure Nginx reverse proxy
- Initialize database with sample events

**Note:** You'll be prompted to set a database password during installation.

#### Manual Installation

If you prefer manual setup or need custom configuration:

1. **Import Manifest**
   - Go to Jelastic Dashboard → Import
   - Upload or link to `manifest.jps`
   - Configure database credentials
   - Click Install

2. **Manual Setup** (Alternative)
   - Create environment: Nginx (8 cloudlets) + Node.js 22.x (32 cloudlets) + MySQL 9.x (16 cloudlets)
   - Configure database and deploy application
   - SSH to Node.js node and run:
     ```bash
     cd /home/jelastic/ROOT
     bash jelastic-setup.sh
     ```
   - Configure Nginx reverse proxy
   - Start application

**Post-Deployment Optimization:**
After successful installation, reduce Node.js cloudlets from 32 to 8-16 to optimize costs while maintaining performance.

**Access Your Application:**
- Homepage: `https://your-env-name.jelastic.provider.com`
- Admin Panel: `https://your-env-name.jelastic.provider.com/admin`
- Health Check: `https://your-env-name.jelastic.provider.com/api/health`

**📖 For detailed Jelastic deployment guide, see [JELASTIC_HOSTING.md](JELASTIC_HOSTING.md)**

See `manifest.jps` and `jelastic-setup.sh` for deployment automation details.

## Deployment Options

### Docker Compose

```bash
docker compose up -d
```

The docker-compose.yml includes:
- MySQL 8.0 database
- Next.js application with automatic initialization
- Health checks and automatic restarts

Access at http://localhost:3000

## Admin Panel

Access at `/admin` to manage events:
- Create/edit/delete events
- View bookings
- Track seat availability

## API Endpoints

### Events
- `GET /api/events` - List all events
- `POST /api/events` - Create event
- `GET /api/events/[id]` - Get event with seats
- `PATCH /api/events/[id]` - Update event
- `DELETE /api/events/[id]` - Delete event
- `PATCH /api/events/[id]/seats` - Update seat status

### Health
- `GET /api/health` - Health check

## Project Structure

```
src/
  app/
    api/          # API routes
    admin/        # Admin panel
    events/       # Event pages
  lib/            # Utilities, Prisma client
prisma/
  schema.prisma   # Database schema
  seed.ts         # Seed data
```

## Troubleshooting

**Database connection errors:** Verify `DATABASE_URL` in `.env`  
**Port in use:** Next.js will suggest alternative port  
**Build errors:** Clear `.next` folder and rebuild  
**OOM during Jelastic build:** Increase cloudlets to 32-48 temporarily

## License

MIT



