// Shared TypeScript types across the monorepo
// Export types like Hero, Session, WorldState, etc.

// Example types - replace with your actual types
export interface Hero {
  id: string;
  level: number;
  xp: number;
  gold: number;
}

export interface Session {
  id: string;
  duration: number;
  completedAt: Date;
}

export interface WorldState {
  currentRoom: string;
  unlockedRooms: string[];
}

