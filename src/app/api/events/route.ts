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
    const { title, description, venue, date, totalSeats, imageUrl, leftRows, leftCols, rightRows, rightCols, backRows, backCols, seatsPerRow, aisleAfterSeat, backAisleAfterSeat } = body

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

    // Validate seating configuration fields are non-negative integers, if provided
    const seatingFields: { name: string; value: unknown }[] = [
      { name: 'leftRows', value: leftRows },
      { name: 'leftCols', value: leftCols },
      { name: 'rightRows', value: rightRows },
      { name: 'rightCols', value: rightCols },
      { name: 'backRows', value: backRows },
      { name: 'backCols', value: backCols },
      { name: 'seatsPerRow', value: seatsPerRow },
      { name: 'aisleAfterSeat', value: aisleAfterSeat },
      { name: 'backAisleAfterSeat', value: backAisleAfterSeat },
    ]

    for (const field of seatingFields) {
      const { name, value } = field
      if (value !== undefined && value !== null) {
        const num = Number(value)
        if (!Number.isInteger(num) || num < 0) {
          return NextResponse.json(
            { error: `Invalid seating configuration: ${name} must be a non-negative integer` },
            { status: 400 }
          )
        }
      }
    }

    // Set defaults for seating configuration (values are validated and coerced to numbers above)
    const leftRowsCount =
      leftRows !== undefined && leftRows !== null ? Number(leftRows) : 6
    const leftColsCount =
      leftCols !== undefined && leftCols !== null ? Number(leftCols) : 5
    const rightRowsCount =
      rightRows !== undefined && rightRows !== null ? Number(rightRows) : 6
    const rightColsCount =
      rightCols !== undefined && rightCols !== null ? Number(rightCols) : 5
    const backRowsCount =
      backRows !== undefined && backRows !== null ? Number(backRows) : 0
    const backColsCount =
      backCols !== undefined && backCols !== null ? Number(backCols) : 0
    const seatsPerRowCount =
      seatsPerRow !== undefined && seatsPerRow !== null ? Number(seatsPerRow) : 0
    const aisleAfterSeatCount =
      aisleAfterSeat !== undefined && aisleAfterSeat !== null ? Number(aisleAfterSeat) : 0
    const backAisleAfterSeatCount =
      backAisleAfterSeat !== undefined && backAisleAfterSeat !== null ? Number(backAisleAfterSeat) : 0

    // Use transaction to ensure atomicity
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
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
          seatsPerRow: seatsPerRowCount,
          aisleAfterSeat: aisleAfterSeatCount,
          backAisleAfterSeat: backAisleAfterSeatCount,
        },
      })

      // Create seats for the event
      const seats = []

      // Generate row labels (A, B, C, ...)
      const getRowLabel = (index: number) => String.fromCharCode(65 + index) // 65 is 'A'

      if (seatsPerRowCount > 0) {
        // New flexible model: single MAIN section
        for (let rowIndex = 0; rowIndex < leftRowsCount; rowIndex++) {
          const row = getRowLabel(rowIndex)
          for (let i = 1; i <= seatsPerRowCount; i++) {
            seats.push({
              eventId: newEvent.id,
              row,
              number: i,
              section: 'MAIN',
              status: 'AVAILABLE',
            })
          }
        }
      } else {
        // Legacy model: LEFT and RIGHT sections
        // Create left section seats
        for (let rowIndex = 0; rowIndex < leftRowsCount; rowIndex++) {
          const row = getRowLabel(rowIndex)
          for (let i = 1; i <= leftColsCount; i++) {
            seats.push({
              eventId: newEvent.id,
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
              eventId: newEvent.id,
              row,
              number: i,
              section: 'RIGHT',
              status: 'AVAILABLE',
            })
          }
        }
      }

      // Create back section seats
      for (let rowIndex = 0; rowIndex < backRowsCount; rowIndex++) {
        const row = getRowLabel(rowIndex)
        for (let i = 1; i <= backColsCount; i++) {
          seats.push({
            eventId: newEvent.id,
            row,
            number: i,
            section: 'RANG',
            status: 'AVAILABLE',
          })
        }
      }

      await tx.seat.createMany({
        data: seats,
      })

      return newEvent
    })

    return NextResponse.json(event, { status: 201 })
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
