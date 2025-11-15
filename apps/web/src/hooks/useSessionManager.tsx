import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import { useWorldEvents } from '../lib/world/events'

import { useSessionMutations } from './useLifeosData'

import type { ReactNode } from 'react'
import type { FocusSession, RewardSummary } from '@os/types'

interface StartSessionPayload {
  taskId?: string
  durationMinutes: number
}

interface SessionContextValue {
  activeSession: FocusSession | null
  overlayOpen: boolean
  victorySummary: RewardSummary | null
  error: string | null
  startSession: (payload: StartSessionPayload) => Promise<void>
  cancelSession: () => Promise<void>
  completeSession: () => Promise<RewardSummary | null>
  dismissVictory: () => void
  clearError: () => void
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined)

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const events = useWorldEvents()
  const { start, complete, cancel } = useSessionMutations()
  const [activeSession, setActiveSession] = useState<FocusSession | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [victorySummary, setVictorySummary] = useState<RewardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const startSession = useCallback(
    async (payload: StartSessionPayload) => {
      setError(null)
      setVictorySummary(null)

      try {
        const session = await start.mutateAsync(payload)
        setActiveSession(session)
        setOverlayOpen(true)
        events?.emit('session:lock')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start session')
      }
    },
    [events, start],
  )

  const cancelSession = useCallback(async () => {
    if (!activeSession) {
      return
    }

    try {
      await cancel.mutateAsync({ sessionId: activeSession.id })
      setOverlayOpen(false)
      setActiveSession(null)
      events?.emit('session:unlock')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to cancel session')
    }
  }, [activeSession, cancel, events])

  const completeSession = useCallback(async () => {
    if (!activeSession) {
      return null
    }

    try {
      const result = await complete.mutateAsync(activeSession.id)
      setVictorySummary(result)
      setOverlayOpen(false)
      setActiveSession(null)
      events?.emit('session:unlock')
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete session')
      return null
    }
  }, [activeSession, complete, events])

  const value = useMemo<SessionContextValue>(
    () => ({
      activeSession,
      overlayOpen,
      victorySummary,
      error,
      startSession,
      cancelSession,
      completeSession,
      dismissVictory: () => setVictorySummary(null),
      clearError: () => setError(null),
    }),
    [
      activeSession,
      overlayOpen,
      victorySummary,
      error,
      startSession,
      cancelSession,
      completeSession,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSessionManager = () => {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useSessionManager must be used within SessionProvider')
  }

  return context
}
