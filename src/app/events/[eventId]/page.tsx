'use client'

import { Container, Title, Text, Badge, Button, Group, Stack, Paper, TextInput } from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { use, useState, useMemo } from 'react'
import Link from 'next/link'

interface Booking {
  id: string
  customerFirstName: string
  customerLastName: string
  sellerFirstName: string
  sellerLastName: string
}

interface Seat {
  id: string
  eventId: string
  row: string
  number: number
  section: string
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED'
  bookedBy: string | null
  bookedAt: string | null
  ticketNumber: string | null
  booking: Booking | null
}

interface Event {
  id: string
  title: string
  description: string | null
  venue: string
  date: string
  totalSeats: number
  leftRows: number
  leftCols: number
  rightRows: number
  rightCols: number
  backRows: number
  backCols: number
  seats: Seat[]
}

export default function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params)
  const [selectedSeats, setSelectedSeats] = useState<string[]>([])
  const [customerFirstName, setCustomerFirstName] = useState('')
  const [customerLastName, setCustomerLastName] = useState('')
  const [sellerFirstName, setSellerFirstName] = useState('')
  const [sellerLastName, setSellerLastName] = useState('')
  const [ticketNumbers, setTicketNumbers] = useState<Record<string, string>>({})
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
      const ticketNumbersArray = selectedSeats.map(seatId => ticketNumbers[seatId] || '')
      
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          seatIds: selectedSeats,
          customerFirstName,
          customerLastName,
          sellerFirstName,
          sellerLastName,
          ticketNumbers: ticketNumbersArray,
        }),
      })
      
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to book seats')
      }
      
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      setSelectedSeats([])
      setCustomerFirstName('')
      setCustomerLastName('')
      setSellerFirstName('')
      setSellerLastName('')
      setTicketNumbers({})
      notifications.show({
        title: 'Erfolg!',
        message: 'Ihre Plätze wurden erfolgreich gebucht.',
        color: 'green',
      })
    },
    onError: (error: Error) => {
      notifications.show({
        title: 'Fehler',
        message: error.message || 'Buchung fehlgeschlagen. Bitte versuchen Sie es erneut.',
        color: 'red',
      })
    },
  })

  const toggleSeat = (seatId: string, status: string) => {
    if (status !== 'AVAILABLE') return

    setSelectedSeats(prev => {
      const isSelected = prev.includes(seatId)
      if (isSelected) {
        // Remove ticket number when seat is deselected
        setTicketNumbers(prevTickets => {
          const newTickets = { ...prevTickets }
          delete newTickets[seatId]
          return newTickets
        })
        return prev.filter(id => id !== seatId)
      } else {
        return [...prev, seatId]
      }
    })
  }

  const getSeatColor = (seat: Seat) => {
    if (selectedSeats.includes(seat.id)) return 'blue'
    if (seat.status === 'BOOKED') return 'red'
    if (seat.status === 'RESERVED') return 'yellow'
    return 'green'
  }

  // Memoize the validation check to avoid unnecessary re-computation
  const areAllTicketNumbersFilled = useMemo(() => {
    return !selectedSeats.some(seatId => !ticketNumbers[seatId]?.trim())
  }, [selectedSeats, ticketNumbers])

  if (isLoading) return <Container size="lg" py="xl"><Text>Lädt...</Text></Container>
  if (!event) return <Container size="lg" py="xl"><Text>Veranstaltung nicht gefunden</Text></Container>

  // Group seats by section and row
  const leftSeats = event.seats.filter(seat => seat.section === 'LEFT')
  const rightSeats = event.seats.filter(seat => seat.section === 'RIGHT')
  const backSeats = event.seats.filter(seat => seat.section === 'RANG')

  const groupByRow = (seats: Seat[]) => {
    return seats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = []
      acc[seat.row].push(seat)
      return acc
    }, {} as Record<string, Seat[]>)
  }

  const leftSeatsByRow = groupByRow(leftSeats)
  const rightSeatsByRow = groupByRow(rightSeats)
  const backSeatsByRow = groupByRow(backSeats)

  // Get all unique rows and sort them in REVERSE alphabetical order (Z to A)
  // This makes A closest to the stage (bottom)
  const allRows = Array.from(new Set([
    ...Object.keys(leftSeatsByRow),
    ...Object.keys(rightSeatsByRow)
  ])).sort().reverse()

  // Get back section rows separately - also in reverse order
  const backRows = Object.keys(backSeatsByRow).sort().reverse()

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg" wrap="wrap" gap="sm">
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
          <Title order={2} size="h3" mb="md">Wählen Sie Ihre Plätze</Title>
          
          <Stack gap="sm">
            {/* Back Section - Centered at the top */}
            {backRows.length > 0 && (
              <>
                {backRows.map((row) => (
                  <Group key={`back-${row}`} gap="md" justify="center" wrap="wrap">
                    <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                    <Group gap="xs" wrap="wrap" justify="center">
                      {(backSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => (
                        <Button
                          key={seat.id}
                          size="sm"
                          color={getSeatColor(seat)}
                          variant={selectedSeats.includes(seat.id) ? 'filled' : 'light'}
                          onClick={() => toggleSeat(seat.id, seat.status)}
                          disabled={seat.status !== 'AVAILABLE'}
                          style={{ width: 50, minWidth: 40, flexShrink: 0 }}
                        >
                          {seat.number}
                        </Button>
                      ))}
                    </Group>
                    <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                  </Group>
                ))}
                {/* Spacer between back section and main sections */}
                <div style={{ height: '20px' }} />
              </>
            )}

            {allRows.map((row) => (
              <Group key={row} gap="md" justify="center" align="flex-start" wrap="wrap">
                {/* Left Section */}
                <Group gap="xs" justify="flex-end" style={{ minWidth: '150px', flex: '1 1 auto', maxWidth: '100%' }} wrap="wrap">
                  <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                  <Group gap="xs" wrap="wrap" justify="flex-end">
                    {(leftSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => (
                      <Button
                        key={seat.id}
                        size="sm"
                        color={getSeatColor(seat)}
                        variant={selectedSeats.includes(seat.id) ? 'filled' : 'light'}
                        onClick={() => toggleSeat(seat.id, seat.status)}
                        disabled={seat.status !== 'AVAILABLE'}
                        style={{ width: 50, minWidth: 40, flexShrink: 0 }}
                      >
                        {seat.number}
                      </Button>
                    ))}
                  </Group>
                </Group>

                {/* Aisle/Gap between sections */}
                <div style={{ width: '20px', minWidth: '10px', flexShrink: 0 }} />

                {/* Right Section */}
                <Group gap="xs" justify="flex-start" style={{ minWidth: '150px', flex: '1 1 auto', maxWidth: '100%' }} wrap="wrap">
                  <Group gap="xs" wrap="wrap" justify="flex-start">
                    {(rightSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => (
                      <Button
                        key={seat.id}
                        size="sm"
                        color={getSeatColor(seat)}
                        variant={selectedSeats.includes(seat.id) ? 'filled' : 'light'}
                        onClick={() => toggleSeat(seat.id, seat.status)}
                        disabled={seat.status !== 'AVAILABLE'}
                        style={{ width: 50, minWidth: 40, flexShrink: 0 }}
                      >
                        {seat.number}
                      </Button>
                    ))}
                  </Group>
                  <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                </Group>
              </Group>
            ))}
          </Stack>

          {/* Stage */}
          <Paper 
            mt="lg" 
            p="md" 
            ta="center"
            style={{ 
              backgroundColor: '#adb5bd',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1.2rem'
            }}
          >
            Bühne
          </Paper>

          <Group gap="md" mt="lg" wrap="wrap">
            <Button size="xs" color="green" variant="light" disabled>Verfügbar</Button>
            <Button size="xs" color="blue" variant="filled" disabled>Ausgewählt</Button>
            <Button size="xs" color="red" variant="light" disabled>Gebucht</Button>
          </Group>
        </Paper>

        {selectedSeats.length > 0 && (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} size="h4" mb="md">Buchung abschließen</Title>
            <Text mb="md">Ausgewählte Plätze: {selectedSeats.length}</Text>
            
            <Stack gap="md">
              <div>
                <Title order={4} size="h5" mb="xs">Kundeninformationen</Title>
                <Group grow wrap="wrap">
                  <TextInput
                    label="Vorname"
                    placeholder="Vorname des Kunden eingeben"
                    value={customerFirstName}
                    onChange={(e) => setCustomerFirstName(e.target.value)}
                    required
                    style={{ minWidth: '200px' }}
                  />
                  <TextInput
                    label="Nachname"
                    placeholder="Nachname des Kunden eingeben"
                    value={customerLastName}
                    onChange={(e) => setCustomerLastName(e.target.value)}
                    required
                    style={{ minWidth: '200px' }}
                  />
                </Group>
              </div>

              <div>
                <Title order={4} size="h5" mb="xs">Verkäuferinformationen</Title>
                <Group grow wrap="wrap">
                  <TextInput
                    label="Vorname"
                    placeholder="Vorname des Verkäufers eingeben"
                    value={sellerFirstName}
                    onChange={(e) => setSellerFirstName(e.target.value)}
                    required
                    style={{ minWidth: '200px' }}
                  />
                  <TextInput
                    label="Nachname"
                    placeholder="Nachname des Verkäufers eingeben"
                    value={sellerLastName}
                    onChange={(e) => setSellerLastName(e.target.value)}
                    required
                    style={{ minWidth: '200px' }}
                  />
                </Group>
              </div>

              <div>
                <Title order={4} size="h5" mb="xs">Ticketnummern</Title>
                <Text size="sm" c="dimmed" mb="xs">
                  Geben Sie die vorhandene Ticketnummer für jeden ausgewählten Platz ein
                </Text>
                <Stack gap="xs">
                  {selectedSeats.map((seatId, index) => {
                    const seat = event?.seats.find(s => s.id === seatId)
                    const seatLabel = seat ? `${seat.section} ${seat.row}${seat.number}` : `Seat ${index + 1}`
                    return (
                      <TextInput
                        key={seatId}
                        label={seatLabel}
                        placeholder="Ticketnummer eingeben"
                        value={ticketNumbers[seatId] || ''}
                        onChange={(e) => setTicketNumbers(prev => ({
                          ...prev,
                          [seatId]: e.target.value
                        }))}
                        required
                      />
                    )
                  })}
                </Stack>
              </div>
            </Stack>

            <Group gap="md" mt="md" wrap="wrap">
              <Button
                onClick={() => bookSeatsMutation.mutate()}
                disabled={
                  !customerFirstName || 
                  !customerLastName || 
                  !sellerFirstName || 
                  !sellerLastName ||
                  !areAllTicketNumbersFilled ||
                  bookSeatsMutation.isPending
                }
                loading={bookSeatsMutation.isPending}
              >
                {selectedSeats.length} Platz{selectedSeats.length > 1 ? 'e' : ''} buchen
              </Button>
              <Button variant="light" onClick={() => {
                setSelectedSeats([])
                setTicketNumbers({})
              }}>
                Auswahl löschen
              </Button>
            </Group>
          </Paper>
        )}

        <Link href="/">
          <Button variant="subtle">← Zurück zu Veranstaltungen</Button>
        </Link>
      </Stack>
    </Container>
  )
}
