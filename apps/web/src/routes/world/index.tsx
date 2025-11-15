import { useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import type { FocusRoom, RewardSummary, StartSessionResponse, TaskTemplate } from '@os/types'
import { Button } from '@os/ui'

import { FloatingButtons } from '../../components/FloatingButtons'
import { HistoryPanel } from '../../components/HistoryPanel'
import { InventoryPanel } from '../../components/InventoryPanel'
import { SessionOverlay } from '../../components/SessionOverlay'
import { TasksPanel } from '../../components/TasksPanel'
import { TopHUD } from '../../components/TopHUD'
import { VictoryModal } from '../../components/VictoryModal'
import { WorldCanvas } from '../../components/WorldCanvas'
import { apiClient } from '../../lib/api-client'

type RoomKey = FocusRoom

type ActivePanel = 'tasks' | 'inventory' | 'history' | null

type WorldWithLayers = Awaited<ReturnType<typeof apiClient.getWorld>>

export const Route = createFileRoute('/world')({ component: WorldRoute })

function WorldRoute() {
  const queryClient = useQueryClient()
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [focusedTask, setFocusedTask] = useState<TaskTemplate | null>(null)
  const [presetDuration, setPresetDuration] = useState<25 | 50 | 90 | null>(null)
  const [activeSession, setActiveSession] = useState<StartSessionResponse | null>(null)
  const [secondsRemaining, setSecondsRemaining] = useState(0)
  const [victory, setVictory] = useState<RewardSummary | null>(null)
  const [currentRoom, setCurrentRoom] = useState<RoomKey>('plaza')
  const [movementLocked, setMovementLocked] = useState(false)
  const [glowSignal, setGlowSignal] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.getProfile(),
  })

  const worldQuery = useQuery({
    queryKey: ['world'],
    queryFn: () => apiClient.getWorld(),
  })

  const tasksQuery = useQuery({
    queryKey: ['tasks'],
    queryFn: () => apiClient.getTasks(),
  })

  const inventoryQuery = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiClient.getInventory(),
  })

  const historyQuery = useQuery({
    queryKey: ['history'],
    queryFn: () => apiClient.getSessionHistory(),
  })

  useEffect(() => {
    if (!activeSession) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeSession])

  const startSessionMutation = useMutation({
    mutationFn: apiClient.startSession,
    onSuccess: (session) => {
      setActiveSession(session)
      setSecondsRemaining(session.durationMinutes * 60)
      setMovementLocked(true)
    },
    onError: (error: unknown) => {
      console.error('Failed to start session', error)
    },
  })

  const completeSessionMutation = useMutation({
    mutationFn: apiClient.completeSession,
    onSuccess: (reward) => {
      setVictory(reward)
      setActiveSession(null)
      setOverlayVisible(false)
      setFocusedTask(null)
      setPresetDuration(null)
      setMovementLocked(false)
      setGlowSignal((value) => value + 1)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['world'] })
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
    onSettled: () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setMovementLocked(false)
    },
    onError: (error: unknown) => {
      console.error('Failed to complete session', error)
    },
  })

  const cancelSessionMutation = useMutation({
    mutationFn: apiClient.cancelSession,
    onSuccess: () => {
      setActiveSession(null)
      setOverlayVisible(false)
      setFocusedTask(null)
      setPresetDuration(null)
      setMovementLocked(false)
      queryClient.invalidateQueries({ queryKey: ['history'] })
    },
    onSettled: () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setMovementLocked(false)
    },
    onError: (error: unknown) => {
      console.error('Failed to cancel session', error)
    },
  })

  const equipMutation = useMutation({
    mutationFn: apiClient.equipItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })

  useEffect(() => {
    if (!activeSession || completeSessionMutation.isPending) return
    if (secondsRemaining > 0) return

    completeSessionMutation.mutate({ sessionId: activeSession.sessionId })
  }, [secondsRemaining, activeSession, completeSessionMutation])

  const handleOpenPanel = (panel: ActivePanel) => {
    setActivePanel(panel)
  }

  const handleStartOverlay = (task?: TaskTemplate, duration?: 25 | 50 | 90) => {
    setFocusedTask(task ?? null)
    setPresetDuration(duration ?? null)
    setOverlayVisible(true)
  }

  const handleOverlayStart = (duration: 25 | 50 | 90) => {
    const payload = {
      durationMinutes: duration,
      taskId: focusedTask?.id,
    }
    startSessionMutation.mutate(payload)
  }

  const handleCancelSession = () => {
    if (!activeSession) return
    cancelSessionMutation.mutate({ sessionId: activeSession.sessionId })
  }

  const worldLayers = useMemo(() => {
    if (!worldQuery.data) return null
    const data = worldQuery.data as WorldWithLayers
    return data.layers
  }, [worldQuery.data])

  if (profileQuery.isLoading || worldQuery.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        Loading the world...
      </div>
    )
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-950 text-white">
      <WorldCanvas
        lockMovement={movementLocked}
        glowSignal={glowSignal}
        onRoomChange={setCurrentRoom}
      />

      {profileQuery.data && <TopHUD profile={profileQuery.data} />}

      <FloatingButtons onOpen={handleOpenPanel} />

      <TasksPanel
        isOpen={activePanel === 'tasks'}
        tasks={tasksQuery.data}
        onClose={() => setActivePanel(null)}
        onStartTask={(task, duration) => {
          setActivePanel(null)
          handleStartOverlay(task, duration as 25 | 50 | 90)
        }}
      />

      <InventoryPanel
        isOpen={activePanel === 'inventory'}
        inventory={inventoryQuery.data}
        profile={profileQuery.data}
        onClose={() => setActivePanel(null)}
        onEquip={(slot, inventoryId) => equipMutation.mutate({ slot, inventoryId })}
      />

      <HistoryPanel
        isOpen={activePanel === 'history'}
        history={historyQuery.data}
        onClose={() => setActivePanel(null)}
      />

      <SessionOverlay
        visible={overlayVisible || !!activeSession}
        activeSession={activeSession}
        focusedTask={focusedTask ?? undefined}
        secondsRemaining={secondsRemaining}
        onStart={handleOverlayStart}
        onCancel={handleCancelSession}
        isProcessing={
          startSessionMutation.isPending ||
          completeSessionMutation.isPending ||
          cancelSessionMutation.isPending
        }
        initialDuration={presetDuration}
      />

      <VictoryModal
        reward={victory}
        onClose={() => {
          setVictory(null)
          queryClient.invalidateQueries({ queryKey: ['profile'] })
          setPresetDuration(null)
        }}
      />

      <div className="pointer-events-none fixed bottom-10 left-1/2 z-30 -translate-x-1/2 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {currentRoom === 'plaza'
            ? 'Central Plaza'
            : currentRoom === 'study'
              ? 'Study Room'
              : currentRoom === 'build'
                ? 'Build Room'
                : 'Training Grounds'}
        </p>
        {!activeSession && (
          <Button
            className="pointer-events-auto mt-3 px-10"
            size="lg"
            onClick={() => handleStartOverlay()}
          >
            Start Focus Session
          </Button>
        )}
      </div>

      {worldLayers && (
        <div className="pointer-events-none fixed bottom-10 left-10 z-30 flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-xs uppercase tracking-[0.3em] text-slate-300">
          <p>World Progress</p>
          <div className="flex gap-4 text-slate-100">
            <LayerBadge label="Study" layer={worldLayers.study} />
            <LayerBadge label="Build" layer={worldLayers.build} />
            <LayerBadge label="Training" layer={worldLayers.training} />
            <LayerBadge label="Plaza" layer={worldLayers.plaza} />
          </div>
        </div>
      )}
    </div>
  )
}

function LayerBadge({
  label,
  layer,
}: {
  label: string
  layer: { level: number; decorativeLayer: boolean }
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-[10px]">
      <p>{label}</p>
      <p className="text-sm font-semibold text-white">Lv {layer.level}</p>
      <p className="text-[9px] text-emerald-300">{layer.decorativeLayer ? 'Upgraded' : 'Base'}</p>
    </div>
  )
}
