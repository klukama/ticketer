import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // Check if all seats are available
    const seats = await prisma.seat.findMany({
      where: {
        id: { in: seatIds },
        eventId,
      },
    })

    if (seats.length !== seatIds.length) {
      return NextResponse.json(
        { error: 'Some seats were not found' },
        { status: 404 }
      )
    }

    const unavailableSeats = seats.filter(seat => seat.status !== 'AVAILABLE')
    if (unavailableSeats.length > 0) {
      return NextResponse.json(
        { error: 'Some seats are no longer available' },
        { status: 409 }
      )
    }

    // Check if any non-Freikarte ticket numbers already exist in the database
    const nonFreikarteTickets = ticketNumbers.filter(t => !isFreikarte(t))
    const existingTickets = nonFreikarteTickets.length > 0
      ? await prisma.seat.findMany({
          where: {
            ticketNumber: { in: nonFreikarteTickets }
          },
          select: { ticketNumber: true }
        })
      : []
    
    if (existingTickets.length > 0) {
      return NextResponse.json(
        { error: `Ticket number(s) already exist: ${existingTickets.map(t => t.ticketNumber).join(', ')}` },
        { status: 409 }
      )
    }

    // Create booking and update seats in a transaction
    const result = await prisma.$transaction(async (tx) => {
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
      
      // Use user-provided ticket numbers and update seats
      const updatedSeats = await Promise.all(
        seatIds.map(async (seatId, index) => {
          const seat = seatsMap.get(seatId)
          if (!seat) throw new Error('Seat not found')
          
          // Use the ticket number provided by the user
          const ticketNumber = ticketNumbers[index]
          
          return tx.seat.update({
            where: { id: seatId },
            data: {
              status: 'BOOKED',
              bookedBy: `${customerFirstName} ${customerLastName}`,
              bookedAt: new Date(),
              ticketNumber,
              bookingId: booking.id,
            },
          })
        })
      )

      return {
        booking,
        seats: updatedSeats,
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
