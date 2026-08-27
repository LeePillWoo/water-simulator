import { create } from 'zustand'
import type { BallType } from '../physics/toyTypes'
import { MAX_BALLS_PER_TYPE } from '../labLayout'

export type { BallType }

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
  dropBall: (type) =>
    set((s) => {
      const countOfType = s.balls.reduce((n, b) => (b.type === type ? n + 1 : n), 0)
      if (countOfType >= MAX_BALLS_PER_TYPE) return s
      return { balls: [...s.balls, { id: nextBallId++, type }] }
    }),
  clearBalls: () => set({ balls: [] }),
}))
