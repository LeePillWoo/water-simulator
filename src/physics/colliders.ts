import type { Collider, ObstacleDef } from './types'
import { TIER1, TIER2, FLOOR, TIER1_WALL_TOP, TIER2_WALL_TOP, FLOOR_WALL_TOP, Z_MIN, Z_MAX, WALL_THK } from '../labLayout'

function box(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number): Collider {
  return { kind: 'box', center: [cx, cy, cz], half: [hx, hy, hz] }
}

const zCenter = (Z_MIN + Z_MAX) / 2
const halfZ = (Z_MAX - Z_MIN) / 2

function tierColliders(xMin: number, xMax: number, y: number, wallTop: number): Collider[] {
  const cx = (xMin + xMax) / 2
  const hx = (xMax - xMin) / 2
  const wallHy = (wallTop - y) / 2
  const wallCy = (y + wallTop) / 2
  return [
    box(cx, y - WALL_THK / 2, zCenter, hx, WALL_THK / 2, halfZ), // 바닥(플랫폼 상단)
    box(cx, wallCy, Z_MIN - WALL_THK / 2, hx, wallHy, WALL_THK / 2), // 앞쪽 옆벽
    box(cx, wallCy, Z_MAX + WALL_THK / 2, hx, wallHy, WALL_THK / 2), // 뒤쪽 옆벽
  ]
}

function gateCollider(x: number, y: number, gateHeight: number, openPercent: number): Collider {
  const frac = Math.min(1, Math.max(0, openPercent / 100))
  const bottom = y + frac * gateHeight
  return box(x, bottom + gateHeight / 2, zCenter, WALL_THK / 2, gateHeight / 2, halfZ)
}

export function buildColliders(gate1Open: number, gate2Open: number, obstacles: ObstacleDef[]): Collider[] {
  const colliders: Collider[] = []

  colliders.push(...tierColliders(TIER1.xMin, TIER1.xMax, TIER1.y, TIER1_WALL_TOP))
  colliders.push(box(TIER1.xMax + WALL_THK / 2, (TIER1.y + TIER1_WALL_TOP) / 2, zCenter, WALL_THK / 2, (TIER1_WALL_TOP - TIER1.y) / 2, halfZ)) // tier1 뒤쪽(우측) 막힌 벽
  colliders.push(gateCollider(TIER1.xMin, TIER1.y, TIER1.gateHeight, gate1Open))

  colliders.push(...tierColliders(TIER2.xMin, TIER2.xMax, TIER2.y, TIER2_WALL_TOP))
  colliders.push(gateCollider(TIER2.xMin, TIER2.y, TIER2.gateHeight, gate2Open))

  colliders.push(...tierColliders(FLOOR.xMin, FLOOR.xMax, FLOOR.y, FLOOR_WALL_TOP))
  // FLOOR.xMin 쪽(좌측)은 배수구로 열어둔다 — 벽을 세우지 않음

  for (const ob of obstacles) {
    if (ob.type === 'box') {
      colliders.push(box(ob.position[0], ob.position[1] + ob.size[1] / 2, ob.position[2], ob.size[0] / 2, ob.size[1] / 2, ob.size[2] / 2))
    } else {
      colliders.push({
        kind: 'cylinder',
        center: [ob.position[0], ob.position[1] + ob.size[1] / 2, ob.position[2]],
        radius: ob.size[0] / 2,
        halfHeight: ob.size[1] / 2,
      })
    }
  }

  return colliders
}
