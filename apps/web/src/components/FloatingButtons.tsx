import { Button } from '@os/ui'

interface FloatingButtonsProps {
  onOpen: (panel: 'tasks' | 'inventory' | 'history') => void
}

export function FloatingButtons({ onOpen }: FloatingButtonsProps) {
  return (
    <div className="fixed bottom-10 right-10 z-30 flex flex-col gap-3">
      <Button className="shadow-lg" variant="default" onClick={() => onOpen('tasks')}>
        Tasks
      </Button>
      <Button className="shadow-lg" variant="default" onClick={() => onOpen('inventory')}>
        Inventory
      </Button>
      <Button className="shadow-lg" variant="default" onClick={() => onOpen('history')}>
        History
      </Button>
    </div>
  )
}
