'use client'

import { useState, useEffect } from 'react'
import { globalPresenceClient, RoomPresence } from '@/lib/global-presence'

/**
 * Hook for subscribing to global room presence updates
 */
export function useGlobalPresence(): Record<string, RoomPresence> {
  const [presence, setPresence] = useState<Record<string, RoomPresence>>({})

  useEffect(() => {
    const unsubscribe = globalPresenceClient.subscribe((newPresence) => {
      setPresence(newPresence)
    })

    return unsubscribe
  }, [])

  return presence
}

/**
 * Hook for getting presence of a specific room
 */
export function useRoomPresence(slug: string): RoomPresence | null {
  const allPresence = useGlobalPresence()
  return allPresence[slug] || null
}

