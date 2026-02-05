'use client'

import { Container, Title, Text, Badge, Button, Group, Stack, Paper, TextInput } from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { use, useState } from 'react'
import Link from 'next/link'

interface Seat {
  id: string
  eventId: string
  row: string
  number: number
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED'
  bookedBy: string | null
  bookedAt: string | null
}

interface Event {
  id: string
  title: string
  description: string | null
  venue: string
  date: string
  totalSeats: number
  seats: Seat[]
}

export default function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [customerName, setCustomerName] = useState('')
  const queryClient = useQueryClient()

  const { data: event, isLoading } = useQuery<Event>({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${eventId}`)
      if (!res.ok) throw new Error('Failed to fetch event')
      return res.json()
    },
    refetchInterval: 3000, // Refetch every 3 seconds for real-time updates
  })

  const bookSeatsMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedSeats.map(seatId =>
        fetch(`/api/events/${eventId}/seats`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            seatId,
            status: 'BOOKED',
            bookedBy: customerName,
          }),
        })
      )
      await Promise.all(promises)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      setSelectedSeats([])
      setCustomerName('')
      notifications.show({
        title: 'Success!',
        message: 'Your seats have been booked successfully.',
        color: 'green',
      })
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to book seats. Please try again.',
        color: 'red',
      })
    },
  })

  const toggleSeat = (seatId: string, status: string) => {
    if (status !== 'AVAILABLE') return

    setSelectedSeats(prev =>
      prev.includes(seatId)
        ? prev.filter(id => id !== seatId)
        : [...prev, seatId]
    )
  }

  const getSeatColor = (seat: Seat) => {
    if (selectedSeats.includes(seat.id)) return 'blue'
    if (seat.status === 'BOOKED') return 'red'
    if (seat.status === 'RESERVED') return 'yellow'
    return 'green'
  }

  if (isLoading) return <Container size="lg" py="xl"><Text>Loading...</Text></Container>
  if (!event) return <Container size="lg" py="xl"><Text>Event not found</Text></Container>

  const seatsByRow = event.seats.reduce((acc, seat) => {
    if (!acc[seat.row]) acc[seat.row] = []
    acc[seat.row].push(seat)
    return acc
  }, {} as Record<string, Seat[]>)

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={1}>{event.title}</Title>
          <Text c="dimmed" size="lg">{event.venue}</Text>
        </div>
        <Badge color="blue" variant="light" size="lg">
          {new Date(event.date).toLocaleDateString()}
        </Badge>
      </Group>

      {event.description && (
        <Text mb="xl">{event.description}</Text>
      )}

      <Stack gap="xl">
        <Paper shadow="sm" p="md" radius="md" withBorder>
          <Title order={2} size="h3" mb="md">Select Your Seats</Title>
          
          <Stack gap="sm">
            {Object.entries(seatsByRow).map(([row, seats]) => (
              <Group key={row} gap="xs">
                <Text fw={700} w={30}>{row}</Text>
                <Group gap="xs">
                  {seats.map(seat => (
                    <Button
                      key={seat.id}
                      size="sm"
                      color={getSeatColor(seat)}
                      variant={selectedSeats.includes(seat.id) ? 'filled' : 'light'}
                      onClick={() => toggleSeat(seat.id, seat.status)}
                      disabled={seat.status !== 'AVAILABLE'}
                      style={{ width: 50 }}
                    >
                      {seat.number}
                    </Button>
                  ))}
                </Group>
              </Group>
            ))}
          </Stack>

          <Group gap="md" mt="lg">
            <Group gap="xs">
              <Button size="xs" color="green" variant="light" disabled>Available</Button>
            </Group>
            <Group gap="xs">
              <Button size="xs" color="blue" variant="filled" disabled>Selected</Button>
            </Group>
            <Group gap="xs">
              <Button size="xs" color="red" variant="light" disabled>Booked</Button>
            </Group>
          </Group>
        </Paper>

        {selectedSeats.length > 0 && (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} size="h4" mb="md">Complete Booking</Title>
            <Text mb="md">Selected seats: {selectedSeats.length}</Text>
            
            <TextInput
              label="Your name"
              placeholder="Enter your name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              mb="md"
              required
            />

            <Group gap="md">
              <Button
                onClick={() => bookSeatsMutation.mutate()}
                disabled={!customerName || bookSeatsMutation.isPending}
                loading={bookSeatsMutation.isPending}
              >
                Book {selectedSeats.length} Seat{selectedSeats.length > 1 ? 's' : ''}
              </Button>
              <Button variant="light" onClick={() => setSelectedSeats([])}>
                Clear Selection
              </Button>
            </Group>
          </Paper>
        )}

        <Link href="/">
          <Button variant="subtle">← Back to Events</Button>
        </Link>
      </Stack>
    </Container>
  )
}
