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

## Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+

### Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up MySQL database:**
   
   Create a MySQL database:
   ```sql
   CREATE DATABASE ticketer;
   ```

3. **Configure environment variables:**
   
   Copy the example env file and update with your MySQL credentials:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and update the `DATABASE_URL`:
   ```env
   DATABASE_URL="mysql://root:password@localhost:3306/ticketer"
   ```

4. **Initialize database:**
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

Open http://localhost:3000

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

## Production Build

To build and run the application in production mode:

```bash
npm run build
npm start
```

## Deployment on Virtuozzo Application Platform (PaaS)

Ticketer is ready for deployment on [Virtuozzo Application Platform](https://www.virtuozzo.com/application-platform-docs/nodejs-center/) and compatible PaaS providers (Jelastic, etc.).

### Deployment Steps

1. **Create Environment:**
   - Add a **Node.js** application server (recommended: Node.js 18+)
   - Add a **MySQL** database node (recommended: MySQL 8.0+)

2. **Configure Database:**
   - The platform will automatically provide database credentials as environment variables
   - Set the `DATABASE_URL` environment variable in the format:
     ```
     mysql://user:password@host:3306/database
     ```
   - Or use individual environment variables if your platform provides them separately

3. **Deploy Application:**
   - Deploy via Git, upload archive, or use platform's deployment methods
   - The application will be automatically built during deployment

4. **Initialize Database:**
   - SSH into your Node.js node or use the platform's Web SSH
   - Navigate to your application directory (usually `/home/jelastic/ROOT` or similar)
   - Run database initialization:
     ```bash
     npm run db:generate
     npm run db:push
     npm run db:seed
     ```

5. **Access Your Application:**
   - Homepage: `https://your-env-name.provider.com`
   - Admin Panel: `https://your-env-name.provider.com/admin`
   - Health Check: `https://your-env-name.provider.com/api/health`

### Environment Variables for PaaS

The following environment variables should be configured in your PaaS environment:

```env
DATABASE_URL=mysql://user:password@mysql-node:3306/ticketer
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

### Post-Deployment

- Monitor your application using the platform's built-in monitoring tools
- Use the health check endpoint (`/api/health`) for uptime monitoring
- Scale your environment as needed based on traffic

## Troubleshooting

**Database connection errors:** Verify `DATABASE_URL` in your environment variables  
**Port in use:** Next.js will suggest alternative port  
**Build errors:** Clear `.next` folder and rebuild  
**Prisma errors:** Run `npm run db:generate` after any schema changes

## License

MIT



