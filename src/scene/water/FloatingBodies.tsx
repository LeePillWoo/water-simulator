import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import { useSimStore } from '../../store/useSimStore'
import { waterFieldState } from './waterFieldState'
import { tiltState } from './tiltState'
import { getOrCreateBody, stepBody, resetBodies, BALL_MATERIALS } from '../../physics/ballBody'
import { SIM_GRAVITY } from '../../labLayout'

/** 나무공/쇠공을 낙하시켜 부력·물속 저항·벽 충돌로 뜨거나 가라앉게 하고, 잠긴 부피 변화를 물결로 되먹인다. */
export function FloatingBodies() {
  const balls = useSimStore((s) => s.balls)
  const isRunning = useSimStore((s) => s.isRunning)
  const resetSignal = useSimStore((s) => s.resetSignal)
  const meshRefs = useRef(new Map<number, Mesh>())

  useEffect(() => {
    resetBodies()
  }, [resetSignal])

  useFrame((_state, delta) => {
    const solver = waterFieldState.solver
    if (!solver || !isRunning) return
    const dt = Math.min(delta, 1 / 30)
    const accelX = SIM_GRAVITY * Math.sin(tiltState.z)
    const accelZ = SIM_GRAVITY * Math.sin(-tiltState.x)

    for (const spec of balls) {
      const body = getOrCreateBody(spec)
      stepBody(body, dt, solver, accelX, accelZ)
      const mesh = meshRefs.current.get(spec.id)
      mesh?.position.copy(body.position)
    }
  })

  return (
    <>
      {balls.map((spec) => {
        const mat = BALL_MATERIALS[spec.type]
        return (
          <mesh
            key={spec.id}
            ref={(m) => {
              if (m) {
                meshRefs.current.set(spec.id, m)
                m.position.copy(getOrCreateBody(spec).position)
              } else {
                meshRefs.current.delete(spec.id)
              }
            }}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[mat.radius, 24, 24]} />
            <meshStandardMaterial color={mat.color} roughness={mat.roughness} metalness={mat.metalness} />
          </mesh>
        )
      })}
    </>
  )
}
