# Ticketer - Event Seating System

A modern event ticketing and seat selection system built with Next.js, React, Mantine UI, TanStack Query, and Prisma.

## Tech Stack

- **Frontend**: React with Mantine UI for components and TanStack Query for state management
- **Backend**: Next.js API Routes
- **Database**: MySQL via Prisma ORM

## Features

- Browse upcoming events
- Real-time seat selection with live updates
- Interactive seat map visualization
- Seat booking system
- Responsive design with Mantine UI

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MySQL database (or use SQLite for development)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up your database connection in `.env`:
```env
DATABASE_URL="mysql://user:password@localhost:3306/ticketer"
```

For development with SQLite (no MySQL required):
```env
DATABASE_URL="file:./dev.db"
```

If using SQLite, update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

3. Push the database schema:
```bash
npm run db:push
```

4. Generate Prisma Client:
```bash
npm run db:generate
```

5. Seed the database with sample events:
```bash
npm run db:seed
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

- `/src/app` - Next.js app directory with pages and API routes
- `/src/app/api` - API routes for events and seats
- `/src/lib` - Shared utilities and Prisma client
- `/prisma` - Database schema and migrations

## API Endpoints

- `GET /api/events` - List all events
- `POST /api/events` - Create a new event
- `GET /api/events/[eventId]` - Get event details with seats
- `GET /api/events/[eventId]/seats` - Get seats for an event
- `PATCH /api/events/[eventId]/seats` - Update seat status (book/reserve)

## License

MIT
