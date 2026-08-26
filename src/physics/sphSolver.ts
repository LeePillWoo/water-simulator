import { SpatialHash } from './spatialHash'
import type { Collider, SimParams } from './types'
import { DRAIN_X, DRAIN_Y } from '../labLayout'

const SUBSTEPS = 3

// Muller et al. 2003 스타일 SPH 커널 계수
function poly6Coeff(h: number) {
  return 315 / (64 * Math.PI * Math.pow(h, 9))
}
function spikyGradCoeff(h: number) {
  return -45 / (Math.PI * Math.pow(h, 6))
}
function viscLapCoeff(h: number) {
  return 45 / (Math.PI * Math.pow(h, 6))
}

// 콜라이더 충돌 처리용 재사용 상태 객체 (매 입자/콜라이더 호출마다 새로 만들지 않음)
const col = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }

function applyBoxCollision(c: Extract<Collider, { kind: 'box' }>, r: number) {
  const [cx, cy, cz] = c.center
  const [hx, hy, hz] = c.half
  const dx = col.x - cx
  const dy = col.y - cy
  const dz = col.z - cz
  const ox = hx + r - Math.abs(dx)
  const oy = hy + r - Math.abs(dy)
  const oz = hz + r - Math.abs(dz)
  if (ox <= 0 || oy <= 0 || oz <= 0) return
  if (ox <= oy && ox <= oz) {
    const sign = dx >= 0 ? 1 : -1
    col.x = cx + sign * (hx + r)
    if (sign * col.vx < 0) col.vx = 0
    col.vy *= 0.98
    col.vz *= 0.98
  } else if (oy <= ox && oy <= oz) {
    const sign = dy >= 0 ? 1 : -1
    col.y = cy + sign * (hy + r)
    if (sign * col.vy < 0) col.vy = 0
    col.vx *= 0.9
    col.vz *= 0.9
  } else {
    const sign = dz >= 0 ? 1 : -1
    col.z = cz + sign * (hz + r)
    if (sign * col.vz < 0) col.vz = 0
    col.vx *= 0.98
    col.vy *= 0.98
  }
}

function applyCylinderCollision(c: Extract<Collider, { kind: 'cylinder' }>, r: number) {
  const [cx, cy, cz] = c.center
  const dx = col.x - cx
  const dz = col.z - cz
  const radialDist = Math.sqrt(dx * dx + dz * dz)
  const dy = col.y - cy
  const oy = c.halfHeight + r - Math.abs(dy)
  const orad = c.radius + r - radialDist
  if (orad <= 0 || oy <= 0) return
  if (orad <= oy) {
    const inv = radialDist > 1e-5 ? 1 / radialDist : 0
    const nx = dx * inv
    const nz = dz * inv
    col.x = cx + nx * (c.radius + r)
    col.z = cz + nz * (c.radius + r)
    const vn = col.vx * nx + col.vz * nz
    if (vn < 0) {
      col.vx -= vn * nx
      col.vz -= vn * nz
    }
    col.vy *= 0.9
  } else {
    const sign = dy >= 0 ? 1 : -1
    col.y = cy + sign * (c.halfHeight + r)
    if (sign * col.vy < 0) col.vy = 0
    col.vx *= 0.9
    col.vz *= 0.9
  }
}

export class SPHSolver {
  readonly capacity: number
  positions: Float32Array
  velocities: Float32Array
  densities: Float32Array
  pressures: Float32Array
  forces: Float32Array
  active = 0
  params: SimParams
  private hash: SpatialHash

  constructor(capacity: number, params: SimParams) {
    this.capacity = capacity
    this.positions = new Float32Array(capacity * 3)
    this.velocities = new Float32Array(capacity * 3)
    this.densities = new Float32Array(capacity)
    this.pressures = new Float32Array(capacity)
    this.forces = new Float32Array(capacity * 3)
    this.params = params
    this.hash = new SpatialHash(params.smoothingRadius)
  }

  /** tier1 저수조 위치에 격자 형태로 물을 채운다. */
  spawnGrid(count: number, bounds: { xMin: number; xMax: number; yMin: number; yMax: number; zMin: number; zMax: number }) {
    const n = Math.min(count, this.capacity)
    const spacing = this.params.particleRadius * 2.1
    const spanX = bounds.xMax - bounds.xMin
    const spanZ = bounds.zMax - bounds.zMin
    const countX = Math.max(1, Math.floor(spanX / spacing))
    const countZ = Math.max(1, Math.floor(spanZ / spacing))
    let i = 0
    outer: for (let iy = 0; ; iy++) {
      const y = bounds.yMin + iy * spacing
      if (y > bounds.yMax) break
      for (let ix = 0; ix < countX; ix++) {
        for (let iz = 0; iz < countZ; iz++) {
          if (i >= n) break outer
          const jitter = () => (Math.random() - 0.5) * spacing * 0.1
          this.positions[i * 3] = bounds.xMin + ix * spacing + spacing / 2 + jitter()
          this.positions[i * 3 + 1] = y + jitter()
          this.positions[i * 3 + 2] = bounds.zMin + iz * spacing + spacing / 2 + jitter()
          this.velocities[i * 3] = 0
          this.velocities[i * 3 + 1] = 0
          this.velocities[i * 3 + 2] = 0
          i++
        }
      }
    }
    this.active = i
    // 남은 슬롯은 화면 밖으로 치워둔다.
    for (; i < this.capacity; i++) {
      this.positions[i * 3 + 1] = DRAIN_Y - 10
    }
  }

