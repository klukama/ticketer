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
    const { title, description, venue, date, totalSeats, imageUrl, leftRows, leftCols, rightRows, rightCols, backRows, backCols } = body

    // Validate required fields
    if (!title || !venue || !date || !totalSeats) {
      return NextResponse.json(
        { error: 'Missing required fields: title, venue, date, and totalSeats are required' },
        { status: 400 }
      )
    }

    // Validate totalSeats is a positive number
    if (typeof totalSeats !== 'number' || totalSeats <= 0) {
      return NextResponse.json(
        { error: 'totalSeats must be a positive number' },
        { status: 400 }
      )
    }

    // Set defaults for seating configuration
    const leftRowsCount = leftRows || 6
    const leftColsCount = leftCols || 5
    const rightRowsCount = rightRows || 6
    const rightColsCount = rightCols || 5
    const backRowsCount = backRows || 0
    const backColsCount = backCols || 0

    const event = await prisma.event.create({
      data: {
        title,
        description,
        venue,
        date: new Date(date),
        totalSeats,
        imageUrl,
        leftRows: leftRowsCount,
        leftCols: leftColsCount,
        rightRows: rightRowsCount,
        rightCols: rightColsCount,
        backRows: backRowsCount,
        backCols: backColsCount,
      },
    })

    // Create seats for the event
    const seats = []
    
    // Generate row labels (A, B, C, ...)
    const getRowLabel = (index: number) => String.fromCharCode(65 + index) // 65 is 'A'

    // Create left section seats
    for (let rowIndex = 0; rowIndex < leftRowsCount; rowIndex++) {
      const row = getRowLabel(rowIndex)
      for (let i = 1; i <= leftColsCount; i++) {
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
    for (let rowIndex = 0; rowIndex < rightRowsCount; rowIndex++) {
      const row = getRowLabel(rowIndex)
      for (let i = 1; i <= rightColsCount; i++) {
        seats.push({
          eventId: event.id,
          row,
          number: i,
          section: 'RIGHT',
          status: 'AVAILABLE',
        })
      }
    }

    // Create back section seats
    for (let rowIndex = 0; rowIndex < backRowsCount; rowIndex++) {
      const row = getRowLabel(rowIndex)
      for (let i = 1; i <= backColsCount; i++) {
        seats.push({
          eventId: event.id,
          row,
          number: i,
          section: 'BACK',
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
