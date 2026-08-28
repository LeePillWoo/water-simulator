// 오리가 화면(카메라 렌즈)에 부딪히는 순간을 3D 씬(FloatingBodies)에서 HTML
// 오버레이(ScreenSplat)로 알리는 작은 이벤트 버스. 둘 다 리액트 상태로 엮기엔
// 발행 빈도가 낮고 순간적이라, zustand보다 이 편이 더 가볍다.

export interface DuckSplatEvent {
  /** 화면 좌표(px), 캔버스 클라이언트 크기 기준. */
  x: number
  y: number
  /** 납작해질 때의 살짝 삐뚤어진 회전각(도). */
  rotation: number
}

type Listener = (event: DuckSplatEvent) => void

const listeners = new Set<Listener>()

export function subscribeDuckSplat(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function emitDuckSplat(event: DuckSplatEvent) {
  for (const fn of listeners) fn(event)
}
