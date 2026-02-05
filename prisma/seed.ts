import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean up existing data
  await prisma.seat.deleteMany()
  await prisma.event.deleteMany()

  console.log('Creating sample events...')

  // Create sample events
  const events = [
    {
      title: 'Summer Music Festival',
      description: 'Join us for an amazing evening of live music featuring local and international artists.',
      venue: 'Central Park Amphitheater',
      date: new Date('2026-07-15T19:00:00'),
      totalSeats: 120,
      imageUrl: null,
    },
    {
      title: 'Comedy Night Special',
      description: 'Laugh out loud with our lineup of top comedians.',
      venue: 'Downtown Comedy Club',
      date: new Date('2026-03-20T20:00:00'),
      totalSeats: 90,
      imageUrl: null,
    },
    {
      title: 'Classical Orchestra Performance',
      description: 'Experience the beauty of classical music performed by the City Symphony Orchestra.',
      venue: 'Grand Concert Hall',
      date: new Date('2026-04-10T18:30:00'),
      totalSeats: 150,
      imageUrl: null,
    },
  ]

  for (const eventData of events) {
    const event = await prisma.event.create({
      data: eventData,
    })

    console.log(`Created event: ${event.title}`)

    // Create seats for the event
    const seats = []
    const rows = ['A', 'B', 'C', 'D', 'E', 'F']
    const seatsPerRow = Math.ceil(eventData.totalSeats / rows.length)

    for (const row of rows) {
      for (let i = 1; i <= seatsPerRow; i++) {
        seats.push({
          eventId: event.id,
          row,
          number: i,
          status: 'AVAILABLE',
        })
      }
    }

    await prisma.seat.createMany({
      data: seats,
    })

    console.log(`  Created ${seats.length} seats`)
  }

  console.log('Seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
