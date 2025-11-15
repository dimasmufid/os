import { useEffect, useMemo, useState } from 'react'
import type { StartSessionResponse, TaskTemplate } from '@os/types'
import { Button } from '@os/ui'

interface SessionOverlayProps {
  visible: boolean
  activeSession: StartSessionResponse | null
  focusedTask?: TaskTemplate | null
  secondsRemaining: number
  onStart: (duration: 25 | 50 | 90) => void
  onCancel: () => void
  isProcessing: boolean
  initialDuration?: 25 | 50 | 90 | null
}

const durations: Array<25 | 50 | 90> = [25, 50, 90]

export function SessionOverlay({
  visible,
  activeSession,
  focusedTask,
  secondsRemaining,
  onStart,
  onCancel,
  isProcessing,
  initialDuration,
}: SessionOverlayProps) {
  const [selectedDuration, setSelectedDuration] = useState<25 | 50 | 90>(25)

  useEffect(() => {
    if (visible) {
      setSelectedDuration(initialDuration ?? 25)
    }
  }, [visible, initialDuration])

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(secondsRemaining / 60)
    const seconds = secondsRemaining % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }, [secondsRemaining])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/90 text-white backdrop-blur">
      <div className="w-[480px] rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center shadow-2xl">
        {!activeSession ? (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Mission Ready</p>
              <h2 className="mt-2 text-3xl font-semibold">Select focus duration</h2>
              {focusedTask && <p className="mt-2 text-sm text-slate-300">{focusedTask.name}</p>}
            </div>
            <div className="flex justify-center gap-4">
              {durations.map((duration) => (
                <button
                  key={duration}
                  className={`flex h-16 w-16 items-center justify-center rounded-full border border-white/10 text-lg font-semibold transition ${selectedDuration === duration ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
                  onClick={() => setSelectedDuration(duration)}
                >
                  {duration}
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => onStart(selectedDuration)}
              disabled={isProcessing}
            >
              Launch Session
            </Button>
            <p className="text-xs text-slate-400">
              Movement locks while the timer runs. Finish strong to earn XP, gold, and a chance at cosmetics.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Session Running</p>
              <h2 className="mt-2 text-5xl font-semibold tracking-wider">{formattedTime}</h2>
            </div>
            <p className="text-sm text-slate-300">Stay focused! Completing this session grants rewards.</p>
            <Button variant="secondary" className="w-full" size="lg" onClick={onCancel} disabled={isProcessing}>
              Cancel session
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
