// 오리가 화면(카메라 렌즈)에 부딪히는 순간을 3D 씬(FloatingBodies)에서 HTML
// 오버레이(ScreenSplat)로 알리는 작은 이벤트 버스. 둘 다 리액트 상태로 엮기엔
// 발행 빈도가 낮고 순간적이라, zustand보다 이 편이 더 가볍다.
//
// 동시에 떠 있을 수 있는 연출 개수도 여기서 중앙 관리한다: 오리가 한꺼번에 여러
// 마리 튀어오르는 상황에서 화면이 온통 금투성이가 되지 않도록 캡을 걸고, 캡을
// 넘겨 거절된 시도는 호출부(FloatingBodies)가 "이번엔 실제로 안 터졌다"고 판단해
// 그 오리를 지우지 않도록 반환값으로 알려준다.

export interface DuckSplatEvent {
  /** 화면 좌표(px), 뷰포트 기준. */
  x: number
  y: number
  /** 납작해질 때의 살짝 삐뚤어진 회전각(도). */
  rotation: number
}

export const SPLAT_LIFETIME_MS = 1400
// styles.css의 duck-splat-pop/-flash 애니메이션이 "작은 점 -> 순식간에 확대되며
// 날아와 부딪힘"을 표현하는 지점(11%, 0.15s)과 맞춘 값 — 이 값을 바꾸면 CSS 쪽도 같이 맞춰야 한다.
export const IMPACT_SOUND_DELAY_MS = 150
const MAX_CONCURRENT_SPLATS = 3

type Listener = (event: DuckSplatEvent) => void

const listeners = new Set<Listener>()
let activeCount = 0

export function subscribeDuckSplat(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** 화면-충돌 연출을 하나 띄워본다. 이미 MAX_CONCURRENT_SPLATS개가 떠 있는 중이면
 * 아무 일도 하지 않고 false를 반환한다 — 그 경우 오리는 이번엔 그냥 물로 떨어진다. */
export function tryEmitDuckSplat(event: DuckSplatEvent): boolean {
  if (activeCount >= MAX_CONCURRENT_SPLATS) return false
  activeCount++
  setTimeout(() => {
    activeCount = Math.max(0, activeCount - 1)
  }, SPLAT_LIFETIME_MS)
  for (const fn of listeners) fn(event)
  return true
}
