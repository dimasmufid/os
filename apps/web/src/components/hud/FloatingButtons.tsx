import { cn } from '../../lib/utils'

interface FloatingButtonsProps {
  onToggle: (panel: 'tasks' | 'inventory' | 'history') => void
  activePanel: 'tasks' | 'inventory' | 'history' | null
}

const BUTTONS: Array<{ key: 'tasks' | 'inventory' | 'history'; label: string }> = [
  { key: 'tasks', label: 'Tasks' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'history', label: 'History' },
]

export const FloatingButtons = ({ onToggle, activePanel }: FloatingButtonsProps) => {
  return (
    <div className="flex flex-col gap-3">
      {BUTTONS.map((button) => {
        const isActive = activePanel === button.key
        return (
          <button
            key={button.key}
            type="button"
            onClick={() => onToggle(button.key)}
            className={cn(
              'px-5 py-2 rounded-full border transition-colors backdrop-blur-md font-medium shadow-sm',
              isActive
                ? 'border-cyan-400/80 bg-cyan-500/20 text-white'
                : 'border-slate-700 bg-slate-900/60 text-slate-200 hover:border-cyan-400/60 hover:text-white',
            )}
          >
            {button.label}
          </button>
        )
      })}
    </div>
  )
}
