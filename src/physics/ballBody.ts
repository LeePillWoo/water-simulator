import * as THREE from 'three'
import type { WaveSolver } from './waveSolver'
import type { BallSpec, BallType } from '../store/useSimStore'
import { TANK_WIDTH, TANK_DEPTH, FLOOR_Y, SIM_GRAVITY, WATER_DENSITY, BALL_DROP_HEIGHT } from '../labLayout'

/** 재질별 밀도(kg/m^3)와 반지름(m). 물(1000)보다 가벼우면 뜨고, 무거우면 가라앉는다. */
export const BALL_MATERIALS: Record<BallType, { density: number; radius: number; color: string; roughness: number; metalness: number }> = {
  wood: { density: 600, radius: 0.12, color: '#a9773f', roughness: 0.85, metalness: 0 },
  iron: { density: 7800, radius: 0.1, color: '#9aa0a8', roughness: 0.3, metalness: 0.9 },
}

export interface BallBody {
  id: number
  type: BallType
  radius: number
  mass: number
  volume: number
  position: THREE.Vector3
  velocity: THREE.Vector3
  prevSubmergedVolume: number
  /** 이 공의 (x,z) 위치에서 샘플링한 로컬 수면 높이. 렌더링 쪽의 젖음/굴절 셰이딩이 참조한다. */
  waterY: number
}

const bodies = new Map<number, BallBody>()

function sphereCapVolume(r: number, capHeight: number) {
  const hc = Math.min(Math.max(capHeight, 0), 2 * r)
  return (Math.PI * hc * hc * (3 * r - hc)) / 3
}

export function resetBodies() {
  bodies.clear()
}

/** 더 이상 존재하지 않는 공의 물리 상태를 정리한다 (물체 지우기/리셋 시 누수 방지). */
export function pruneBodies(idsToKeep: Set<number>) {
  for (const id of bodies.keys()) {
    if (!idsToKeep.has(id)) bodies.delete(id)
  }
}

const GOLDEN_ANGLE = 2.399963

export function getOrCreateBody(spec: BallSpec): BallBody {
  const existing = bodies.get(spec.id)
  if (existing) return existing

  const mat = BALL_MATERIALS[spec.type]
  const radius = mat.radius
  const volume = (4 / 3) * Math.PI * radius ** 3
  const mass = mat.density * volume

  const angle = spec.id * GOLDEN_ANGLE
  const spread = Math.min(TANK_WIDTH, TANK_DEPTH) * 0.22
  const ox = Math.cos(angle) * spread
  const oz = Math.sin(angle) * spread

  const body: BallBody = {
    id: spec.id,
    type: spec.type,
    radius,
    mass,
    volume,
    position: new THREE.Vector3(ox, BALL_DROP_HEIGHT, oz),
    velocity: new THREE.Vector3(0, 0, 0),
    prevSubmergedVolume: 0,
    waterY: 0,
  }
  bodies.set(spec.id, body)
  return body
}

/**
 * 공 하나를 한 스텝 적분한다: 중력 + 부력(잠긴 부피 기반) + 물속 저항,
 * 벽/바닥 충돌, 그리고 잠긴 부피의 변화량을 물 높이장에 소스로 되먹임한다.
 */
export function stepBody(body: BallBody, dt: number, solver: WaveSolver, accelX: number, accelZ: number) {
  const waterY = solver.sampleHeight(body.position.x, body.position.z)
  body.waterY = waterY
  const bottomY = body.position.y - body.radius
  const submergedHeight = Math.min(Math.max(waterY - bottomY, 0), 2 * body.radius)
  const submergedVolume = sphereCapVolume(body.radius, submergedHeight)
  const submergedFraction = submergedVolume / body.volume

  const buoyancyAccel = (WATER_DENSITY * SIM_GRAVITY * submergedVolume) / body.mass
  body.velocity.y += (-SIM_GRAVITY + buoyancyAccel) * dt
  body.velocity.x += accelX * dt
  body.velocity.z += accelZ * dt

  // 공기 중에서는 거의 저항이 없고, 물에 잠길수록 저항(항력)이 커진다.
  // 부력-저항 계수는 뜬 물체가 무한히 통통 튀지 않고 빠르게 평형고도로 가라앉도록
  // (물결 높이 되먹임이 증폭되지 않도록) 임계감쇠에 가깝게 잡는다.
  const dragRate = 0.05 + submergedFraction * 16
  const damping = Math.exp(-dt * dragRate)
  body.velocity.multiplyScalar(damping)

  body.position.addScaledVector(body.velocity, dt)

  const halfW = TANK_WIDTH / 2 - body.radius
  const halfD = TANK_DEPTH / 2 - body.radius
  if (body.position.x > halfW) {
    body.position.x = halfW
    body.velocity.x *= -0.3
  } else if (body.position.x < -halfW) {
    body.position.x = -halfW
    body.velocity.x *= -0.3
  }
  if (body.position.z > halfD) {
    body.position.z = halfD
    body.velocity.z *= -0.3
  } else if (body.position.z < -halfD) {
    body.position.z = -halfD
    body.velocity.z *= -0.3
  }

  const floorLimit = FLOOR_Y + body.radius
  if (body.position.y < floorLimit) {
    body.position.y = floorLimit
    if (body.velocity.y < 0) body.velocity.y *= -0.15
    body.velocity.x *= 0.9
    body.velocity.z *= 0.9
  }

  // 잠긴 부피 변화를 물결로 되먹인다. 셀 크기 대비 공이 작아 좁게 주입하면
  // 격자 스케일 잔물결(체커보드 노이즈)이 생기므로 넉넉히 넓게 퍼뜨리고,
  // 얕은물 방정식이 3D 유체 저항을 과소평가해 생기는 자기부양 되먹임을
  // 막기 위해 주입량 자체도 절반으로 줄인다.
  const deltaVolume = submergedVolume - body.prevSubmergedVolume
  body.prevSubmergedVolume = submergedVolume
  if (Math.abs(deltaVolume) > 1e-9) {
    solver.addVolumeSource(body.position.x, body.position.z, body.radius * 2.6, deltaVolume * 0.5)
  }
}
