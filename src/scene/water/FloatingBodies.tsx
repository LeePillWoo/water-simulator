import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group } from 'three'
import { useSimStore } from '../../store/useSimStore'
import { waterFieldState } from './waterFieldState'
import { tiltState } from './tiltState'
import { getOrCreateBody, stepBody, resetBodies, pruneBodies } from '../../physics/ballBody'
import {
  getOrCreateBallMaterials,
  pruneBallMaterials,
  disposeAllBallMaterials,
  TOY_OUTLINE_MATERIAL,
  TOY_OUTLINE_THICKNESS,
} from '../../physics/ballMaterial'
import { TOY_DEFS, type BallType } from '../../physics/toyTypes'
import { playSplash } from '../../audio/soundEngine'
import { SIM_GRAVITY } from '../../labLayout'

// 모든 장난감 부품은 단위 구(반지름 1)를 부품별 스케일로 늘여 표현하므로,
// 지오메트리 하나를 모든 부품·모든 공이 공유한다.
const UNIT_SPHERE = new THREE.SphereGeometry(1, 20, 16)

/** 나무공/쇠공/장난감들을 낙하시켜 부력·물속 저항·벽 충돌로 뜨거나 가라앉게 하고,
 * 잠긴 부피 변화 및 첫 입수 충격을 물결·소리로 되먹인다. */
export function FloatingBodies() {
  const balls = useSimStore((s) => s.balls)
  const isRunning = useSimStore((s) => s.isRunning)
  const resetSignal = useSimStore((s) => s.resetSignal)
  const groupRefs = useRef(new Map<number, Group>())

  useEffect(() => {
    resetBodies()
  }, [resetSignal])

  useEffect(() => {
    const ids = new Set(balls.map((b) => b.id))
    for (const id of groupRefs.current.keys()) {
      if (!ids.has(id)) groupRefs.current.delete(id)
    }
    pruneBodies(ids)
    pruneBallMaterials(ids)
  }, [balls])

  useEffect(() => disposeAllBallMaterials, [])

  useFrame((_state, delta) => {
    const solver = waterFieldState.solver
    if (!solver || !isRunning) return
    const dt = Math.min(delta, 1 / 30)
    const accelX = -SIM_GRAVITY * Math.sin(tiltState.z)
    const accelZ = SIM_GRAVITY * Math.sin(tiltState.x)

    for (const spec of balls) {
      const body = getOrCreateBody(spec)
      stepBody(body, dt, solver, accelX, accelZ, (_type, intensity) => playSplash(intensity))
      const group = groupRefs.current.get(spec.id)
      group?.position.copy(body.position)
      // 장난감의 로컬 +X를 정면으로 두고 설계했으므로, 진행각(heading)을 그대로
      // -Y회전으로 반영하면 오리/배가 실제로 나아가는 방향을 바라보게 된다.
      if (group) group.rotation.y = -body.heading
      const { bodyUniforms } = getOrCreateBallMaterials(spec)
      bodyUniforms.uWaterY.value = body.waterY
      bodyUniforms.uBallCenter.value.copy(body.position)
    }
  })

  return (
    <>
      {balls.map((spec) => (
        <ToyGroup
          key={spec.id}
          groupRef={(g) => {
            if (g) {
              groupRefs.current.set(spec.id, g)
              const body = getOrCreateBody(spec)
              g.position.copy(body.position)
              g.rotation.y = -body.heading
            } else {
              groupRefs.current.delete(spec.id)
            }
          }}
          type={spec.type}
          materials={getOrCreateBallMaterials(spec).materials}
        />
      ))}
    </>
  )
}

interface ToyGroupProps {
  type: BallType
  materials: THREE.MeshToonMaterial[]
  groupRef: (g: Group | null) => void
}

function ToyGroup({ type, materials, groupRef }: ToyGroupProps) {
  const parts = TOY_DEFS[type].parts
  const scales = useMemo(
    () => parts.map((p): [number, number, number] => [p.radius * p.scale[0], p.radius * p.scale[1], p.radius * p.scale[2]]),
    [parts],
  )
  const outlineScales = useMemo(
    () =>
      scales.map(
        (s): [number, number, number] => [
          s[0] + TOY_OUTLINE_THICKNESS,
          s[1] + TOY_OUTLINE_THICKNESS,
          s[2] + TOY_OUTLINE_THICKNESS,
        ],
      ),
    [scales],
  )
  return (
    <group ref={groupRef}>
      {parts.map((part, i) => (
        <mesh key={i} position={part.position} scale={scales[i]} geometry={UNIT_SPHERE} material={materials[i]} castShadow receiveShadow />
      ))}
      {/* 카툰 스타일의 검은 윤곽선: 뒤집힌(BackSide) 살짝 큰 껍질을 겹쳐 실루엣 가장자리만 비어져 나오게 한다. */}
      {parts.map((part, i) => (
        <mesh key={`outline-${i}`} position={part.position} scale={outlineScales[i]} geometry={UNIT_SPHERE} material={TOY_OUTLINE_MATERIAL} />
      ))}
    </group>
  )
}
