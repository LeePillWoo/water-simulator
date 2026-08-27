// 수조 씬 전체가 공유하는 치수/물리 상수 (렌더링과 파동 시뮬레이션이 동일한 값을 참조한다)

export const TANK_WIDTH = 3.2
export const TANK_DEPTH = 3.2
export const TANK_WALL_HEIGHT = 1.6
export const WALL_THK = 0.05
export const FLOOR_Y = 0

// 파동 시뮬레이션 (얕은물 방정식)
export const REST_WATER_DEPTH = 0.6 // H0, 정지 수심
export const GRID_RES = 64 // 그리드 한 변 셀 수
export const SIM_GRAVITY = 9.8
export const WAVE_DAMPING = 0.6 // 속도 감쇠 (1/s)
export const HEIGHT_SMOOTH = 0.02 // 그리드 스케일 수치 노이즈 억제용 스무딩 계수

// 수조 기울이기 (마우스 흔들기)
export const MAX_TILT_RAD = (22 * Math.PI) / 180
export const DRAG_PIXELS_FOR_MAX_TILT = 220
export const TILT_STIFFNESS = 90
export const TILT_DAMPING = 14

// 물체 낙하 (부력/충격 물리)
export const WATER_DENSITY = 1000 // kg/m^3
export const BALL_DROP_HEIGHT = FLOOR_Y + TANK_WALL_HEIGHT + 0.6
