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
      leftRows: 6,
      leftCols: 10,
      rightRows: 6,
      rightCols: 10,
    },
    {
      title: 'Comedy Night Special',
      description: 'Laugh out loud with our lineup of top comedians.',
      venue: 'Downtown Comedy Club',
      date: new Date('2026-03-20T20:00:00'),
      totalSeats: 90,
      imageUrl: null,
      leftRows: 5,
      leftCols: 9,
      rightRows: 5,
      rightCols: 9,
    },
    {
      title: 'Classical Orchestra Performance',
      description: 'Experience the beauty of classical music performed by the City Symphony Orchestra.',
      venue: 'Grand Concert Hall',
      date: new Date('2026-04-10T18:30:00'),
      totalSeats: 150,
      imageUrl: null,
      leftRows: 6,
      leftCols: 12,
      rightRows: 7,
      rightCols: 13,
    },
  ]

  for (const eventData of events) {
    const event = await prisma.event.create({
      data: eventData,
    })

    console.log(`Created event: ${event.title}`)

    // Create seats for the event
    const seats = []
    const getRowLabel = (index: number) => String.fromCharCode(65 + index) // 65 is 'A'

    // Create left section seats
    for (let rowIndex = 0; rowIndex < eventData.leftRows; rowIndex++) {
      const row = getRowLabel(rowIndex)
      for (let i = 1; i <= eventData.leftCols; i++) {
        seats.push({
          eventId: event.id,
          row,
          number: i,
          section: 'LEFT',
          status: 'AVAILABLE',
        })
      }
    }

    // Create right section seats
    for (let rowIndex = 0; rowIndex < eventData.rightRows; rowIndex++) {
      const row = getRowLabel(rowIndex)
      for (let i = 1; i <= eventData.rightCols; i++) {
        seats.push({
          eventId: event.id,
          row,
          number: i,
          section: 'RIGHT',
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
