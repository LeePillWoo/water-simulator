import { useEffect, useState } from 'react'
import { subscribeDuckSplat, SPLAT_LIFETIME_MS, type DuckSplatEvent } from '../scene/water/duckSplatBus'

interface ActiveSplat extends DuckSplatEvent {
  key: number
}

let nextKey = 1

// 어지러운 눈: 원점을 중심으로 도는 나선(스파이럴) 폴리라인. 눈 하나에 재사용한다.
const EYE_SPIRAL =
  '0.0,0.0 0.3,0.4 -0.3,0.8 -1.2,0.4 -1.4,-1.0 -0.0,-2.2 2.1,-1.5 2.9,0.9 1.1,3.3 -2.3,3.2 -4.4,0.0 -2.8,-3.9 1.6,-5.0 5.4,-1.8 5.0,3.6 0.0,6.6 -5.7,4.1'

// 부딪힌 지점(원점)에서 사방으로 갈라져 나가는 유리 실금들.
const CRACK_LINES = [
  '0,0 21.5,4.6 48.9,17.8',
  '0,0 16.1,22.9 42.4,41.0',
  '0,0 -3.6,33.8 -22.6,62.0',
  '0,0 -17.1,13.8 -29.6,43.9',
  '0,0 -28.0,1.0 -59.7,-6.3',
  '0,0 -28.2,-19.0 -61.7,-26.2',
  '0,0 -6.8,-20.9 -3.8,-53.9',
  '0,0 9.1,-26.5 2.1,-61.0',
  '0,0 26.8,-20.9 58.9,-34.0',
]

// 반짝이 하나(별 8각) — 몇 군데 흩뿌려 재사용한다.
const SPARKLE_STAR = '0.0,-6.0 1.7,-1.7 6.0,0.0 1.7,1.7 0.0,6.0 -1.7,1.7 -6.0,0.0 -1.7,-1.7'
const SPARKLE_SPOTS = [
  { x: -46, y: -34, scale: 1.1 },
  { x: 40, y: -42, scale: 0.8 },
  { x: 54, y: 16, scale: 0.9 },
  { x: -52, y: 22, scale: 0.7 },
]

/** 오리가 격렬하게 튀어올라 화면(카메라 렌즈)에 부딪힐 때, 그 자리에 잠깐
 * 금 간 유리 + 어지러운 오리를 붙여놓는 개그 연출. 3D 씬과 무관한 순수 HTML/SVG 오버레이. */
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
        <div key={s.key}>
          {/* 부딪히는 순간 화면 전체가 살짝 번쩍: "3D 씬 안"이 아니라 내 모니터/액정
              자체에 부딪혔다는 느낌을 준다. */}
          <div className="duck-splat-flash" style={{ left: s.x, top: s.y }} />
          <div
            className="duck-splat-anchor"
            style={{ left: s.x, top: s.y, transform: `translate(-50%, -50%) rotate(${s.rotation}deg)` }}
          >
            <svg className="duck-splat-svg" viewBox="-100 -100 200 200" aria-hidden="true">
              <circle cx="0" cy="0" r="55" fill="rgba(255,255,255,0.22)" />

              <g stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {CRACK_LINES.map((pts, i) => (
                  <polyline key={i} points={pts} />
                ))}
              </g>

              <g fill="#fff6cf">
                {SPARKLE_SPOTS.map((spot, i) => (
                  <polygon key={i} points={SPARKLE_STAR} transform={`translate(${spot.x} ${spot.y}) scale(${spot.scale})`} />
                ))}
              </g>

              {/* 납작해진 오리 — 실제 게임 속 오리 배색(#ffd23f/#ff9a2e)을 그대로 쓴다.
                  유리에 정면으로 짓눌린 느낌을 내려고 몸통을 세로로 길쭉하게 찌그러뜨리지
                  않고 동그랗게 유지하고, 날개만 양옆으로 넓게 펼친다. */}
              <ellipse cx="-42" cy="6" rx="21" ry="11" fill="#ffd23f" transform="rotate(-10 -42 6)" />
              <ellipse cx="42" cy="6" rx="21" ry="11" fill="#ffd23f" transform="rotate(10 42 6)" />
              <ellipse cx="-15" cy="35" rx="8" ry="4" fill="#ff9a2e" />
              <ellipse cx="15" cy="35" rx="8" ry="4" fill="#ff9a2e" />
              <circle cx="0" cy="4" r="32" fill="#ffd23f" />
              <path d="M -9 8 L 9 8 L 0 24 Z" fill="#ff9a2e" />
              <g stroke="#221c16" strokeWidth="1.5" fill="none" strokeLinecap="round">
                <polyline points={EYE_SPIRAL} transform="translate(-13 -8) scale(1.4)" />
                <polyline points={EYE_SPIRAL} transform="translate(13 -8) scale(1.4)" />
              </g>
            </svg>
          </div>
        </div>
      ))}
    </>
  )
}
