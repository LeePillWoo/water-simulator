import { useMemo } from 'react'
import { useSimStore } from '../store/useSimStore'
import { TIER1, TIER2, FLOOR, TIER1_WALL_TOP, TIER2_WALL_TOP, FLOOR_WALL_TOP, Z_MIN, Z_MAX, WALL_THK } from '../labLayout'

const zCenter = (Z_MIN + Z_MAX) / 2
const halfZ = (Z_MAX - Z_MIN) / 2

function Platform({ xMin, xMax, y }: { xMin: number; xMax: number; y: number }) {
  const cx = (xMin + xMax) / 2
  const width = xMax - xMin
  return (
    <mesh position={[cx, y - WALL_THK / 2, zCenter]} receiveShadow>
      <boxGeometry args={[width, WALL_THK, halfZ * 2]} />
      <meshStandardMaterial color="#8a8f98" roughness={0.85} />
    </mesh>
  )
}

function SideWalls({ xMin, xMax, y, wallTop }: { xMin: number; xMax: number; y: number; wallTop: number }) {
  const cx = (xMin + xMax) / 2
  const width = xMax - xMin
  const wallH = wallTop - y
  const wallCy = (y + wallTop) / 2
  return (
    <>
      <mesh position={[cx, wallCy, Z_MIN - WALL_THK / 2]}>
        <boxGeometry args={[width, wallH, WALL_THK]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.28} roughness={0.15} metalness={0.1} depthWrite={false} />
      </mesh>
      <mesh position={[cx, wallCy, Z_MAX + WALL_THK / 2]}>
        <boxGeometry args={[width, wallH, WALL_THK]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.28} roughness={0.15} metalness={0.1} depthWrite={false} />
      </mesh>
    </>
  )
}

function Gate({ x, y, gateHeight, openPercent }: { x: number; y: number; gateHeight: number; openPercent: number }) {
  const frac = Math.min(1, Math.max(0, openPercent / 100))
  const bottom = y + frac * gateHeight
  const centerY = bottom + gateHeight / 2
  return (
    <mesh position={[x, centerY, zCenter]} castShadow>
      <boxGeometry args={[WALL_THK, gateHeight, halfZ * 2]} />
      <meshStandardMaterial color="#c0455c" metalness={0.55} roughness={0.4} />
    </mesh>
  )
}

export function DamStructure() {
  const gate1Open = useSimStore((s) => s.gate1Open)
  const gate2Open = useSimStore((s) => s.gate2Open)

  const tier1RightWall = useMemo(
    () => ({
      cx: TIER1.xMax + WALL_THK / 2,
      cy: (TIER1.y + TIER1_WALL_TOP) / 2,
      h: TIER1_WALL_TOP - TIER1.y,
    }),
    [],
  )

  return (
    <group>
      {/* Tier 1 (상단 저수조) */}
      <Platform xMin={TIER1.xMin} xMax={TIER1.xMax} y={TIER1.y} />
      <SideWalls xMin={TIER1.xMin} xMax={TIER1.xMax} y={TIER1.y} wallTop={TIER1_WALL_TOP} />
      <mesh position={[tier1RightWall.cx, tier1RightWall.cy, zCenter]}>
        <boxGeometry args={[WALL_THK, tier1RightWall.h, halfZ * 2]} />
        <meshStandardMaterial color="#7ec8e3" transparent opacity={0.28} roughness={0.15} metalness={0.1} depthWrite={false} />
      </mesh>
      <Gate x={TIER1.xMin} y={TIER1.y} gateHeight={TIER1.gateHeight} openPercent={gate1Open} />

      {/* Tier 2 (중단 저수조) */}
      <Platform xMin={TIER2.xMin} xMax={TIER2.xMax} y={TIER2.y} />
      <SideWalls xMin={TIER2.xMin} xMax={TIER2.xMax} y={TIER2.y} wallTop={TIER2_WALL_TOP} />
      <Gate x={TIER2.xMin} y={TIER2.y} gateHeight={TIER2.gateHeight} openPercent={gate2Open} />

      {/* 실험실 바닥 (장애물 배치 구역) */}
      <Platform xMin={FLOOR.xMin} xMax={FLOOR.xMax} y={FLOOR.y} />
      <SideWalls xMin={FLOOR.xMin} xMax={FLOOR.xMax} y={FLOOR.y} wallTop={FLOOR_WALL_TOP} />
    </group>
  )
}
