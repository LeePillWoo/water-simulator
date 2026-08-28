export type BallType = 'wood' | 'iron' | 'boat' | 'duck'

/**
 * 장난감을 이루는 부품 하나. 모두 단위 구(半径 1)를 (radius*scale)로 스케일한
 * 것으로 표현해, 지오메트리 하나를 모든 부품이 공유할 수 있게 한다.
 * parts[0](몸통)만 젖음 셰이더가 적용되고, 나머지는 단순 재질이다.
 */
export interface ToyPart {
  radius: number
  scale: [number, number, number]
  position: [number, number, number]
  color: string
  roughness: number
  metalness: number
}

export interface ToyDef {
  label: string
  density: number
  /** 부력/충돌/파동 주입에 쓰는 이 장난감의 등가 구 반지름. */
  physicsRadius: number
  parts: ToyPart[]
  /** 물 위를 실제 오리처럼 스스로 유영하며 돌아다니는지. 정면은 항상 로컬 +X. */
  canWander?: boolean
}

export const TOY_DEFS: Record<BallType, ToyDef> = {
  wood: {
    label: '나무공',
    density: 600,
    physicsRadius: 0.12,
    parts: [{ radius: 0.12, scale: [1, 1, 1], position: [0, 0, 0], color: '#a9773f', roughness: 0.85, metalness: 0 }],
  },
  iron: {
    label: '쇠공',
    density: 7800,
    physicsRadius: 0.1,
    parts: [{ radius: 0.1, scale: [1, 1, 1], position: [0, 0, 0], color: '#9aa0a8', roughness: 0.3, metalness: 0.9 }],
  },
  boat: {
    label: '돛단배',
    density: 180,
    physicsRadius: 0.16,
    canWander: true,
    parts: [
      // 선체 — 젖음 셰이더 적용
      { radius: 0.13, scale: [1.7, 0.4, 1.0], position: [0, 0, 0], color: '#8a5a34', roughness: 0.6, metalness: 0.05 },
      // 돛대
      { radius: 0.012, scale: [1, 9, 1], position: [0, 0.16, 0], color: '#d8c39a', roughness: 0.7, metalness: 0 },
      // 돛
      { radius: 0.09, scale: [1.2, 1.3, 0.06], position: [0, 0.17, 0], color: '#fbf6ea', roughness: 0.8, metalness: 0 },
      // 돛대 꼭대기 깃발
      { radius: 0.018, scale: [1, 0.5, 1], position: [0, 0.29, 0], color: '#d9503f', roughness: 0.6, metalness: 0 },
    ],
  },
  duck: {
    label: '오리 인형',
    density: 130,
    physicsRadius: 0.11,
    canWander: true,
    parts: [
      { radius: 0.1, scale: [1.15, 0.95, 1.05], position: [0, 0, 0], color: '#ffd23f', roughness: 0.5, metalness: 0 },
      { radius: 0.055, scale: [1, 1, 1], position: [0.08, 0.1, 0], color: '#ffd23f', roughness: 0.5, metalness: 0 },
      { radius: 0.035, scale: [1.4, 0.6, 1], position: [0.14, 0.09, 0], color: '#ff9a2e', roughness: 0.6, metalness: 0 },
      // 눈 (양쪽)
      { radius: 0.018, scale: [1, 1, 1], position: [0.115, 0.115, 0.04], color: '#221c16', roughness: 0.2, metalness: 0 },
      { radius: 0.018, scale: [1, 1, 1], position: [0.115, 0.115, -0.04], color: '#221c16', roughness: 0.2, metalness: 0 },
    ],
  },
}
