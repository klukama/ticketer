import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logError } from '@/lib/logger'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const seats = await prisma.seat.findMany({
      where: { eventId },
      orderBy: [
        { row: 'asc' },
        { number: 'asc' }
      ]
    })
    return NextResponse.json(seats)
  } catch (error) {
    logError('GET /api/events/[eventId]/seats - Error fetching seats', error)
    return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await params // Ensure params is awaited
    const body = await request.json()
    const { seatId, status, bookedBy } = body

    // Validate input
    if (!seatId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: seatId and status are required' },
        { status: 400 }
      )
    }

    // Use transaction to ensure atomic seat update with validation
    const seat = await prisma.$transaction(async (tx) => {
      // Get the current seat to check its status
      const currentSeat = await tx.seat.findUnique({
        where: { id: seatId }
      })

      if (!currentSeat) {
        throw new Error('Seat not found')
      }

      // Prevent booking if seat is not available (race condition protection)
      if (status === 'BOOKED' && currentSeat.status !== 'AVAILABLE') {
        throw new Error('Seat is no longer available')
      }

      return await tx.seat.update({
        where: { id: seatId },
        data: {
          status,
          bookedBy: status === 'BOOKED' ? bookedBy : null,
          bookedAt: status === 'BOOKED' ? new Date() : null,
        },
      })
    })

    return NextResponse.json(seat)
  } catch (error) {
    logError('PATCH /api/events/[eventId]/seats - Error updating seat', error)

    if (error instanceof Error) {
      if (error.message === 'Seat not found') {
        return NextResponse.json({ error: 'Seat not found' }, { status: 404 })
      }
      if (error.message === 'Seat is no longer available') {
        return NextResponse.json({ error: 'Seat is no longer available' }, { status: 409 })
      }
    }

    return NextResponse.json({ error: 'Failed to update seat' }, { status: 500 })
  }
}
