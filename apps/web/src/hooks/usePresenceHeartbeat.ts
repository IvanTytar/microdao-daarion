'use client'

import { useEffect, useRef, useCallback } from 'react'

type PresenceStatus = 'online' | 'unavailable' | 'offline'

interface UsePresenceHeartbeatOptions {
  matrixUserId: string | null
  accessToken: string | null
  intervalMs?: number
  awayAfterMs?: number  // Time of inactivity before setting "unavailable"
  enabled?: boolean
}

/**
 * Hook to send presence heartbeats to Matrix via gateway.
 * 
 * - Sends "online" status on mount and every intervalMs
 * - Optionally tracks user activity and sends "unavailable" after inactivity
 * - Sends "offline" on unmount
 */
export function usePresenceHeartbeat({
  matrixUserId,
  accessToken,
  intervalMs = 30000,
  awayAfterMs = 5 * 60 * 1000, // 5 minutes
  enabled = true,
}: UsePresenceHeartbeatOptions) {
  const lastActivityRef = useRef(Date.now())
  const currentStatusRef = useRef<PresenceStatus>('online')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const sendPresence = useCallback(async (status: PresenceStatus) => {
    if (!matrixUserId || !accessToken) return

    try {
      const response = await fetch('/api/internal/matrix/presence/online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matrix_user_id: matrixUserId,
          access_token: accessToken,
          status,
        }),
      })

      if (response.ok) {
        currentStatusRef.current = status
        console.debug(`[Presence] Set to ${status}`)
      } else {
        console.warn('[Presence] Failed to set status:', await response.text())
      }
    } catch (error) {
      console.error('[Presence] Error sending heartbeat:', error)
    }
  }, [matrixUserId, accessToken])

  // Track user activity
  useEffect(() => {
    if (!enabled || !matrixUserId || !accessToken) return

    const updateActivity = () => {
      lastActivityRef.current = Date.now()
      
      // If was away, come back online
      if (currentStatusRef.current === 'unavailable') {
        sendPresence('online')
      }
    }

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity)
      })
    }
  }, [enabled, matrixUserId, accessToken, sendPresence])

  // Main heartbeat loop
  useEffect(() => {
    if (!enabled || !matrixUserId || !accessToken) return

    const heartbeat = async () => {
      const now = Date.now()
      const timeSinceActivity = now - lastActivityRef.current

      // Check if user is inactive
      if (awayAfterMs > 0 && timeSinceActivity > awayAfterMs) {
        if (currentStatusRef.current !== 'unavailable') {
          await sendPresence('unavailable')
        }
      } else {
        await sendPresence('online')
      }
    }

    // Send initial heartbeat
    heartbeat()

    // Set up interval
    intervalRef.current = setInterval(heartbeat, intervalMs)

    // Cleanup: send offline on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      
      // Send offline (fire and forget)
      if (matrixUserId && accessToken) {
        fetch('/api/internal/matrix/presence/online', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matrix_user_id: matrixUserId,
            access_token: accessToken,
            status: 'offline',
          }),
          keepalive: true, // Ensure request completes even on page unload
        }).catch(() => {})
      }
    }
  }, [enabled, matrixUserId, accessToken, intervalMs, awayAfterMs, sendPresence])

  // Also send offline on page visibility change
  useEffect(() => {
    if (!enabled || !matrixUserId || !accessToken) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        sendPresence('unavailable')
      } else {
        lastActivityRef.current = Date.now()
        sendPresence('online')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, matrixUserId, accessToken, sendPresence])
}