  setActiveCount(count: number) {
    this.active = Math.min(count, this.capacity)
  }

  step(dt: number, colliders: Collider[]) {
    const sdt = dt / SUBSTEPS
    for (let s = 0; s < SUBSTEPS; s++) this.substep(sdt, colliders)
  }

  private substep(dt: number, colliders: Collider[]) {
    const n = this.active
    if (n === 0) return
    const { positions, velocities, densities, pressures, forces } = this
    const { smoothingRadius: h, restDensity, stiffness, viscosity, gravity, particleRadius, mass, maxSpeed } = this.params
    const h2 = h * h
    const p6 = poly6Coeff(h)
    const spikyC = spikyGradCoeff(h)
    const viscC = viscLapCoeff(h)

    this.hash.build(positions, n)

    // 1) 밀도
    let curI = 0
    const densityVisit = (j: number) => {
      const i = curI
      const dx = positions[i * 3] - positions[j * 3]
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
      const r2 = dx * dx + dy * dy + dz * dz
      if (r2 >= h2) return
      const diff = h2 - r2
      densities[i] += mass * p6 * diff * diff * diff
    }
    for (curI = 0; curI < n; curI++) {
      densities[curI] = 0
      this.hash.forEachNeighbor(positions[curI * 3], positions[curI * 3 + 1], positions[curI * 3 + 2], densityVisit)
      if (densities[curI] < restDensity * 0.05) densities[curI] = restDensity * 0.05
    }

    // 2) 압력 (state equation)
    for (let i = 0; i < n; i++) {
      pressures[i] = Math.max(0, stiffness * (densities[i] - restDensity))
    }

    // 3) 힘 (압력 + 점성 + 중력)
    forces.fill(0, 0, n * 3)
    const forceVisit = (j: number) => {
      const i = curI
      if (j === i) return
      const dx = positions[i * 3] - positions[j * 3]
      const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
      const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
      const r2 = dx * dx + dy * dy + dz * dz
      if (r2 >= h2 || r2 < 1e-12) return
      const r = Math.sqrt(r2)
      const invR = 1 / r
      const hr = h - r

      // pressure force (spiky gradient)
      const pTerm = (mass * (pressures[i] + pressures[j])) / (2 * densities[j])
      const gradScalar = spikyC * hr * hr
      forces[i * 3] += -pTerm * gradScalar * dx * invR
      forces[i * 3 + 1] += -pTerm * gradScalar * dy * invR
      forces[i * 3 + 2] += -pTerm * gradScalar * dz * invR

      // viscosity force
      const vTerm = (viscosity * mass * viscC * hr) / densities[j]
      forces[i * 3] += vTerm * (velocities[j * 3] - velocities[i * 3])
      forces[i * 3 + 1] += vTerm * (velocities[j * 3 + 1] - velocities[i * 3 + 1])
      forces[i * 3 + 2] += vTerm * (velocities[j * 3 + 2] - velocities[i * 3 + 2])
    }
    for (curI = 0; curI < n; curI++) {
      this.hash.forEachNeighbor(positions[curI * 3], positions[curI * 3 + 1], positions[curI * 3 + 2], forceVisit)
      forces[curI * 3 + 1] += densities[curI] * gravity
    }

    // 4) 적분 + 충돌 처리
    for (let i = 0; i < n; i++) {
      const inv = 1 / densities[i]
      let vx = velocities[i * 3] + forces[i * 3] * inv * dt
      let vy = velocities[i * 3 + 1] + forces[i * 3 + 1] * inv * dt
      let vz = velocities[i * 3 + 2] + forces[i * 3 + 2] * inv * dt

      const speed = Math.sqrt(vx * vx + vy * vy + vz * vz)
      if (speed > maxSpeed) {
        const s = maxSpeed / speed
        vx *= s
        vy *= s
        vz *= s
      }

      col.x = positions[i * 3] + vx * dt
      col.y = positions[i * 3 + 1] + vy * dt
      col.z = positions[i * 3 + 2] + vz * dt
      col.vx = vx
      col.vy = vy
      col.vz = vz

      for (let c = 0; c < colliders.length; c++) {
        const collider = colliders[c]
        if (collider.kind === 'box') applyBoxCollision(collider, particleRadius)
        else applyCylinderCollision(collider, particleRadius)
      }

      // 배수: 실험실 바닥 왼쪽 끝을 넘어가면 물을 치운다.
      if (col.x < DRAIN_X && col.y < 1) {
        col.y = DRAIN_Y - 10
        col.vx = 0
        col.vy = 0
        col.vz = 0
      }

      positions[i * 3] = col.x
      positions[i * 3 + 1] = col.y
      positions[i * 3 + 2] = col.z
      velocities[i * 3] = col.vx
      velocities[i * 3 + 1] = col.vy
      velocities[i * 3 + 2] = col.vz
    }
  }
}
