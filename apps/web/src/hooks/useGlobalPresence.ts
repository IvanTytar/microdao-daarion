'use client'

import { useState, useEffect } from 'react'
import { globalPresenceClient, RoomPresence } from '@/lib/global-presence'

/**
 * Hook for subscribing to global room presence updates via SSE
 */
export function useGlobalPresence() {
  const [cityOnline, setCityOnline] = useState(0)
  const [roomsPresence, setRoomsPresence] = useState<Record<string, RoomPresence>>({})

  useEffect(() => {
    const unsubscribe = globalPresenceClient.subscribe((newCityOnline, newRoomsPresence) => {
      setCityOnline(newCityOnline)
      setRoomsPresence(newRoomsPresence)
    })

    return unsubscribe
  }, [])

  return { cityOnline, roomsPresence }
}

/**
 * Hook for getting presence of a specific room by ID
 */
export function useRoomPresence(roomId: string): RoomPresence | null {
  const { roomsPresence } = useGlobalPresence()
  return roomsPresence[roomId] || null
}

