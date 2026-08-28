import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { getFloorCrackTexture } from './floorCrackTexture'
import { waterFieldState } from './waterFieldState'
import { TANK_WIDTH, TANK_DEPTH, FLOOR_Y } from '../../labLayout'

const FADE_RATE = 9 // 1/s — 바닥이 깨지는 순간 금이 빠르게 떠오르도록

/** 쇠공 과적으로 바닥이 깨지면(WaveSolver.draining), 그 자리에 금 간 구멍 텍스처가 떠오른다. */
export function FloorCrack() {
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  const texture = useMemo(() => getFloorCrackTexture(), [])

  useFrame((_state, delta) => {
    const material = materialRef.current
    if (!material) return
    const target = waterFieldState.solver?.draining ? 1 : 0
    const dt = Math.min(delta, 1 / 30)
    material.opacity = THREE.MathUtils.lerp(material.opacity, target, Math.min(1, FADE_RATE * dt))
    if (Math.abs(material.opacity - target) < 0.01) material.opacity = target
  })

  return (
    <mesh position={[0, FLOOR_Y + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[TANK_WIDTH * 0.96, TANK_DEPTH * 0.96]} />
      <meshBasicMaterial ref={materialRef} map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
