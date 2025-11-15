import { useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import EventEmitter from 'eventemitter3'

import { FloatingButtons } from '../components/hud/FloatingButtons'
import { TopHUD } from '../components/hud/TopHUD'
import { HistoryPanel } from '../components/panels/HistoryPanel'
import { InventoryPanel } from '../components/panels/InventoryPanel'
import { SessionOverlay } from '../components/session/SessionOverlay'
import { VictoryModal } from '../components/session/VictoryModal'
import { PhaserCanvas } from '../components/world/PhaserCanvas'
import {
  useEquipCosmeticMutation,
  useHeroProfileQuery,
  useInventoryQuery,
  useSessionHistoryQuery,
  useTasksQuery,
  useWorldStateQuery,
} from '../hooks/useLifeosData'
import { SessionProvider, useSessionManager } from '../hooks/useSessionManager'
import { WorldEventsContext } from '../lib/world/events'
import type { WorldEventMap, WorldEvents } from '../lib/world/events'

export const Route = createFileRoute('/world')({
  component: () => {
    const events = useMemo<WorldEvents>(() => new EventEmitter<WorldEventMap>(), [])

    return (
      <WorldEventsContext.Provider value={events}>
        <SessionProvider>
          <WorldScreen events={events} />
        </SessionProvider>
      </WorldEventsContext.Provider>
    )
  },
})

const WorldScreen = ({ events }: { events: WorldEvents }) => {
  const [activePanel, setActivePanel] = useState<'tasks' | 'inventory' | 'history' | null>('tasks')
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)

  const heroQuery = useHeroProfileQuery()
  const worldQuery = useWorldStateQuery()
  const tasksQuery = useTasksQuery()
  const inventoryQuery = useInventoryQuery()
  const historyQuery = useSessionHistoryQuery()
  const session = useSessionManager()
  const equipCosmetic = useEquipCosmeticMutation()

  useEffect(() => {
    if (!worldQuery.data?.world) {
      return
    }

    events.emit('world:update', worldQuery.data.world)
  }, [events, worldQuery.data])

  useEffect(() => {
    const handleEnter = (room: string) => setCurrentRoom(room)
    const handleLeave = () => setCurrentRoom(null)

    events.on('room:entered', handleEnter)
    events.on('room:left', handleLeave)

    return () => {
      events.off('room:entered', handleEnter)
      events.off('room:left', handleLeave)
    }
  }, [events])

  if (heroQuery.isLoading || worldQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-200">
        Booting your world...
      </div>
    )
  }

  if (heroQuery.isError || worldQuery.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center text-slate-200">
        Unable to load the LifeOS world. Check the API connection.
      </div>
    )
  }

  const hero = heroQuery.data?.hero
  const world = worldQuery.data?.world

  if (!hero || !world) {
    return null
  }

  const streakText = world.streakCount > 0 ? `Day ${world.streakCount} streak — keep the flame alive!` : undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
        <TopHUD hero={hero} world={world} streakText={streakText} />

        <div className="grid grid-cols-[auto_1fr_auto] items-start gap-6">
          <FloatingButtons
            activePanel={activePanel}
            onToggle={(panel) => setActivePanel((prev) => (prev === panel ? null : panel))}
          />

          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/60 shadow-2xl shadow-slate-950/40">
            <PhaserCanvas />
            {session.overlayOpen && session.activeSession ? (
              <SessionOverlay
                session={session.activeSession}
                onCancel={session.cancelSession}
                onComplete={session.completeSession}
              />
            ) : null}
          </div>

          <div className="space-y-4">
            {session.error ? (
              <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 flex items-center justify-between">
                <span>{session.error}</span>
                <button
                  type="button"
                  className="ml-3 rounded-full border border-rose-400/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500/20"
                  onClick={session.clearError}
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            {activePanel === 'tasks' ? (
              <div className="space-y-2">
                {tasksQuery.isError ? (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                    Failed to load tasks. Try again soon.
                  </p>
                ) : null}
                <TasksPanel
                  tasks={tasksQuery.data ?? []}
                  onStart={session.startSession}
                  currentRoom={currentRoom}
                />
              </div>
            ) : null}
            {activePanel === 'inventory' ? (
              <div className="space-y-2">
                {equipCosmetic.isError ? (
                  <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200">
                    Unable to update equipment right now.
                  </p>
                ) : null}
                <InventoryPanel
                  items={inventoryQuery.data ?? []}
                  onEquip={(payload) => equipCosmetic.mutate(payload)}
                />
              </div>
            ) : null}
            {activePanel === 'history' ? (
              <div className="space-y-2">
                {historyQuery.isError ? (
                  <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                    Session history is unavailable.
                  </p>
                ) : null}
                <HistoryPanel sessions={historyQuery.data ?? []} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {session.victorySummary ? (
        <VictoryModal summary={session.victorySummary} onClose={session.dismissVictory} />
      ) : null}
    </div>
  )
}
