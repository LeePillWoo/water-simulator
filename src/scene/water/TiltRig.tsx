import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { tiltState } from './tiltState'
import { MAX_TILT_RAD, DRAG_PIXELS_FOR_MAX_TILT, TILT_STIFFNESS, TILT_DAMPING } from '../../labLayout'

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v))
}

function integrateAxis(axis: 'x' | 'z', dt: number) {
  const target = axis === 'x' ? tiltState.targetX : tiltState.targetZ
  const cur = axis === 'x' ? tiltState.x : tiltState.z
  const vel = axis === 'x' ? tiltState.velX : tiltState.velZ
  const accel = TILT_STIFFNESS * (target - cur) - TILT_DAMPING * vel
  const nextVel = vel + accel * dt
  const nextAngle = cur + nextVel * dt
  if (axis === 'x') {
    tiltState.velX = nextVel
    tiltState.x = nextAngle
  } else {
    tiltState.velZ = nextVel
    tiltState.z = nextAngle
  }
}

/** 좌클릭 드래그로 수조를 기울인다 (우클릭 드래그는 OrbitControls의 카메라 회전용이라 건드리지 않는다). */
export function TiltRig({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null)
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const el = gl.domElement
    let dragging = false
    let startX = 0
    let startY = 0

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      dragging = true
      startX = e.clientX
      startY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      // 부호는 실제 화면에서 드래그 방향과 기울어지는 방향이 직관적으로 맞는지 보고 조정한다.
      tiltState.targetZ = -clamp(dx / DRAG_PIXELS_FOR_MAX_TILT, -1, 1) * MAX_TILT_RAD
      tiltState.targetX = clamp(dy / DRAG_PIXELS_FOR_MAX_TILT, -1, 1) * MAX_TILT_RAD
    }
    const endDrag = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      tiltState.targetX = 0
      tiltState.targetZ = 0
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endDrag)
    el.addEventListener('pointercancel', endDrag)
    el.addEventListener('contextmenu', onContextMenu)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endDrag)
      el.removeEventListener('pointercancel', endDrag)
      el.removeEventListener('contextmenu', onContextMenu)
    }
  }, [gl])

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    integrateAxis('x', dt)
    integrateAxis('z', dt)
    groupRef.current?.rotation.set(tiltState.x, 0, tiltState.z)
  })

  return <group ref={groupRef}>{children}</group>
}
