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
      rowGroupConfigs: JSON.stringify([{ rows: 6, seatsPerRow: 20, aisleAfterSeat: 10 }]),
    },
    {
      title: 'Comedy Night Special',
      description: 'Laugh out loud with our lineup of top comedians.',
      venue: 'Downtown Comedy Club',
      date: new Date('2026-03-20T20:00:00'),
      totalSeats: 90,
      imageUrl: null,
      leftRows: 5,
      rowGroupConfigs: JSON.stringify([{ rows: 5, seatsPerRow: 18, aisleAfterSeat: 9 }]),
    },
    {
      title: 'Classical Orchestra Performance',
      description: 'Experience the beauty of classical music performed by the City Symphony Orchestra.',
      venue: 'Grand Concert Hall',
      date: new Date('2026-04-10T18:30:00'),
      totalSeats: 150,
      imageUrl: null,
      leftRows: 6,
      rowGroupConfigs: JSON.stringify([
        { rows: 6, seatsPerRow: 20, aisleAfterSeat: 10 },
        { rows: 1, seatsPerRow: 30, aisleAfterSeat: 15 },
      ]),
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

    // Create PARKETT section seats from rowGroupConfigs
    const groups: Array<{ rows: number; seatsPerRow: number; aisleAfterSeat: number }> = JSON.parse(eventData.rowGroupConfigs)
    let rowIndex = 0
    for (const group of groups) {
      for (let r = 0; r < group.rows; r++) {
        const row = getRowLabel(rowIndex++)
        for (let i = 1; i <= group.seatsPerRow; i++) {
          seats.push({
            eventId: event.id,
            row,
            number: i,
            section: 'PARKETT',
            status: 'AVAILABLE',
          })
        }
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
