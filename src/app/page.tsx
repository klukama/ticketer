'use client'

import { Container, Title, Text, Card, Group, Badge, Button, Stack } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
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

export default function Home() {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await fetch('/api/events')
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json()
    },
  })

  return (
    <Container size="lg" py="xl">
      <Title order={1} mb="lg">What's On</Title>
      <Text size="lg" c="dimmed" mb="xl">
        Browse upcoming events and book your seats
      </Text>

      {isLoading && <Text>Loading events...</Text>}

      <Stack gap="md">
        {events?.map((event) => (
          <Card key={event.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Title order={3}>{event.title}</Title>
              <Badge color="blue" variant="light">
                {new Date(event.date).toLocaleDateString()}
              </Badge>
            </Group>

            <Text size="sm" c="dimmed" mb="md">
              {event.venue}
            </Text>

            {event.description && (
              <Text size="sm" mb="md">
                {event.description}
              </Text>
            )}

            <Group justify="space-between" mt="md">
              <Text size="sm" c="dimmed">
                {event.totalSeats} total seats
              </Text>
              <Link href={`/events/${event.id}`}>
                <Button variant="filled" color="blue">
                  View Seats
                </Button>
              </Link>
            </Group>
          </Card>
        ))}

        {!isLoading && events?.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No events available at the moment
          </Text>
        )}
      </Stack>
    </Container>
  )
}
