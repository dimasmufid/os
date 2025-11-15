import { useEffect, useMemo, useState } from 'react'

import type { FocusSession } from '@os/types'

interface SessionOverlayProps {
  session: FocusSession
  onCancel: () => Promise<unknown>
  onComplete: () => Promise<unknown>
}

export const SessionOverlay = ({ session, onCancel, onComplete }: SessionOverlayProps) => {
  const targetTime = useMemo(() => {
    const started = new Date(session.startedAt).getTime()
    return started + session.durationMinutes * 60 * 1000
  }, [session])

  const [remaining, setRemaining] = useState(() => targetTime - Date.now())
  const [autoCompleted, setAutoCompleted] = useState(false)

  useEffect(() => {
    setAutoCompleted(false)
  }, [session.id])

  useEffect(() => {
    const tick = () => {
      setRemaining(targetTime - Date.now())
    }

    const id = window.setInterval(tick, 1000)
    tick()

    return () => window.clearInterval(id)
  }, [targetTime])

  useEffect(() => {
    if (remaining <= 0 && !autoCompleted) {
      setAutoCompleted(true)
      void onComplete()
    }
  }, [autoCompleted, onComplete, remaining])

  const formattedTime = formatDuration(Math.max(remaining, 0))

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900/80 p-8 text-center text-slate-100 shadow-xl shadow-slate-950/40">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Focus Session</p>
        <h2 className="mt-2 text-4xl font-semibold text-white">{session.durationMinutes} Minute Mission</h2>
        <p className="mt-2 text-sm text-slate-300">Stay present. Movement in the world is paused until you complete or cancel.</p>

        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="h-32 w-32 rounded-full border-[6px] border-cyan-400/60 bg-slate-900 flex items-center justify-center">
            <span className="text-3xl font-semibold text-cyan-200">{formattedTime}</span>
          </div>
          <p className="text-xs text-slate-400">Started at {new Date(session.startedAt).toLocaleTimeString()}</p>
        </div>

        <div className="mt-8 flex gap-3 justify-center">
          <button
            type="button"
            className="rounded-full border border-slate-700 bg-slate-800/80 px-5 py-2 text-sm text-slate-200 hover:border-slate-500"
            onClick={onCancel}
          >
            Cancel Session
          </button>
          <button
            type="button"
            className="rounded-full border border-emerald-500/60 bg-emerald-500/20 px-5 py-2 text-sm text-emerald-100 hover:bg-emerald-500/30"
            onClick={onComplete}
          >
            Complete Now
          </button>
        </div>
      </div>
    </div>
  )
}

const formatDuration = (milliseconds: number) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
