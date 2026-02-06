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
- **Admin panel** for event management
- Responsive design with Mantine UI

## Production Deployment

For deploying to Infomaniak Public Cloud with a managed MySQL database, see the [Infomaniak Deployment Guide](./INFOMANIAK_DEPLOYMENT.md).

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MySQL database (for production) or SQLite (for local development)
- Docker and Docker Compose (for containerized deployment)

### Local Development Setup

#### Option 1: Using SQLite (Simpler for Development)

1. Install dependencies:
```bash
npm install
```

2. Update `prisma/schema.prisma` to use SQLite:
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

3. Create a `.env` file:
```env
DATABASE_URL="file:./dev.db"
```

4. Push the database schema:
```bash
npm run db:push
```

5. Generate Prisma Client:
```bash
npm run db:generate
```

6. Seed the database:
```bash
npm run db:seed
```

#### Option 2: Using MySQL (Production-like)

1. Install dependencies:
```bash
npm install
```

2. Set up your database connection in `.env`:
```env
DATABASE_URL="mysql://user:password@localhost:3306/ticketer"
```

Note: `prisma/schema.prisma` is already configured for MySQL.

3. Push the database schema:
```bash
npm run db:push
```

4. Generate Prisma Client:
```bash
npm run db:generate
```

5. Seed the database:
```bash
npm run db:seed
```

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Admin Panel

Access the admin panel at [http://localhost:3000/admin](http://localhost:3000/admin) to:
- Create new events
- Edit existing events
- Delete events
- View bookings for each event
- Track seat availability

The admin panel is accessible via the "Admin Panel" button on the home page or by navigating directly to `/admin`.

### Building for Production

```bash
npm run build
npm start
```

## Docker Deployment

The application is fully containerized and can be run using Docker with MySQL.

### Using Docker Compose (Recommended)

The easiest way to run the application with MySQL:

```bash
# Build and start all containers (MySQL + App)
docker compose up -d

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f ticketer
docker compose logs -f mysql

# Stop and remove all containers
docker compose down

# Stop and remove all containers including volumes (this will delete the database)
docker compose down -v
```

The application will be available at [http://localhost:3000](http://localhost:3000).

**Note:** The first time you run `docker compose up`, it will:
1. Start the MySQL container and wait for it to be healthy
2. Build the application container
3. Run database migrations automatically
4. Seed the database with sample events

### Docker Configuration

- The Dockerfile uses a multi-stage build for optimized image size
- **MySQL 8.0** is used as the database and runs in a separate container
- Database data persists in a Docker volume named `mysql-data`
- The application waits for MySQL to be healthy before starting
- Database migrations and seeding run automatically on container startup
- Environment variables are configured in `docker-compose.yml`
- The application runs on port 3000, MySQL on port 3306

### MySQL Credentials (Docker)

Default credentials configured in `docker-compose.yml`:
- **Host:** localhost (or `mysql` from within the app container)
- **Port:** 3306
- **Database:** ticketer
- **User:** ticketer
- **Password:** ticketerpassword
- **Root Password:** rootpassword

**Important:** Change these credentials in production!

### Environment Variables for Docker

The database connection is configured in `docker-compose.yml`:
```env
DATABASE_URL="mysql://ticketer:ticketerpassword@mysql:3306/ticketer"
NEXT_TELEMETRY_DISABLED=1
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
- `PATCH /api/events/[eventId]` - Update event details
- `DELETE /api/events/[eventId]` - Delete an event
- `GET /api/events/[eventId]/seats` - Get seats for an event
- `PATCH /api/events/[eventId]/seats` - Update seat status (book/reserve)

## Troubleshooting

### Getting a 404 Error on /admin

If you're getting a 404 error when trying to access the admin panel:

1. **Make sure the development server is running:**
   ```bash
   npm run dev
   ```

2. **Verify the database is set up:**
   ```bash
   npm run db:push
   npm run db:generate
   npm run db:seed
   ```

3. **Clear Next.js cache and rebuild:**
   ```bash
   rm -rf .next
   npm run build
   npm run dev
   ```

4. **Check that you're using the correct URL:**
   - The admin panel is at: `http://localhost:3000/admin`
   - Not: `http://localhost:3000/admin/` (trailing slash might cause issues in some setups)

### Other Common Issues

- **Port already in use:** If port 3000 is already in use, Next.js will suggest an alternative port. Use that port instead.
- **Database connection errors:** Ensure your `DATABASE_URL` in `.env` is correct and the database is accessible.
- **Missing dependencies:** Run `npm install` to ensure all dependencies are installed.

## License

MIT
