import type { SessionHistoryItem } from '@os/types'

interface HistoryPanelProps {
  sessions: Array<SessionHistoryItem>
}

const statusMap: Record<SessionHistoryItem['status'], string> = {
  completed: 'Completed',
  cancelled: 'Cancelled',
  'in_progress': 'Active',
}

export const HistoryPanel = ({ sessions }: HistoryPanelProps) => {
  if (sessions.length === 0) {
    return (
      <div className="w-80 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100">
        <h3 className="text-lg font-semibold mb-2">Recent Sessions</h3>
        <p className="text-sm text-slate-400">Your focus history will appear here after your first mission.</p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100 shadow-lg shadow-slate-950/40">
      <h3 className="text-lg font-semibold mb-4">Recent Sessions</h3>
      <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {sessions.slice(0, 15).map((session) => {
          const startedAt = new Date(session.startedAt)
          const statusLabel = statusMap[session.status]
          return (
            <li key={session.id} className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    {session.taskName ?? 'Free Session'} · {session.durationMinutes}m
                  </p>
                  <p className="text-xs text-slate-400">
                    {startedAt.toLocaleDateString()} · {statusLabel}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-300">
                  <p>+{session.rewardXp} XP</p>
                  <p>+{session.rewardGold} Gold</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
