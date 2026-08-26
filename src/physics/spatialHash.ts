// 균일 격자 기반 공간 해시. SPH 이웃 탐색을 O(n)에 가깝게 만들기 위한 구조체.
// 매 서브스텝마다 build()로 재구성하고, 이웃 셀(3x3x3)만 조회한다.

const TABLE_SIZE = 200003 // 임의의 소수

export class SpatialHash {
  private table: (number[] | undefined)[]
  private used: number[] = []
  private cellSize: number

  constructor(cellSize: number) {
    this.cellSize = cellSize
    this.table = new Array(TABLE_SIZE)
  }

  private cellCoord(v: number): number {
    return Math.floor(v / this.cellSize)
  }

  private hashCell(ix: number, iy: number, iz: number): number {
    let h = (ix * 92837111) ^ (iy * 689287499) ^ (iz * 283923481)
    h = h >>> 0
    return h % TABLE_SIZE
  }

  build(positions: Float32Array, count: number) {
    for (const idx of this.used) this.table[idx] = undefined
    this.used.length = 0

    for (let i = 0; i < count; i++) {
      const ix = this.cellCoord(positions[i * 3])
      const iy = this.cellCoord(positions[i * 3 + 1])
      const iz = this.cellCoord(positions[i * 3 + 2])
      const h = this.hashCell(ix, iy, iz)
      let bucket = this.table[h]
      if (!bucket) {
        bucket = []
        this.table[h] = bucket
        this.used.push(h)
      }
      bucket.push(i)
    }
  }

  /** px,py,pz 주변 3x3x3 셀에 속한 입자 인덱스에 대해 visit(j)를 호출한다. */
  forEachNeighbor(px: number, py: number, pz: number, visit: (j: number) => void) {
    const cx = this.cellCoord(px)
    const cy = this.cellCoord(py)
    const cz = this.cellCoord(pz)
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const h = this.hashCell(cx + dx, cy + dy, cz + dz)
          const bucket = this.table[h]
          if (!bucket) continue
          for (let k = 0; k < bucket.length; k++) visit(bucket[k])
        }
      }
    }
  }
}
