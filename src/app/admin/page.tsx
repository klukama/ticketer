'use client'

import { Container, Title, Text, Card, Group, Badge, Button, Stack, Modal, TextInput, Textarea, Table, Paper } from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { useState } from 'react'
import Link from 'next/link'

interface Event {
  id: string
  title: string
  description: string | null
  venue: string
  date: string
  totalSeats: number
  imageUrl: string | null
  _count?: {
    seats: number
  }
}

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

interface EventWithSeats extends Event {
  seats: Seat[]
}

interface EventWithConfig extends Event {
  leftRows: number
  leftCols: number
  rightRows: number
  rightCols: number
  backRows: number
  backCols: number
}

export default function AdminPage() {
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewBookingsEventId, setViewBookingsEventId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    venue: '',
    date: '',
    leftRows: 6,
    leftCols: 5,
    rightRows: 6,
    rightCols: 5,
    backRows: 0,
    backCols: 0,
  })

  const queryClient = useQueryClient()

  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const res = await fetch('/api/events')
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json()
    },
  })

  const { data: bookingsEvent } = useQuery<EventWithSeats>({
    queryKey: ['event-bookings', viewBookingsEventId],
    queryFn: async () => {
      const res = await fetch(`/api/events/${viewBookingsEventId}`)
      if (!res.ok) throw new Error('Failed to fetch event')
      return res.json()
    },
    enabled: !!viewBookingsEventId,
  })

  const createEventMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const totalSeats = data.leftRows * data.leftCols + data.rightRows * data.rightCols + data.backRows * data.backCols
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          totalSeats,
        }),
      })
      if (!res.ok) throw new Error('Failed to create event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      setCreateModalOpen(false)
      resetForm()
      notifications.show({
        title: 'Erfolg!',
        message: 'Veranstaltung erfolgreich erstellt.',
        color: 'green',
      })
    },
    onError: () => {
      notifications.show({
        title: 'Fehler',
        message: 'Veranstaltung konnte nicht erstellt werden.',
        color: 'red',
      })
    },
  })

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const totalSeats = data.leftRows * data.leftCols + data.rightRows * data.rightCols + data.backRows * data.backCols
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          totalSeats,
        }),
      })
      if (!res.ok) throw new Error('Failed to update event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      setEditModalOpen(false)
      setSelectedEvent(null)
      resetForm()
      notifications.show({
        title: 'Erfolg!',
        message: 'Veranstaltung erfolgreich aktualisiert.',
        color: 'green',
      })
    },
    onError: () => {
      notifications.show({
        title: 'Fehler',
        message: 'Veranstaltung konnte nicht aktualisiert werden.',
        color: 'red',
      })
    },
  })

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete event')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] })
      notifications.show({
        title: 'Erfolg!',
        message: 'Veranstaltung erfolgreich gelöscht.',
        color: 'green',
      })
    },
    onError: () => {
      notifications.show({
        title: 'Fehler',
        message: 'Veranstaltung konnte nicht gelöscht werden.',
        color: 'red',
      })
    },
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      venue: '',
      date: '',
      leftRows: 6,
      leftCols: 5,
      rightRows: 6,
      rightCols: 5,
      backRows: 0,
      backCols: 0,
    })
  }

  const openEditModal = (event: Event) => {
    setSelectedEvent(event)
    // Format date to YYYY-MM-DDTHH:MM for datetime-local input
    const eventDate = new Date(event.date)
    const year = eventDate.getFullYear()
    const month = String(eventDate.getMonth() + 1).padStart(2, '0')
    const day = String(eventDate.getDate()).padStart(2, '0')
    const hours = String(eventDate.getHours()).padStart(2, '0')
    const minutes = String(eventDate.getMinutes()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`
    
    const eventWithConfig = event as EventWithConfig
    setFormData({
      title: event.title,
      description: event.description || '',
      venue: event.venue,
      date: formattedDate,
      leftRows: eventWithConfig.leftRows || 6,
      leftCols: eventWithConfig.leftCols || 5,
      rightRows: eventWithConfig.rightRows || 6,
      rightCols: eventWithConfig.rightCols || 5,
      backRows: eventWithConfig.backRows || 0,
      backCols: eventWithConfig.backCols || 0,
    })
    setEditModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editModalOpen && selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, data: formData })
    } else {
      createEventMutation.mutate(formData)
    }
  }

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Sind Sie sicher, dass Sie "${title}" löschen möchten?`)) {
      deleteEventMutation.mutate(id)
    }
  }

  const bookedSeats = bookingsEvent?.seats.filter(s => s.status === 'BOOKED') || []
  const currentDate = new Date()

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Admin-Panel</Title>
          <Text c="dimmed">Veranstaltungen verwalten und Buchungen anzeigen</Text>
        </div>
        <Group>
          <Link href="/">
            <Button variant="subtle">Öffentliche Seite anzeigen</Button>
          </Link>
          <Button onClick={() => setCreateModalOpen(true)}>
            Neue Veranstaltung erstellen
          </Button>
        </Group>
      </Group>

      {isLoading && <Text>Veranstaltungen werden geladen...</Text>}

      <Stack gap="md">
        {events?.map((event) => {
          const eventDate = new Date(event.date)
          const isPast = eventDate < currentDate
          
          return (
            <Card key={event.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group gap="sm" mb="xs">
                    <Title order={3}>{event.title}</Title>
                    {isPast && (
                      <Badge color="gray" variant="light">Vergangene Veranstaltung</Badge>
                    )}
                  </Group>
                  
                  <Text size="sm" c="dimmed" mb="xs">
                    📍 {event.venue}
                  </Text>
                  
                  <Text size="sm" c="dimmed" mb="xs">
                    📅 {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString()}
                  </Text>
                  
                  {event.description && (
                    <Text size="sm" mb="md" lineClamp={2}>
                      {event.description}
                    </Text>
                  )}
                  
                  <Text size="sm" fw={500}>
                    Gesamtplätze: {event.totalSeats}
                  </Text>
                </div>

                <Group gap="xs">
                  <Button
                    variant="light"
                    color="blue"
                    onClick={() => setViewBookingsEventId(event.id)}
                  >
                    Buchungen anzeigen
                  </Button>
                  <Button
                    variant="light"
                    onClick={() => openEditModal(event)}
                  >
                    Bearbeiten
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    onClick={() => handleDelete(event.id, event.title)}
                  >
                    Löschen
                  </Button>
                </Group>
              </Group>
            </Card>
          )
        })}

        {!isLoading && events?.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            Noch keine Veranstaltungen erstellt. Klicken Sie auf &quot;Neue Veranstaltung erstellen&quot;, um zu beginnen.
          </Text>
        )}
      </Stack>

      {/* Create/Edit Event Modal */}
      <Modal
        opened={createModalOpen || editModalOpen}
        onClose={() => {
          setCreateModalOpen(false)
          setEditModalOpen(false)
          setSelectedEvent(null)
          resetForm()
        }}
        title={editModalOpen ? 'Veranstaltung bearbeiten' : 'Neue Veranstaltung erstellen'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Veranstaltungstitel"
              placeholder="z.B. Sommermusikfestival"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            
            <Textarea
              label="Beschreibung"
              placeholder="Veranstaltungsbeschreibung..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              minRows={3}
            />
            
            <TextInput
              label="Veranstaltungsort"
              placeholder="z.B. Stadtarena"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              required
            />
            
            <TextInput
              label="Datum & Uhrzeit"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            
            <Title order={4} size="h5" mt="md">Sitzplatzkonfiguration</Title>
            
            <Group grow>
              <TextInput
                label="Linke Seite - Reihen"
                type="number"
                min={1}
                max={26}
                value={formData.leftRows}
                onChange={(e) => setFormData({ ...formData, leftRows: Number(e.target.value) })}
                required
              />
              <TextInput
                label="Linke Seite - Spalten"
                type="number"
                min={1}
                value={formData.leftCols}
                onChange={(e) => setFormData({ ...formData, leftCols: Number(e.target.value) })}
                required
              />
            </Group>
            
            <Group grow>
              <TextInput
                label="Rechte Seite - Reihen"
                type="number"
                min={1}
                max={26}
                value={formData.rightRows}
                onChange={(e) => setFormData({ ...formData, rightRows: Number(e.target.value) })}
                required
              />
              <TextInput
                label="Rechte Seite - Spalten"
                type="number"
                min={1}
                value={formData.rightCols}
                onChange={(e) => setFormData({ ...formData, rightCols: Number(e.target.value) })}
                required
              />
            </Group>
            
            <Group grow>
              <TextInput
                label="Rang - Reihen"
                type="number"
                min={0}
                max={26}
                value={formData.backRows}
                onChange={(e) => setFormData({ ...formData, backRows: Number(e.target.value) })}
              />
              <TextInput
                label="Rang - Spalten"
                type="number"
                min={0}
                value={formData.backCols}
                onChange={(e) => setFormData({ ...formData, backCols: Number(e.target.value) })}
              />
            </Group>
            
            <Text size="sm" c="dimmed">
              Gesamtplätze werden automatisch berechnet: (Linke Reihen × Linke Spalten) + (Rechte Reihen × Rechte Spalten) + (Rang-Reihen × Rang-Spalten) = {formData.leftRows * formData.leftCols + formData.rightRows * formData.rightCols + formData.backRows * formData.backCols} Plätze
            </Text>
            
            <Group justify="flex-end" gap="xs">
              <Button
                variant="subtle"
                onClick={() => {
                  setCreateModalOpen(false)
                  setEditModalOpen(false)
                  setSelectedEvent(null)
                  resetForm()
                }}
              >
                Abbrechen
              </Button>
              <Button
                type="submit"
                loading={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {editModalOpen ? 'Veranstaltung aktualisieren' : 'Veranstaltung erstellen'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Bookings Modal */}
      <Modal
        opened={!!viewBookingsEventId}
        onClose={() => setViewBookingsEventId(null)}
        title={`Buchungen für ${bookingsEvent?.title || ''}`}
        size="xl"
      >
        {bookingsEvent && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Gesamtplätze</Text>
                  <Text size="lg" fw={700}>{bookingsEvent.totalSeats}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Gebucht</Text>
                  <Text size="lg" fw={700} c="red">{bookedSeats.length}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Verfügbar</Text>
                  <Text size="lg" fw={700} c="green">
                    {bookingsEvent.seats.filter(s => s.status === 'AVAILABLE').length}
                  </Text>
                </div>
              </Group>
            </Paper>

            {/* Seat Visualization */}
            <Paper p="md" withBorder>
              <Title order={4} size="h5" mb="md">Sitzplan</Title>
              <Stack gap="sm">
                {/* Back Section - Centered at the top */}
                {(() => {
                  const backSeats = bookingsEvent.seats.filter(seat => seat.section === 'RANG')
                  const backSeatsByRow = backSeats.reduce((acc, seat) => {
                    if (!acc[seat.row]) acc[seat.row] = []
                    acc[seat.row].push(seat)
                    return acc
                  }, {} as Record<string, typeof backSeats>)
                  const backRows = Object.keys(backSeatsByRow).sort().reverse()
                  
                  return backRows.length > 0 && (
                    <>
                      {backRows.map((row) => (
                        <Group key={`back-${row}`} gap="md" justify="center">
                          <Text fw={700} w={30}>{row}</Text>
                          <Group gap="xs">
                            {(backSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => (
                              <Button
                                key={seat.id}
                                size="sm"
                                color={seat.status === 'BOOKED' ? 'red' : 'green'}
                                variant="light"
                                disabled
                                style={{ width: 50 }}
                              >
                                {seat.number}
                              </Button>
                            ))}
                          </Group>
                          <Text fw={700} w={30}>{row}</Text>
                        </Group>
                      ))}
                      <div style={{ height: '20px' }} />
                    </>
                  )
                })()}

                {/* Main sections (Left and Right) */}
                {(() => {
                  const leftSeats = bookingsEvent.seats.filter(seat => seat.section === 'LEFT')
                  const rightSeats = bookingsEvent.seats.filter(seat => seat.section === 'RIGHT')
                  
                  const leftSeatsByRow = leftSeats.reduce((acc, seat) => {
                    if (!acc[seat.row]) acc[seat.row] = []
                    acc[seat.row].push(seat)
                    return acc
                  }, {} as Record<string, typeof leftSeats>)
                  
                  const rightSeatsByRow = rightSeats.reduce((acc, seat) => {
                    if (!acc[seat.row]) acc[seat.row] = []
                    acc[seat.row].push(seat)
                    return acc
                  }, {} as Record<string, typeof rightSeats>)
                  
                  const allRows = Array.from(new Set([
                    ...Object.keys(leftSeatsByRow),
                    ...Object.keys(rightSeatsByRow)
                  ])).sort().reverse()

                  return allRows.map((row) => (
                    <Group key={row} gap="md" justify="center" align="flex-start">
                      {/* Left Section */}
                      <Group gap="xs" justify="flex-end" style={{ minWidth: '300px' }}>
                        <Text fw={700} w={30}>{row}</Text>
                        <Group gap="xs">
                          {(leftSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => (
                            <Button
                              key={seat.id}
                              size="sm"
                              color={seat.status === 'BOOKED' ? 'red' : 'green'}
                              variant="light"
                              disabled
                              style={{ width: 50 }}
                            >
                              {seat.number}
                            </Button>
                          ))}
                        </Group>
                      </Group>

                      {/* Aisle/Gap between sections */}
                      <div style={{ width: '60px' }} />

                      {/* Right Section */}
                      <Group gap="xs" justify="flex-start" style={{ minWidth: '300px' }}>
                        <Group gap="xs">
                          {(rightSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => (
                            <Button
                              key={seat.id}
                              size="sm"
                              color={seat.status === 'BOOKED' ? 'red' : 'green'}
                              variant="light"
                              disabled
                              style={{ width: 50 }}
                            >
                              {seat.number}
                            </Button>
                          ))}
                        </Group>
                        <Text fw={700} w={30}>{row}</Text>
                      </Group>
                    </Group>
                  ))
                })()}
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

              <Group gap="md" mt="lg">
                <Group gap="xs">
                  <Button size="xs" color="green" variant="light" disabled>Verfügbar</Button>
                </Group>
                <Group gap="xs">
                  <Button size="xs" color="red" variant="light" disabled>Gebucht</Button>
                </Group>
              </Group>
            </Paper>

            {bookedSeats.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Platz</Table.Th>
                    <Table.Th>Kundenname</Table.Th>
                    <Table.Th>Verkäufer</Table.Th>
                    <Table.Th>Ticketnummer</Table.Th>
                    <Table.Th>Gebucht am</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {bookedSeats.map((seat) => (
                    <Table.Tr key={seat.id}>
                      <Table.Td>{seat.section} {seat.row}{seat.number}</Table.Td>
                      <Table.Td>{seat.bookedBy || 'N/A'}</Table.Td>
                      <Table.Td>
                        {seat.booking 
                          ? `${seat.booking.sellerFirstName} ${seat.booking.sellerLastName}`
                          : 'N/A'
                        }
                      </Table.Td>
                      <Table.Td>{seat.ticketNumber || 'N/A'}</Table.Td>
                      <Table.Td>
                        {seat.bookedAt 
                          ? new Date(seat.bookedAt).toLocaleString('de-DE')
                          : 'N/A'
                        }
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                Noch keine Buchungen für diese Veranstaltung.
              </Text>
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  )
}
