import {
  GRID_RES,
  TANK_WIDTH,
  TANK_DEPTH,
  REST_WATER_DEPTH,
  SIM_GRAVITY,
  WAVE_DAMPING,
  HEIGHT_SMOOTH,
  MIN_WATER_DEPTH,
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
    this.computeNormals()
  }

  step(dt: number, accelX: number, accelZ: number) {
    const clamped = Math.min(dt, MAX_DT)
    if (clamped <= 0) return
    const substeps = Math.max(1, Math.ceil(clamped / MAX_SUBSTEP_DT))
    const sub = clamped / substeps
    for (let s = 0; s < substeps; s++) this.substep(sub, accelX, accelZ)
    this.computeNormals()
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
    clampDryFloor(h2, u2, v2)

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
 * 젖음-마름(wetting-drying) 경계 조건: 수조가 기울어져 수심이 0으로 수렴하는
 * 얕은 쪽에서 수면이 바닥(y=0) 아래로 뚫고 내려가지 않도록 최소 수심으로 막는다.
 * 막힌 칸은 계속 물을 밀어내려는 속도도 죽여서 마른 경계에서 진동이 쌓이지 않게 한다.
 */
function clampDryFloor(h2: Float32Array, u2: Float32Array, v2: Float32Array) {
  for (let j = 0; j <= N; j++) {
    const row = j * STRIDE
    for (let i = 0; i <= N; i++) {
      const idx = row + i
      if (h2[idx] < MIN_H) {
        h2[idx] = MIN_H
        u2[idx] *= 0.2
        v2[idx] *= 0.2
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
