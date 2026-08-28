import {
  GRID_RES,
  TANK_WIDTH,
  TANK_DEPTH,
  TANK_WALL_HEIGHT,
  REST_WATER_DEPTH,
  SIM_GRAVITY,
  WAVE_DAMPING,
  HEIGHT_SMOOTH,
  MIN_WATER_DEPTH,
  OVERFLOW_MARGIN,
  FLOOR_DRAIN_RATE,
} from '../labLayout'

const N = GRID_RES
const STRIDE = N + 1
const SIZE = STRIDE * STRIDE
const DX = TANK_WIDTH / N
const DZ = TANK_DEPTH / N
const WAVE_SPEED = Math.sqrt(SIM_GRAVITY * REST_WATER_DEPTH)
const MAX_SUBSTEP_DT = Math.min(DX, DZ) / (WAVE_SPEED * Math.SQRT2)
const MAX_DT = 1 / 30
const MIN_H = -REST_WATER_DEPTH + MIN_WATER_DEPTH
const MAX_H = TANK_WALL_HEIGHT - REST_WATER_DEPTH - OVERFLOW_MARGIN
const OVERFLOW_DECAY = 0.9

/**
 * CPU shallow-water solver (linearized): height field `h` plus horizontal
 * velocity field `(u, v)`, all co-located on an (N+1)x(N+1) grid over the
 * tank footprint. Runs on CPU (not a GPU ping-pong texture) so that future
 * buoyancy physics can read `sampleHeight` synchronously every physics step.
 */
export class WaveSolver {
  readonly n = N
  readonly dx = DX
  readonly dz = DZ

  h = new Float32Array(SIZE)
  u = new Float32Array(SIZE)
  v = new Float32Array(SIZE)
  normals = new Float32Array(SIZE * 3)
  /** 벽 위로 넘친 지점에서 1로 튀었다가 서서히 식는 거품 하이라이트 강도. */
  overflow = new Float32Array(SIZE)
  /** 쇠공 과적으로 바닥이 깨졌는지 — 한 번 켜지면 수위가 바닥까지 서서히 빠진다. */
  draining = false

  private h2 = new Float32Array(SIZE)
  private u2 = new Float32Array(SIZE)
  private v2 = new Float32Array(SIZE)

  constructor() {
    this.computeNormals()
  }

  reset() {
    this.h.fill(0)
    this.u.fill(0)
    this.v.fill(0)
    this.overflow.fill(0)
    this.draining = false
    this.computeNormals()
  }

  /** 바닥이 깨졌음을 알린다. 이미 깨진 상태면 아무 일도 하지 않는다.
   * 반환값은 "이번 호출로 처음 깨졌는지"라 호출부에서 파열 연출을 한 번만 트리거하는 데 쓸 수 있다. */
  breakFloor(): boolean {
    if (this.draining) return false
    this.draining = true
    return true
  }

  step(dt: number, accelX: number, accelZ: number) {
    const clamped = Math.min(dt, MAX_DT)
    if (clamped <= 0) return
    if (this.draining) this.applyDrain(clamped)
    const substeps = Math.max(1, Math.ceil(clamped / MAX_SUBSTEP_DT))
    const sub = clamped / substeps
    for (let s = 0; s < substeps; s++) this.substep(sub, accelX, accelZ)
    this.computeNormals()
  }

  // 바닥이 깨진 뒤: 격자 전체 수위를 균일하게 낮춘다. 실제 바닥으로 뚫고 내려가지는
  // 못하게 매 substep의 clampToTankBounds가 계속 MIN_H로 막아주므로, 여기서는
  // 그냥 계속 퍼내기만 하면 자연스럽게 "물이 다 빠진 마른 바닥" 상태에 수렴한다.
  private applyDrain(dt: number) {
    const drop = FLOOR_DRAIN_RATE * dt
    const { h } = this
    for (let idx = 0; idx < SIZE; idx++) h[idx] -= drop
  }

