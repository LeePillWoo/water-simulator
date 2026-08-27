import { create } from 'zustand'

export type BallType = 'wood' | 'iron'

export interface BallSpec {
  id: number
  type: BallType
}

interface SimState {
  isRunning: boolean
  resetSignal: number
  balls: BallSpec[]

  togglePlaying: () => void
  reset: () => void
  dropBall: (type: BallType) => void
  clearBalls: () => void
}

let nextBallId = 1

export const useSimStore = create<SimState>((set) => ({
  isRunning: true,
  resetSignal: 0,
  balls: [],

  togglePlaying: () => set((s) => ({ isRunning: !s.isRunning })),
  reset: () => set((s) => ({ resetSignal: s.resetSignal + 1, isRunning: true, balls: [] })),
  dropBall: (type) => set((s) => ({ balls: [...s.balls, { id: nextBallId++, type }] })),
  clearBalls: () => set({ balls: [] }),
}))
