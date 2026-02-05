import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'asc' },
      include: {
        _count: {
          select: { seats: true }
        }
      }
    })
    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, venue, date, totalSeats, imageUrl } = body

    const event = await prisma.event.create({
      data: {
        title,
        description,
        venue,
        date: new Date(date),
        totalSeats,
        imageUrl,
      },
    })

    // Create seats for the event
    const seats = []
    const rows = ['A', 'B', 'C', 'D', 'E', 'F']
    const seatsPerRow = Math.ceil(totalSeats / rows.length)

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

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
