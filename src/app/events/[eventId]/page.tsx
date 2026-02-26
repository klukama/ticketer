'use client'

import React from 'react'
import { Container, Title, Text, Badge, Button, Group, Stack, Paper, TextInput } from '@mantine/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { use, useState, useMemo, useRef, useEffect } from 'react'
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
  backRows: number
  backCols: number
  seatsPerRow: number
  aisleAfterSeat: number
  backAisleAfterSeat: number
  rowGroupConfigs?: string | null
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
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 3
  const ZOOM_STEP = 0.25

  const [zoomScale, setZoomScale] = useState(1)
  const seatMapContainerRef = useRef<HTMLDivElement>(null)
  const lastTouchDistRef = useRef<number | null>(null)

  useEffect(() => {
    const container = seatMapContainerRef.current
    if (!container) return

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        lastTouchDistRef.current = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistRef.current !== null) {
        e.preventDefault()
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const delta = dist - lastTouchDistRef.current
        setZoomScale(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + delta * 0.01)))
        lastTouchDistRef.current = dist
      }
    }

    const onTouchEnd = () => {
      lastTouchDistRef.current = null
    }

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        setZoomScale(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev - e.deltaY * 0.005)))
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchmove', onTouchMove, { passive: false })
    container.addEventListener('touchend', onTouchEnd)
    container.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchmove', onTouchMove)
      container.removeEventListener('touchend', onTouchEnd)
      container.removeEventListener('wheel', onWheel)
    }
  }, [])

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

  // Derive the effective selected seats: exclude any that are no longer AVAILABLE
  // (e.g. booked concurrently by another customer). This avoids calling setState
  // inside an effect while still keeping the UI in sync with real-time data.
  const effectiveSelectedSeats = useMemo(() => {
    if (!event) return selectedSeats
    return selectedSeats.filter(seatId => {
      const seat = event.seats.find(s => s.id === seatId)
      return !seat || seat.status === 'AVAILABLE'
    })
  }, [event, selectedSeats])

  const prevUnavailableCountRef = useRef(0)
  // Show a notification when freshly-selected seats become unavailable
  useEffect(() => {
    if (!event) return
    const count = selectedSeats.length - effectiveSelectedSeats.length
    if (count > 0 && count !== prevUnavailableCountRef.current) {
      notifications.show({
        title: 'Hinweis',
        message: `${count} Platz${count > 1 ? 'e wurden' : ' wurde'} von jemand anderem gebucht und steht nicht mehr zur Verfügung.`,
        color: 'orange',
      })
    }
    prevUnavailableCountRef.current = count
  }, [event, selectedSeats, effectiveSelectedSeats])

  const bookSeatsMutation = useMutation({
    mutationFn: async () => {
      const ticketNumbersArray = effectiveSelectedSeats.map(seatId => ticketNumbers[seatId] || '')
      
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          seatIds: effectiveSelectedSeats,
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
    if (seat.status === 'BOOKED') return 'gray'
    if (seat.status === 'RESERVED') return 'yellow'
    return 'green'
  }

  // Memoize the validation check to avoid unnecessary re-computation
  const areAllTicketNumbersFilled = useMemo(() => {
    return !effectiveSelectedSeats.some(seatId => !ticketNumbers[seatId]?.trim())
  }, [effectiveSelectedSeats, ticketNumbers])

  if (isLoading) return <Container size="lg" py="xl"><Text>Lädt...</Text></Container>
  if (!event) return <Container size="lg" py="xl"><Text>Veranstaltung nicht gefunden</Text></Container>

  // Group seats by section and row
  const mainSeats = event.seats.filter(seat => seat.section === 'MAIN' || seat.section === 'PARKETT')
  const leftSeats = event.seats.filter(seat => seat.section === 'LEFT')
  const rightSeats = event.seats.filter(seat => seat.section === 'RIGHT')
  const backSeats = event.seats.filter(seat => seat.section === 'RANG')

  // Build per-row aisle map from rowGroupConfigs if available
  const rowAisleMap: Record<string, number> = {}
  if (event.rowGroupConfigs) {
    try {
      const groups: Array<{ rows: number; seatsPerRow: number; aisleAfterSeat: number }> = JSON.parse(event.rowGroupConfigs)
      let rowIdx = 0
      for (const g of groups) {
        for (let r = 0; r < g.rows; r++) {
          rowAisleMap[String.fromCharCode(65 + rowIdx++)] = g.aisleAfterSeat || 0
        }
      }
    } catch { /* ignore */ }
  }
  const getMainRowAisle = (row: string) =>
    Object.keys(rowAisleMap).length > 0 ? (rowAisleMap[row] ?? 0) : event.aisleAfterSeat

  const groupByRow = (seats: Seat[]) => {
    return seats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = []
      acc[seat.row].push(seat)
      return acc
    }, {} as Record<string, Seat[]>)
  }

  const isFlexibleLayout = mainSeats.length > 0

  const mainSeatsByRow = groupByRow(mainSeats)
  const leftSeatsByRow = groupByRow(leftSeats)
  const rightSeatsByRow = groupByRow(rightSeats)
  const backSeatsByRow = groupByRow(backSeats)

  // Rows in REVERSE alphabetical order (Z→A), so A is closest to stage (bottom)
  const mainRows = Object.keys(mainSeatsByRow).sort().reverse()
  const allRows = Array.from(new Set([
    ...Object.keys(leftSeatsByRow),
    ...Object.keys(rightSeatsByRow)
  ])).sort().reverse()

  // Get back section rows separately - also in reverse order
  const backRows = Object.keys(backSeatsByRow).sort().reverse()

  const renderSeatButton = (seat: Seat) => (
    <Button
      key={seat.id}
      size="xs"
      color={getSeatColor(seat)}
      variant={selectedSeats.includes(seat.id) ? 'filled' : 'light'}
      onClick={() => toggleSeat(seat.id, seat.status)}
      disabled={seat.status !== 'AVAILABLE'}
      style={{ width: 44, minWidth: 44, flexShrink: 0 }}
    >
      {seat.number}
    </Button>
  )

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
          <Group justify="space-between" align="center" mb="md" wrap="wrap" gap="xs">
            <Title order={2} size="h3">Wählen Sie Ihre Plätze</Title>
            <Group gap="xs" align="center">
              <Button
                size="xs"
                variant="default"
                onClick={() => setZoomScale(prev => Math.max(MIN_ZOOM, prev - ZOOM_STEP))}
                title="Verkleinern"
                style={{ fontWeight: 700, fontSize: '1rem', minWidth: 32 }}
              >−</Button>
              <Text size="sm" ta="center" style={{ minWidth: 42 }}>{Math.round(zoomScale * 100)}%</Text>
              <Button
                size="xs"
                variant="default"
                onClick={() => setZoomScale(prev => Math.min(MAX_ZOOM, prev + ZOOM_STEP))}
                title="Vergrößern"
                style={{ fontWeight: 700, fontSize: '1rem', minWidth: 32 }}
              >+</Button>
              <Button
                size="xs"
                variant="subtle"
                onClick={() => setZoomScale(1)}
                title="Zoom zurücksetzen"
              >Reset</Button>
            </Group>
          </Group>

          {/* Scrollable zoomable seat map */}
          <div
            ref={seatMapContainerRef}
            style={{
              overflow: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              maxHeight: '60vh',
              touchAction: 'pan-x pan-y',
              WebkitOverflowScrolling: 'touch',
            } as React.CSSProperties}
          >
            <div style={{ zoom: zoomScale, padding: '16px', minWidth: 'max-content' } as React.CSSProperties & { zoom: number }}>
              <Stack gap="sm">
                {/* Back Section (RANG) - Centered at the top */}
                {backRows.length > 0 && (
                  <>
                    {backRows.map((row) => {
                      const rowSeats = (backSeatsByRow[row] || []).sort((a, b) => a.number - b.number)
                      const aisle = event.backAisleAfterSeat
                      return (
                        <Group key={`back-${row}`} gap="md" justify="center" wrap="nowrap">
                          <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                          <Group gap="xs" wrap="nowrap" justify="center">
                            {rowSeats.map((seat) => (
                              <React.Fragment key={seat.id}>
                                {renderSeatButton(seat)}
                                {aisle > 0 && seat.number === aisle && (
                                  <div style={{ width: '20px', flexShrink: 0 }} />
                                )}
                              </React.Fragment>
                            ))}
                          </Group>
                          <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                        </Group>
                      )
                    })}
                    {/* Spacer between back section and main sections */}
                    <div style={{ height: '20px' }} />
                  </>
                )}

                {isFlexibleLayout ? (
                  /* New flexible layout: MAIN/PARKETT section rows centered with optional aisle */
                  mainRows.map((row) => {
                    const rowSeats = (mainSeatsByRow[row] || []).sort((a, b) => a.number - b.number)
                    const aisle = getMainRowAisle(row)
                    return (
                      <Group key={row} gap="md" justify="center" wrap="nowrap">
                        <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                        <Group gap="xs" wrap="nowrap" justify="center">
                          {rowSeats.map((seat) => (
                            <React.Fragment key={seat.id}>
                              {renderSeatButton(seat)}
                              {aisle > 0 && seat.number === aisle && (
                                <div style={{ width: '20px', flexShrink: 0 }} />
                              )}
                            </React.Fragment>
                          ))}
                        </Group>
                        <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                      </Group>
                    )
                  })
                ) : (
                  /* Legacy layout: LEFT and RIGHT sections */
                  allRows.map((row) => (
                    <Group key={row} gap="md" justify="center" align="flex-start" wrap="nowrap">
                      {/* Left Section */}
                      <Group gap="xs" justify="flex-end" style={{ flexShrink: 0 }} wrap="nowrap">
                        <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                        <Group gap="xs" wrap="nowrap" justify="flex-end">
                          {(leftSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => renderSeatButton(seat))}
                        </Group>
                      </Group>

                      {/* Aisle/Gap between sections */}
                      <div style={{ width: '20px', flexShrink: 0 }} />

                      {/* Right Section */}
                      <Group gap="xs" justify="flex-start" style={{ flexShrink: 0 }} wrap="nowrap">
                        <Group gap="xs" wrap="nowrap" justify="flex-start">
                          {(rightSeatsByRow[row] || []).sort((a, b) => a.number - b.number).map(seat => renderSeatButton(seat))}
                        </Group>
                        <Text fw={700} w={30} style={{ flexShrink: 0 }}>{row}</Text>
                      </Group>
                    </Group>
                  ))
                )}
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
                  fontSize: '1.2rem',
                }}
              >
                Bühne
              </Paper>
            </div>
          </div>

          <Group gap="md" mt="sm" wrap="wrap">
            <Button size="xs" color="green" variant="light">Verfügbar</Button>
            <Button size="xs" color="blue" variant="filled">Ausgewählt</Button>
            <Button size="xs" color="gray" variant="light" disabled>Gebucht</Button>
          </Group>
        </Paper>

        {effectiveSelectedSeats.length > 0 && (
          <Paper shadow="sm" p="md" radius="md" withBorder>
            <Title order={3} size="h4" mb="md">Buchung abschließen</Title>
            <Text mb="md">Ausgewählte Plätze: {effectiveSelectedSeats.length}</Text>
            
            <Stack gap="md">
              <div>
                <Title order={4} size="h5" mb="xs">Kunde</Title>
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
                <Title order={4} size="h5" mb="xs">Verkäufer</Title>
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
                  {effectiveSelectedSeats.map((seatId, index) => {
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
                {effectiveSelectedSeats.length} Platz{effectiveSelectedSeats.length > 1 ? 'e' : ''} buchen
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
