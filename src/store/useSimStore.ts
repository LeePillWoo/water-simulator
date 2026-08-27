import { create } from 'zustand'

interface SimState {
  isRunning: boolean
  resetSignal: number

  togglePlaying: () => void
  reset: () => void
}

export const useSimStore = create<SimState>((set) => ({
  isRunning: true,
  resetSignal: 0,

  togglePlaying: () => set((s) => ({ isRunning: !s.isRunning })),
  reset: () => set((s) => ({ resetSignal: s.resetSignal + 1, isRunning: true })),
}))
