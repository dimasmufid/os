import type { SessionHistoryEntry } from '@os/types'

interface HistoryPanelProps {
  isOpen: boolean
  history: SessionHistoryEntry[] | undefined
  onClose: () => void
}

export function HistoryPanel({ isOpen, history, onClose }: HistoryPanelProps) {
  if (!isOpen) return null

  return (
    <aside className="fixed bottom-0 left-1/2 z-40 w-[560px] -translate-x-1/2 rounded-t-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-xl backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Session History</h2>
        <button className="text-xs uppercase text-slate-400" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="max-h-72 space-y-4 overflow-y-auto pr-2">
        {history?.map((session) => {
          const completedAt = session.completedAt ? new Date(session.completedAt) : null
          const startedAt = new Date(session.startedAt)
          return (
            <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-semibold text-slate-100">
                    {session.task?.name ?? 'Free session'} · {session.durationMinutes}m
                  </p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    Started {startedAt.toLocaleString()}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.3em] text-emerald-300">
                  {session.status === 'completed' ? 'Completed' : session.status}
                </span>
              </div>
              {completedAt && (
                <p className="mt-2 text-xs text-slate-300">Finished {completedAt.toLocaleString()}</p>
              )}
              <div className="mt-3 flex gap-3 text-xs text-slate-300">
                <span>XP +{session.rewardXp}</span>
                <span>Gold +{session.rewardGold}</span>
                {session.droppedCosmetic && <span>Drop: {session.droppedCosmetic.name}</span>}
              </div>
            </div>
          )
        })}
        {(!history || history.length === 0) && (
          <p className="text-sm text-slate-400">No sessions yet. Start a focus mission to fill this timeline.</p>
        )}
      </div>
    </aside>
  )
}