  sampleHeight(worldX: number, worldZ: number): number {
    const gx = (worldX + TANK_WIDTH / 2) / DX
    const gz = (worldZ + TANK_DEPTH / 2) / DZ
    const i0 = Math.max(0, Math.min(N - 1, Math.floor(gx)))
    const j0 = Math.max(0, Math.min(N - 1, Math.floor(gz)))
    const fx = Math.min(1, Math.max(0, gx - i0))
    const fz = Math.min(1, Math.max(0, gz - j0))
    const idx00 = j0 * STRIDE + i0
    const idx10 = idx00 + 1
    const idx01 = idx00 + STRIDE
    const idx11 = idx01 + 1
    const { h } = this
    const a = h[idx00] * (1 - fx) + h[idx10] * fx
    const b = h[idx01] * (1 - fx) + h[idx11] * fx
    return REST_WATER_DEPTH + (a * (1 - fz) + b * fz)
  }

  /**
   * 물에 잠긴 물체의 부피 변화량(m^3)을 (worldX, worldZ) 주변에 반경 `radius`의
   * 부드러운 커널로 뿌려 높이장에 직접 주입한다. 물체가 가라앉으며 부피가 늘면
   * 수면이 솟아오르고, 떠오르며 부피가 줄면 수면이 가라앉아 파동으로 퍼져나간다.
   */
  addVolumeSource(worldX: number, worldZ: number, radius: number, volume: number) {
    if (radius <= 0 || volume === 0) return
    const { h } = this
    const gx = (worldX + TANK_WIDTH / 2) / DX
    const gz = (worldZ + TANK_DEPTH / 2) / DZ
    const rCellsX = Math.max(1, Math.ceil(radius / DX))
    const rCellsZ = Math.max(1, Math.ceil(radius / DZ))
    const i0 = Math.round(gx)
    const j0 = Math.round(gz)
    const iMin = Math.max(0, i0 - rCellsX)
    const iMax = Math.min(N, i0 + rCellsX)
    const jMin = Math.max(0, j0 - rCellsZ)
    const jMax = Math.min(N, j0 + rCellsZ)
    const r2 = radius * radius

    let totalWeight = 0
    for (let j = jMin; j <= jMax; j++) {
      const wz = (j - gz) * DZ
      for (let i = iMin; i <= iMax; i++) {
        const wx = (i - gx) * DX
        const d2 = wx * wx + wz * wz
        if (d2 >= r2) continue
        const t = 1 - d2 / r2
        totalWeight += t * t
      }
    }
    if (totalWeight <= 0) return

    const cellArea = DX * DZ
    const scale = volume / (totalWeight * cellArea)
    for (let j = jMin; j <= jMax; j++) {
      const wz = (j - gz) * DZ
      const row = j * STRIDE
      for (let i = iMin; i <= iMax; i++) {
        const wx = (i - gx) * DX
        const d2 = wx * wx + wz * wz
        if (d2 >= r2) continue
        const t = 1 - d2 / r2
        h[row + i] += t * t * scale
      }
    }
  }

  private substep(dt: number, accelX: number, accelZ: number) {
    const { h, u, v, h2, u2, v2 } = this
    const invDx2 = 1 / (2 * DX)
    const invDz2 = 1 / (2 * DZ)
    const dampMul = Math.max(0, 1 - WAVE_DAMPING * dt)

    for (let j = 1; j < N; j++) {
      const row = j * STRIDE
      for (let i = 1; i < N; i++) {
        const idx = row + i
        const dhdx = (h[idx + 1] - h[idx - 1]) * invDx2
        const dhdz = (h[idx + STRIDE] - h[idx - STRIDE]) * invDz2
        u2[idx] = (u[idx] + dt * (-SIM_GRAVITY * dhdx + accelX)) * dampMul
        v2[idx] = (v[idx] + dt * (-SIM_GRAVITY * dhdz + accelZ)) * dampMul
      }
    }
    applyVelocityBoundary(u2, v2)

    for (let j = 1; j < N; j++) {
      const row = j * STRIDE
      for (let i = 1; i < N; i++) {
        const idx = row + i
        const dudx = (u2[idx + 1] - u2[idx - 1]) * invDx2
        const dvdz = (v2[idx + STRIDE] - v2[idx - STRIDE]) * invDz2
        h2[idx] = h[idx] - dt * REST_WATER_DEPTH * (dudx + dvdz)
      }
    }
    applyHeightBoundary(h2)
    if (HEIGHT_SMOOTH > 0) smoothHeight(h2)
    clampToTankBounds(h2, u2, v2, this.overflow)

    this.h = h2
    this.h2 = h
    this.u = u2
    this.u2 = u
    this.v = v2
    this.v2 = v
  }

