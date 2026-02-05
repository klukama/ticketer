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

interface Seat {
  id: string
  eventId: string
  row: string
  number: number
  status: 'AVAILABLE' | 'RESERVED' | 'BOOKED'
  bookedBy: string | null
  bookedAt: string | null
}

interface EventWithSeats extends Event {
  seats: Seat[]
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
    totalSeats: 30,
    imageUrl: '',
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
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          totalSeats: Number(data.totalSeats),
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
        title: 'Success!',
        message: 'Event created successfully.',
        color: 'green',
      })
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to create event.',
        color: 'red',
      })
    },
  })

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          totalSeats: Number(data.totalSeats),
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
        title: 'Success!',
        message: 'Event updated successfully.',
        color: 'green',
      })
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to update event.',
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
        title: 'Success!',
        message: 'Event deleted successfully.',
        color: 'green',
      })
    },
    onError: () => {
      notifications.show({
        title: 'Error',
        message: 'Failed to delete event.',
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
      totalSeats: 30,
      imageUrl: '',
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
    
    setFormData({
      title: event.title,
      description: event.description || '',
      venue: event.venue,
      date: formattedDate,
      totalSeats: event.totalSeats,
      imageUrl: event.imageUrl || '',
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
    if (confirm(`Are you sure you want to delete &quot;${title}&quot;?`)) {
      deleteEventMutation.mutate(id)
    }
  }

  const bookedSeats = bookingsEvent?.seats.filter(s => s.status === 'BOOKED') || []
  const currentDate = new Date()

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1}>Admin Panel</Title>
          <Text c="dimmed">Manage events and view bookings</Text>
        </div>
        <Group>
          <Link href="/">
            <Button variant="subtle">View Public Site</Button>
          </Link>
          <Button onClick={() => setCreateModalOpen(true)}>
            Create New Event
          </Button>
        </Group>
      </Group>

      {isLoading && <Text>Loading events...</Text>}

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
                      <Badge color="gray" variant="light">Past Event</Badge>
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
                    Total Seats: {event.totalSeats}
                  </Text>
                </div>

                <Group gap="xs">
                  <Button
                    variant="light"
                    color="blue"
                    onClick={() => setViewBookingsEventId(event.id)}
                  >
                    View Bookings
                  </Button>
                  <Button
                    variant="light"
                    onClick={() => openEditModal(event)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    onClick={() => handleDelete(event.id, event.title)}
                  >
                    Delete
                  </Button>
                </Group>
              </Group>
            </Card>
          )
        })}

        {!isLoading && events?.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No events created yet. Click &quot;Create New Event&quot; to get started.
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
        title={editModalOpen ? 'Edit Event' : 'Create New Event'}
        size="lg"
      >
        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Event Title"
              placeholder="e.g., Summer Music Festival"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
            
            <Textarea
              label="Description"
              placeholder="Event description..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              minRows={3}
            />
            
            <TextInput
              label="Venue"
              placeholder="e.g., City Arena"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              required
            />
            
            <TextInput
              label="Date & Time"
              type="datetime-local"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
            
            <TextInput
              label="Total Seats"
              type="number"
              min={1}
              value={formData.totalSeats}
              onChange={(e) => setFormData({ ...formData, totalSeats: Number(e.target.value) })}
              required
            />
            
            <TextInput
              label="Image URL (optional)"
              placeholder="https://example.com/image.jpg"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            />
            
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
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createEventMutation.isPending || updateEventMutation.isPending}
              >
                {editModalOpen ? 'Update Event' : 'Create Event'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View Bookings Modal */}
      <Modal
        opened={!!viewBookingsEventId}
        onClose={() => setViewBookingsEventId(null)}
        title={`Bookings for ${bookingsEvent?.title || ''}`}
        size="xl"
      >
        {bookingsEvent && (
          <Stack gap="md">
            <Paper p="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="dimmed">Total Seats</Text>
                  <Text size="lg" fw={700}>{bookingsEvent.totalSeats}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Booked</Text>
                  <Text size="lg" fw={700} c="red">{bookedSeats.length}</Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">Available</Text>
                  <Text size="lg" fw={700} c="green">
                    {bookingsEvent.seats.filter(s => s.status === 'AVAILABLE').length}
                  </Text>
                </div>
              </Group>
            </Paper>

            {bookedSeats.length > 0 ? (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Seat</Table.Th>
                    <Table.Th>Customer Name</Table.Th>
                    <Table.Th>Booked At</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {bookedSeats.map((seat) => (
                    <Table.Tr key={seat.id}>
                      <Table.Td>{seat.row}{seat.number}</Table.Td>
                      <Table.Td>{seat.bookedBy || 'N/A'}</Table.Td>
                      <Table.Td>
                        {seat.bookedAt 
                          ? new Date(seat.bookedAt).toLocaleString()
                          : 'N/A'
                        }
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No bookings yet for this event.
              </Text>
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  )
}
