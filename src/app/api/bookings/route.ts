import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      eventId,
      seatIds, 
      customerFirstName, 
      customerLastName, 
      sellerFirstName, 
      sellerLastName,
      ticketNumbers 
    } = body

    // Validate input
    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing required field: eventId' },
        { status: 400 }
      )
    }

    if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: seatIds must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!customerFirstName || !customerLastName || !sellerFirstName || !sellerLastName) {
      return NextResponse.json(
        { error: 'Missing required fields: customer and seller names are required' },
        { status: 400 }
      )
    }

    if (!ticketNumbers || !Array.isArray(ticketNumbers) || ticketNumbers.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: ticketNumbers must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate that all ticket numbers are non-empty strings
    const invalidTickets = ticketNumbers.filter(ticket => typeof ticket !== 'string' || !ticket.trim())
    if (invalidTickets.length > 0) {
      return NextResponse.json(
        { error: 'All ticket numbers must be non-empty strings' },
        { status: 400 }
      )
    }

    if (ticketNumbers.length !== seatIds.length) {
      return NextResponse.json(
        { error: 'Number of ticket numbers must match number of seats' },
        { status: 400 }
      )
    }

    // "Freikarte" variants (case-insensitive, spaces ignored) are allowed to repeat
    const isFreikarte = (ticket: string) =>
      ticket.toLowerCase().replace(/\s+/g, '') === 'freikarte'

    // Check for duplicate ticket numbers in the input using a Set for O(n) complexity
    const ticketSet = new Set<string>()

    for (const ticket of ticketNumbers) {
      if (!isFreikarte(ticket) && ticketSet.has(ticket)) {
        return NextResponse.json(
          { error: `Duplicate ticket numbers are not allowed: ${ticket}` },
          { status: 400 }
        )
      }
      ticketSet.add(ticket)
    }

    // Create booking and update seats in a transaction
    // Availability check is done INSIDE the transaction to prevent race conditions
    // where two concurrent requests both see seats as AVAILABLE and both succeed.
    const result = await prisma.$transaction(async (tx) => {
      // Atomically check seat existence and availability inside the transaction
      const seats = await tx.seat.findMany({
        where: {
          id: { in: seatIds },
          eventId,
        },
      })

      if (seats.length !== seatIds.length) {
        throw Object.assign(new Error('Some seats were not found'), { statusCode: 404 })
      }

      const unavailableSeats = seats.filter(seat => seat.status !== 'AVAILABLE')
      if (unavailableSeats.length > 0) {
        throw Object.assign(new Error('Some seats are no longer available'), { statusCode: 409 })
      }

      // Check if any non-Freikarte ticket numbers already exist in the database
      const nonFreikarteTickets = ticketNumbers.filter(t => !isFreikarte(t))
      if (nonFreikarteTickets.length > 0) {
        const existingTickets = await tx.seat.findMany({
          where: { ticketNumber: { in: nonFreikarteTickets } },
          select: { ticketNumber: true },
        })
        if (existingTickets.length > 0) {
          throw Object.assign(
            new Error(`Ticket number(s) already exist: ${existingTickets.map(t => t.ticketNumber).join(', ')}`),
            { statusCode: 409 }
          )
        }
      }

      // Create the booking
      const booking = await tx.booking.create({
        data: {
          eventId,
          customerFirstName,
          customerLastName,
          sellerFirstName,
          sellerLastName,
        },
      })

      // Create a map for O(1) lookups
      const seatsMap = new Map(seats.map(s => [s.id, s]))

      // Use user-provided ticket numbers and update seats atomically.
      // The `where` clause includes `status: 'AVAILABLE'` so a concurrent
      // transaction that already booked a seat will cause updateMany to
      // return count 0, rolling back this transaction.
      const updatedSeats = await Promise.all(
        seatIds.map(async (seatId, index) => {
          const seat = seatsMap.get(seatId)
          if (!seat) throw new Error('Seat not found')

          const ticketNumber = ticketNumbers[index]

          const updated = await tx.seat.updateMany({
            where: { id: seatId, status: 'AVAILABLE' },
            data: {
              status: 'BOOKED',
              bookedBy: `${customerFirstName} ${customerLastName}`,
              bookedAt: new Date(),
              ticketNumber,
              bookingId: booking.id,
            },
          })

          if (updated.count === 0) {
            throw Object.assign(new Error('Some seats are no longer available'), { statusCode: 409 })
          }

          return {
            id: seatId,
            eventId,
            row: seat.row,
            number: seat.number,
            section: seat.section,
            status: 'BOOKED',
            ticketNumber,
            bookingId: booking.id,
          }
        })
      )

      return {
        booking,
        seats: updatedSeats,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    // Re-throw typed errors from inside the transaction as proper HTTP responses
    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as Error & { statusCode: number }).statusCode
      if (statusCode === 404 || statusCode === 409) {
        return NextResponse.json({ error: error.message }, { status: statusCode })
      }
    }
    logError('POST /api/bookings - Error creating booking', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
