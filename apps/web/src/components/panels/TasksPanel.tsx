import type { TaskTemplate } from '@os/types'

const DURATIONS = [25, 50, 90]

interface TasksPanelProps {
  tasks: Array<TaskTemplate>
  onStart: (payload: { taskId?: string; durationMinutes: number }) => void
  currentRoom?: string | null
}

export const TasksPanel = ({ tasks, onStart, currentRoom }: TasksPanelProps) => {
  const grouped = groupTasks(tasks)

  return (
    <div className="w-80 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100 shadow-lg shadow-slate-950/40">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Missions</h3>
        <p className="text-xs text-slate-400">
          Pick a task and choose your focus duration. Sessions reward XP, gold, and streak progress.
        </p>
      </div>

      {(['study', 'build', 'training'] as const).map((room) => {
        const roomTasks = grouped[room]
        return (
          <div key={room} className="mb-4 last:mb-0">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{room}</h4>
              {currentRoom === room ? (
                <span className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">Here</span>
              ) : null}
            </div>
            {roomTasks.length === 0 ? (
              <p className="text-xs text-slate-500">No tasks yet — create one from the API or start a free session.</p>
            ) : (
              <ul className="space-y-3">
                {roomTasks.map((task) => (
                  <li key={task.id} className="rounded-lg border border-slate-700 p-3 bg-slate-800/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{task.name}</p>
                        <p className="text-xs text-slate-400">{task.category}</p>
                      </div>
                      <span className="text-xs text-slate-300">{task.defaultDurationMinutes}m</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {DURATIONS.map((duration) => (
                        <button
                          key={duration}
                          type="button"
                          className="flex-1 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                          onClick={() => onStart({ taskId: task.id, durationMinutes: duration })}
                        >
                          {duration}m
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <div className="mt-4 border-t border-slate-700 pt-4">
        <p className="text-xs text-slate-400 mb-2">Need a breather?</p>
        <div className="flex gap-2">
          {DURATIONS.map((duration) => (
            <button
              key={duration}
              type="button"
              className="flex-1 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500/60 hover:text-white"
              onClick={() => onStart({ durationMinutes: duration })}
            >
              Free {duration}m
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const groupTasks = (tasks: Array<TaskTemplate>) => {
  return tasks.reduce<Record<'study' | 'build' | 'training', Array<TaskTemplate>>>(
    (acc, task) => {
      if (acc[task.room]) {
        acc[task.room].push(task)
      }
      return acc
    },
    { study: [], build: [], training: [] },
  )
}
