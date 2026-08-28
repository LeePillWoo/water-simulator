import { useEffect, useState } from 'react'
import { subscribeDuckSplat, type DuckSplatEvent } from '../scene/water/duckSplatBus'

interface ActiveSplat extends DuckSplatEvent {
  key: number
}

let nextKey = 1
const SPLAT_LIFETIME_MS = 1400

/** 오리가 격렬하게 튀어올라 화면(카메라 렌즈)에 부딪힐 때, 그 자리에 잠깐
 * 납작해진 오리를 붙여놓는 개그 연출. 3D 씬과 무관한 순수 HTML 오버레이. */
export function ScreenSplat() {
  const [splats, setSplats] = useState<ActiveSplat[]>([])

  useEffect(
    () =>
      subscribeDuckSplat((event) => {
        const key = nextKey++
        setSplats((prev) => [...prev, { ...event, key }])
        setTimeout(() => {
          setSplats((prev) => prev.filter((s) => s.key !== key))
        }, SPLAT_LIFETIME_MS)
      }),
    [],
  )

  return (
    <>
      {splats.map((s) => (
        <div
          key={s.key}
          className="duck-splat-anchor"
          style={{ left: s.x, top: s.y, transform: `translate(-50%, -50%) rotate(${s.rotation}deg)` }}
        >
          <span className="duck-splat">🦆</span>
        </div>
      ))}
    </>
  )
}
