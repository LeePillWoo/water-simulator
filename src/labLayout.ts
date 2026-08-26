// 실험실 씬 전체가 공유하는 치수 상수 (렌더링과 물리 콜라이더가 동일한 값을 참조한다)

export const Z_MIN = -2.5
export const Z_MAX = 2.5
export const WALL_THK = 0.15
export const GATE_HEIGHT = 2.0

export const TIER1 = { xMin: 1.0, xMax: 5.0, y: 6.0, gateHeight: GATE_HEIGHT }
export const TIER2 = { xMin: -2.0, xMax: 1.0, y: 3.0, gateHeight: GATE_HEIGHT }
export const FLOOR = { xMin: -6.0, xMax: -2.0, y: 0.0, wallHeight: 2.0 }

export const TIER1_WALL_TOP = TIER1.y + TIER1.gateHeight
export const TIER2_WALL_TOP = TIER2.y + TIER2.gateHeight
export const FLOOR_WALL_TOP = FLOOR.y + FLOOR.wallHeight

// 물 배수 처리 기준
export const DRAIN_X = FLOOR.xMin - 0.4
export const DRAIN_Y = -3
