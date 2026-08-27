// 수조 기울기 상태 — 매 프레임 바뀌므로 React state/zustand가 아닌 순수 mutable 객체로 둔다.
// TiltRig가 쓰고, WaterSurface가 읽어서 파동 시뮬레이션에 힘을 주입한다.
export const tiltState = {
  x: 0,
  z: 0,
  velX: 0,
  velZ: 0,
  targetX: 0,
  targetZ: 0,
}
