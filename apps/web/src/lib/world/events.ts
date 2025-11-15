import { createContext, useContext } from 'react'
import type EventEmitter from 'eventemitter3'

import type { WorldState } from '@os/types'

export type WorldEventMap = {
  'room:entered': [room: string]
  'room:left': []
  'session:lock': []
  'session:unlock': []
  'world:update': [world: WorldState]
}

export type WorldEvents = EventEmitter<WorldEventMap>

export const WorldEventsContext = createContext<WorldEvents | null>(null)

export const useWorldEvents = () => {
  const events = useContext(WorldEventsContext)

  return events
}
