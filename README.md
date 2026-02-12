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

**One-Click:** Import `manifest.jps` in Jelastic dashboard

**Manual:** See deployment instructions below

## Deployment Options

### Docker Compose

```bash
docker compose up -d
```

The docker-compose.yml includes:
- MySQL 8.0 database
- Next.js application (Node.js 25-alpine)
- Automatic database initialization

### Jelastic Cloud

Deploy on any Jelastic provider (Infomaniak, etc.) with Nginx + Node.js + MySQL architecture.

**Quick Setup:**
1. Import `manifest.jps` in Jelastic dashboard
2. Fill database credentials
3. Click Install

**Manual Setup:**
1. Create environment: Nginx (8 cloudlets) + Node.js 22.x (32 cloudlets) + MySQL 9.x (16 cloudlets)
2. Configure database and deploy application
3. Run build script on Node.js node:
   ```bash
   cd /home/jelastic/ROOT
   bash jelastic-setup.sh
   ```
4. Configure Nginx reverse proxy
5. Start application

**Important:** Reduce Node.js cloudlets from 32 to 8-16 after initial build to save costs.

See `manifest.jps` and `jelastic-setup.sh` for automated setup.

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



