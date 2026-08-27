export type BallType = 'wood' | 'iron' | 'boat' | 'duck' | 'bear' | 'dino'

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
    label: '장난감 배',
    density: 180,
    physicsRadius: 0.16,
    parts: [
      { radius: 0.13, scale: [1.7, 0.4, 1.0], position: [0, 0, 0], color: '#d9503f', roughness: 0.55, metalness: 0.05 },
      { radius: 0.09, scale: [0.75, 0.7, 0.75], position: [0, 0.1, 0], color: '#f2efe9', roughness: 0.7, metalness: 0 },
    ],
  },
  duck: {
    label: '오리 인형',
    density: 130,
    physicsRadius: 0.11,
    parts: [
      { radius: 0.1, scale: [1.05, 0.95, 1.15], position: [0, 0, 0], color: '#ffd23f', roughness: 0.5, metalness: 0 },
      { radius: 0.055, scale: [1, 1, 1], position: [0, 0.1, 0.08], color: '#ffd23f', roughness: 0.5, metalness: 0 },
      { radius: 0.035, scale: [1, 0.6, 1.4], position: [0, 0.09, 0.14], color: '#ff9a2e', roughness: 0.6, metalness: 0 },
    ],
  },
  bear: {
    label: '곰 인형',
    density: 380,
    physicsRadius: 0.12,
    parts: [
      { radius: 0.1, scale: [1, 1, 1], position: [0, 0, 0], color: '#a9713f', roughness: 0.85, metalness: 0 },
      { radius: 0.062, scale: [1, 1, 1], position: [0, 0.13, 0], color: '#a9713f', roughness: 0.85, metalness: 0 },
      { radius: 0.022, scale: [1, 1, 1], position: [-0.045, 0.185, 0], color: '#8a5a30', roughness: 0.85, metalness: 0 },
      { radius: 0.022, scale: [1, 1, 1], position: [0.045, 0.185, 0], color: '#8a5a30', roughness: 0.85, metalness: 0 },
    ],
  },
  dino: {
    label: '공룡 장난감',
    density: 520,
    physicsRadius: 0.14,
    parts: [
      { radius: 0.12, scale: [1.25, 0.85, 0.9], position: [0, 0, 0], color: '#4caf6b', roughness: 0.6, metalness: 0 },
      { radius: 0.06, scale: [1, 1, 1], position: [0.14, 0.05, 0], color: '#4caf6b', roughness: 0.6, metalness: 0 },
      { radius: 0.05, scale: [1.4, 0.7, 0.7], position: [-0.17, 0.02, 0], color: '#4caf6b', roughness: 0.6, metalness: 0 },
    ],
  },
}
