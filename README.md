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
- **Database**: SQLite (default) or MySQL via Prisma ORM

## Quick Start

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

That's it! The app uses SQLite by default, so no database setup is required.

### Using MySQL (Optional)

If you want to use MySQL instead of SQLite, create a `.env` file:

```env
DATABASE_URL="mysql://user:password@localhost:3306/ticketer"
```

Then run the same commands:

```bash
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

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

## Troubleshooting

**Database connection errors:** Verify `DATABASE_URL` in `.env`  
**Port in use:** Next.js will suggest alternative port  
**Build errors:** Clear `.next` folder and rebuild

## License

MIT



