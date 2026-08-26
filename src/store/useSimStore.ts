import { create } from 'zustand'
import type { ObstacleDef, ObstacleType } from '../physics/types'

let obstacleSeq = 0

interface SimState {
  gate1Open: number
  gate2Open: number
  obstacles: ObstacleDef[]
  selectedObstacleId: string | null
  isRunning: boolean
  particleCount: number
  placingType: ObstacleType | null
  resetSignal: number

  setGate1: (v: number) => void
  setGate2: (v: number) => void
  setParticleCount: (v: number) => void
  togglePlaying: () => void
  reset: () => void

  startPlacing: (type: ObstacleType) => void
  cancelPlacing: () => void
  addObstacle: (position: [number, number, number]) => void
  selectObstacle: (id: string | null) => void
  removeSelected: () => void
}

export const useSimStore = create<SimState>((set, get) => ({
  gate1Open: 0,
  gate2Open: 0,
  obstacles: [],
  selectedObstacleId: null,
  isRunning: true,
  particleCount: 1400,
  placingType: null,
  resetSignal: 0,

  setGate1: (v) => set({ gate1Open: v }),
  setGate2: (v) => set({ gate2Open: v }),
  setParticleCount: (v) => set({ particleCount: v }),
  togglePlaying: () => set((s) => ({ isRunning: !s.isRunning })),
  reset: () => set((s) => ({ resetSignal: s.resetSignal + 1, gate1Open: 0, gate2Open: 0, isRunning: true })),

  startPlacing: (type) => set({ placingType: type, selectedObstacleId: null }),
  cancelPlacing: () => set({ placingType: null }),
  addObstacle: (position) => {
    const type = get().placingType
    if (!type) return
    const size: [number, number, number] = type === 'box' ? [0.8, 0.8, 0.8] : [0.8, 0.9, 0.8]
    const obstacle: ObstacleDef = { id: `ob-${obstacleSeq++}`, type, position, size }
    set((s) => ({ obstacles: [...s.obstacles, obstacle], placingType: null, selectedObstacleId: obstacle.id }))
  },
  selectObstacle: (id) => set({ selectedObstacleId: id }),
  removeSelected: () =>
    set((s) => ({
      obstacles: s.obstacles.filter((o) => o.id !== s.selectedObstacleId),
      selectedObstacleId: null,
    })),
}))
