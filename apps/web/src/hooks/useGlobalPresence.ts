'use client'

import { useState, useEffect } from 'react'
import { globalPresenceClient, RoomPresence, AgentPresence } from '@/lib/global-presence'

/**
 * Hook for subscribing to global room presence updates via SSE
 */
export function useGlobalPresence() {
  const [cityOnline, setCityOnline] = useState(0)
  const [roomsPresence, setRoomsPresence] = useState<Record<string, RoomPresence>>({})
  const [agents, setAgents] = useState<AgentPresence[]>([])

  useEffect(() => {
    const unsubscribe = globalPresenceClient.subscribe((newCityOnline, newRoomsPresence, newAgents) => {
      setCityOnline(newCityOnline)
      setRoomsPresence(newRoomsPresence)
      setAgents(newAgents)
    })

    return unsubscribe
  }, [])

  return { cityOnline, roomsPresence, agents }
}

/**
 * Hook for getting presence of a specific room by ID
 */
export function useRoomPresence(roomId: string): RoomPresence | null {
  const { roomsPresence } = useGlobalPresence()
  return roomsPresence[roomId] || null
}

/**
 * Hook for getting agents in a specific room
 */
export function useRoomAgents(roomId: string): AgentPresence[] {
  const { agents } = useGlobalPresence()
  return agents.filter(a => a.room_id === roomId)
}

