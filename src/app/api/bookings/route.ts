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
      sellerLastName 
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
      
      // Generate ticket numbers and update seats
      const updatedSeats = await Promise.all(
        seatIds.map(async (seatId, index) => {
          const seat = seatsMap.get(seatId)
          if (!seat) throw new Error('Seat not found')
          
          // Generate ticket number: EVENT-BOOKING-SEAT format
          // The booking ID ensures uniqueness across all bookings
          const ticketNumber = `${eventId.substring(0, 8).toUpperCase()}-${booking.id.substring(0, 8).toUpperCase()}-${(index + 1).toString().padStart(3, '0')}`
          
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
