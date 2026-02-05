import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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
    console.error('Error fetching seats:', error)
    return NextResponse.json({ error: 'Failed to fetch seats' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { seatId, status, bookedBy } = body

    // Validate input
    if (!seatId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: seatId and status are required' },
        { status: 400 }
      )
    }

    // Get the current seat to check its status
    const currentSeat = await prisma.seat.findUnique({
      where: { id: seatId }
    })

    if (!currentSeat) {
      return NextResponse.json({ error: 'Seat not found' }, { status: 404 })
    }

    // Prevent booking if seat is not available (race condition protection)
    if (status === 'BOOKED' && currentSeat.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: 'Seat is no longer available' },
        { status: 409 }
      )
    }

    const seat = await prisma.seat.update({
      where: { id: seatId },
      data: {
        status,
        bookedBy: status === 'BOOKED' ? bookedBy : null,
        bookedAt: status === 'BOOKED' ? new Date() : null,
      },
    })

    return NextResponse.json(seat)
  } catch (error) {
    console.error('Error updating seat:', error)
    return NextResponse.json({ error: 'Failed to update seat' }, { status: 500 })
  }
}
