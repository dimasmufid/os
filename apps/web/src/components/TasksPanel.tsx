import type { TaskTemplate } from '@os/types'
import { Button } from '@os/ui'

interface TasksPanelProps {
  isOpen: boolean
  tasks: TaskTemplate[] | undefined
  onClose: () => void
  onStartTask: (task: TaskTemplate, duration: number) => void
}

const defaultDurations: Array<25 | 50 | 90> = [25, 50, 90]

export function TasksPanel({ isOpen, tasks, onClose, onStartTask }: TasksPanelProps) {
  if (!isOpen) return null

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-80 bg-slate-950/95 p-6 text-white shadow-xl backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <button className="text-xs uppercase text-slate-400" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto pr-2">
        {tasks?.map((task) => (
          <div key={task.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold">{task.name}</p>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{task.category}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {defaultDurations.map((duration) => (
                <Button key={duration} size="sm" onClick={() => onStartTask(task, duration)}>
                  {duration}m
                </Button>
              ))}
            </div>
          </div>
        ))}
        {(!tasks || tasks.length === 0) && (
          <p className="text-sm text-slate-400">No tasks yet. Create rituals from the API or editor.</p>
        )}
      </div>
    </aside>
  )
}
