import * as THREE from 'three'
import type { WaveSolver } from './waveSolver'
import type { BallSpec } from '../store/useSimStore'
import type { BallType } from './toyTypes'
import { TOY_DEFS } from './toyTypes'
import { TANK_WIDTH, TANK_DEPTH, FLOOR_Y, SIM_GRAVITY, WATER_DENSITY, BALL_DROP_HEIGHT } from '../labLayout'

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
  /** 물에 잠겨 있는 중인지 — 진입 순간(첫 접촉)을 감지해 충격 스플래시를 한 번만 터뜨리는 데 쓴다. */
  wasWet: boolean
  /** 유영 가능한 장난감(오리/배)의 현재 진행 방향(라디안). 렌더링에서 그대로 회전값으로 쓴다. */
  heading: number
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

export function getOrCreateBody(spec: BallSpec): BallBody {
  const existing = bodies.get(spec.id)
  if (existing) return existing

  const def = TOY_DEFS[spec.type]
  const radius = def.physicsRadius
  const volume = (4 / 3) * Math.PI * radius ** 3
  const mass = def.density * volume

  // 낙하 지점을 완전히 무작위로 뿌린다(각도 + 넓이 기준 균일 반지름)。
  // 각도만 바꾸고 반지름을 고정하면 많이 떨어뜨렸을 때 도넛 모양으로 자리가
  // 고정돼 보이므로, 반지름도 sqrt(random)으로 골라 원판 위에 고르게 퍼뜨린다.
  const maxSpread = Math.min(TANK_WIDTH, TANK_DEPTH) * 0.38
  const r = maxSpread * Math.sqrt(Math.random())
  const angle = Math.random() * Math.PI * 2
  const ox = Math.cos(angle) * r
  const oz = Math.sin(angle) * r

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
    wasWet: false,
    heading: Math.random() * Math.PI * 2,
  }
  bodies.set(spec.id, body)
  return body
}

// 물에 처음 부딪히는 순간의 충격을 물결/소리로 환산할 때 쓰는 기준 운동량(kg·m/s).
// 쇠공이 이 값 근처에서 강도 1(가장 크게 "퐁덩")이 되도록 잡았다.
const SPLASH_REFERENCE_MOMENTUM = 180
const SPLASH_IMPACT_VOLUME_COEFF = 0.00006
const SPLASH_MIN_IMPACT_SPEED = 0.15

// 오리/배가 실제 오리처럼 수면을 유영해 다니게 하는 값들.
// 뜬 물체는 잠긴 부피가 작아 물속 저항(dragRate)이 커서, 추진력 대부분이
// 감쇠에 먹혀 평형속도(thrust/dragRate)가 매우 낮게 잡힌다 — 눈에 띄게
// 돌아다니려면 감쇠를 이기고도 남을 만큼 추진력을 넉넉히 줘야 한다.
const WANDER_TURN_RATE = 0.45 // 방향이 무작위로 꺾이는 최대 각속도(rad/s) — 랜덤워크라 부드럽게 곡선을 그린다
const WANDER_THRUST = 0.16 // 진행 방향으로 미는 가속도(m/s^2)
const WANDER_MAX_SPEED = 0.22 // 수평 속도 상한(m/s) — 느긋하게 순항하는 속도
const WALL_AVOID_MARGIN = 0.4 // 벽에서 이 거리 안으로 들어오면 중심 쪽으로 방향을 틀기 시작
const WALL_AVOID_TURN_RATE = 2.5 // 벽 회피 조향의 세기

/**
 * 공 하나를 한 스텝 적분한다: 중력 + 부력(잠긴 부피 기반) + 물속 저항,
 * 벽/바닥 충돌, 그리고 잠긴 부피의 변화량을 물 높이장에 소스로 되먹인다.
 * 물에 처음 부딪히는 순간에는 질량*속도(운동량)에 비례하는 충격파를 추가로
 * 주입하고, `onSplash`로 그 세기를 알려 소리 효과와 연결할 수 있게 한다.
 */
export function stepBody(
  body: BallBody,
  dt: number,
  solver: WaveSolver,
  accelX: number,
  accelZ: number,
  onSplash?: (type: BallType, intensity: number) => void,
) {
  const waterY = solver.sampleHeight(body.position.x, body.position.z)
  body.waterY = waterY
  const bottomY = body.position.y - body.radius
  const submergedHeight = Math.min(Math.max(waterY - bottomY, 0), 2 * body.radius)
  const submergedVolume = sphereCapVolume(body.radius, submergedHeight)
  const submergedFraction = submergedVolume / body.volume

  const isWet = submergedVolume > 1e-9
  if (isWet && !body.wasWet) {
    const impactSpeed = Math.abs(body.velocity.y)
    if (impactSpeed > SPLASH_MIN_IMPACT_SPEED) {
      const momentum = body.mass * impactSpeed
      const intensity = Math.min(1, momentum / SPLASH_REFERENCE_MOMENTUM)
      const impactBoost = Math.min(body.volume * 4, SPLASH_IMPACT_VOLUME_COEFF * momentum)
      solver.addVolumeSource(body.position.x, body.position.z, body.radius * 3.2, impactBoost)
      onSplash?.(body.type, intensity)
    }
  }
  body.wasWet = isWet

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

  // 물에 떠 있는 오리/배는 진짜 오리처럼 스스로 방향을 천천히 바꿔가며
  // 유영한다: 진행각을 작은 랜덤워크로 부드럽게 굽이치게 하고, 벽에 가까워지면
  // 중심 쪽으로 미리 방향을 틀어 자연스럽게 피해 다니게 한다.
  if (TOY_DEFS[body.type].canWander && submergedFraction > 0.15) {
    body.heading += (Math.random() * 2 - 1) * WANDER_TURN_RATE * dt

    const halfWWander = TANK_WIDTH / 2 - body.radius
    const halfDWander = TANK_DEPTH / 2 - body.radius
    const marginX = halfWWander - Math.abs(body.position.x)
    const marginZ = halfDWander - Math.abs(body.position.z)
    const nearestMargin = Math.min(marginX, marginZ)
    if (nearestMargin < WALL_AVOID_MARGIN) {
      const avoidStrength = 1 - Math.max(0, nearestMargin) / WALL_AVOID_MARGIN
      const towardCenter = Math.atan2(-body.position.z, -body.position.x)
      let diff = towardCenter - body.heading
      diff = Math.atan2(Math.sin(diff), Math.cos(diff))
      body.heading += diff * avoidStrength * WALL_AVOID_TURN_RATE * dt
    }

    body.velocity.x += Math.cos(body.heading) * WANDER_THRUST * dt
    body.velocity.z += Math.sin(body.heading) * WANDER_THRUST * dt

    const horizSpeed = Math.hypot(body.velocity.x, body.velocity.z)
    if (horizSpeed > WANDER_MAX_SPEED) {
      const scale = WANDER_MAX_SPEED / horizSpeed
      body.velocity.x *= scale
      body.velocity.z *= scale
    }
  }

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
