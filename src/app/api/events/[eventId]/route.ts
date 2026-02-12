import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        seats: {
          orderBy: [
            { row: 'asc' },
            { number: 'asc' }
          ]
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { title, description, venue, date, totalSeats, imageUrl, leftRows, leftCols, rightRows, rightCols, backRows, backCols } = body

    // Check if event exists
    const existingEvent = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Validate totalSeats if provided
    if (totalSeats !== undefined && (typeof totalSeats !== 'number' || totalSeats <= 0)) {
      return NextResponse.json(
        { error: 'totalSeats must be a positive number' },
        { status: 400 }
      )
    }

    // Validate date if provided
    if (date !== undefined) {
      const parsedDate = new Date(date)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format' },
          { status: 400 }
        )
      }
    }

    // Update the event
    const event = await prisma.event.update({
      where: { id: eventId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(venue !== undefined && { venue }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(totalSeats !== undefined && { totalSeats }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(leftRows !== undefined && { leftRows }),
        ...(leftCols !== undefined && { leftCols }),
        ...(rightRows !== undefined && { rightRows }),
        ...(rightCols !== undefined && { rightCols }),
        ...(backRows !== undefined && { backRows }),
        ...(backCols !== undefined && { backCols }),
      }
    })

    return NextResponse.json(event)
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    // Use transaction to ensure atomic deletion
    await prisma.$transaction(async (tx) => {
      // Check if event exists
      const existingEvent = await tx.event.findUnique({
        where: { id: eventId }
      })

      if (!existingEvent) {
        throw new Error('Event not found')
      }

      // Delete the event (seats will be deleted automatically due to onDelete: Cascade)
      await tx.event.delete({
        where: { id: eventId }
      })
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error) {
    console.error('Error deleting event:', error)

    if (error instanceof Error && error.message === 'Event not found') {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