  private computeNormals() {
    const { h, normals } = this
    for (let j = 0; j <= N; j++) {
      const row = j * STRIDE
      const jDown = j > 0 ? row - STRIDE : row
      const jUp = j < N ? row + STRIDE : row
      const dzScale = j > 0 && j < N ? 1 / (2 * DZ) : 1 / DZ
      for (let i = 0; i <= N; i++) {
        const idx = row + i
        const iLeft = i > 0 ? idx - 1 : idx
        const iRight = i < N ? idx + 1 : idx
        const dxScale = i > 0 && i < N ? 1 / (2 * DX) : 1 / DX
        const dhdx = (h[iRight] - h[iLeft]) * dxScale
        const dhdz = (h[jUp + i] - h[jDown + i]) * dzScale
        const nx = -dhdx
        const ny = 1
        const nz = -dhdz
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
        const o = idx * 3
        normals[o] = nx / len
        normals[o + 1] = ny / len
        normals[o + 2] = nz / len
      }
    }
  }
}

function applyVelocityBoundary(u2: Float32Array, v2: Float32Array) {
  for (let j = 0; j <= N; j++) {
    u2[j * STRIDE] = 0
    u2[j * STRIDE + N] = 0
  }
  for (let i = 0; i <= N; i++) {
    v2[i] = 0
    v2[N * STRIDE + i] = 0
  }
}

function applyHeightBoundary(h2: Float32Array) {
  for (let j = 0; j <= N; j++) {
    const row = j * STRIDE
    h2[row] = h2[row + 1]
    h2[row + N] = h2[row + N - 1]
  }
  for (let i = 0; i <= N; i++) {
    h2[i] = h2[STRIDE + i]
    h2[N * STRIDE + i] = h2[(N - 1) * STRIDE + i]
  }
}

/**
 * 수조 벽/바닥 경계 조건. 두 가지를 함께 막는다:
 *  - 젖음-마름(wetting-drying): 기울어져 수심이 0으로 수렴하는 얕은 쪽에서
 *    수면이 바닥(y=0) 아래로 뚫고 내려가지 않게 최소 수심으로 막는다.
 *  - 넘침(overflow): 수위가 벽 꼭대기를 넘어서면 유리를 뚫고 올라가는 대신
 *    그만큼을 버려(넘쳐 사라진 것으로 취급) 벽 높이 아래로 다시 막는다.
 * 막힌 칸은 계속 밀어붙이는 속도도 죽여서 경계에서 진동이 쌓이지 않게 하고,
 * 넘친 칸은 `overflow` 마스크를 잠깐 밝혔다가 서서히 식혀 거품 하이라이트로 쓴다.
 */
function clampToTankBounds(h2: Float32Array, u2: Float32Array, v2: Float32Array, overflow: Float32Array) {
  for (let j = 0; j <= N; j++) {
    const row = j * STRIDE
    for (let i = 0; i <= N; i++) {
      const idx = row + i
      if (h2[idx] < MIN_H) {
        h2[idx] = MIN_H
        u2[idx] *= 0.2
        v2[idx] *= 0.2
        overflow[idx] *= OVERFLOW_DECAY
      } else if (h2[idx] > MAX_H) {
        h2[idx] = MAX_H
        u2[idx] *= 0.2
        v2[idx] *= 0.2
        overflow[idx] = 1
      } else {
        overflow[idx] *= OVERFLOW_DECAY
      }
    }
  }
}

function smoothHeight(h2: Float32Array) {
  for (let j = 1; j < N; j++) {
    const row = j * STRIDE
    for (let i = 1; i < N; i++) {
      const idx = row + i
      const avg = (h2[idx - 1] + h2[idx + 1] + h2[idx - STRIDE] + h2[idx + STRIDE]) * 0.25
      h2[idx] = h2[idx] * (1 - HEIGHT_SMOOTH) + avg * HEIGHT_SMOOTH
    }
  }
}
