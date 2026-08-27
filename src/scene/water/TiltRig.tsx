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

/**
 * 좌클릭(또는 손가락 하나) 드래그로 수조를 기울인다. 우클릭 드래그·두 손가락은
 * OrbitControls의 카메라 조작용이라 건드리지 않는다 — 드래그 도중 두 번째
 * 손가락이 닿으면 즉시 기울이기를 취소해 두 제스처가 겹치지 않게 한다.
 */
export function TiltRig({ children }: { children: ReactNode }) {
  const groupRef = useRef<Group>(null)
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const el = gl.domElement
    const activePointers = new Set<number>()
    let dragPointerId: number | null = null
    let startX = 0
    let startY = 0

    // 데스크톱은 튜닝된 고정값을, 화면이 그보다 작은 기기에서는 짧은 변을
    // 기준으로 한 비율을 써서 최대 기울기까지 닿는 드래그 거리가 화면 크기에
    // 비례하게 한다.
    const dragRangeForElement = () => Math.min(DRAG_PIXELS_FOR_MAX_TILT, Math.min(el.clientWidth, el.clientHeight) * 0.4)

    const stopDrag = () => {
      dragPointerId = null
      tiltState.targetX = 0
      tiltState.targetZ = 0
    }

    const onPointerDown = (e: PointerEvent) => {
      activePointers.add(e.pointerId)
      if (activePointers.size > 1) {
        // 두 번째 손가락이 닿으면 카메라 조작(OrbitControls)에 양보한다.
        stopDrag()
        return
      }
      if (e.button !== 0) return
      dragPointerId = e.pointerId
      startX = e.clientX
      startY = e.clientY
      el.setPointerCapture(e.pointerId)
    }
    const onPointerMove = (e: PointerEvent) => {
      if (dragPointerId === null || e.pointerId !== dragPointerId) return
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const range = dragRangeForElement()
      // 부호는 실제 화면에서 드래그 방향과 기울어지는 방향이 직관적으로 맞는지 보고 조정한다.
      tiltState.targetZ = -clamp(dx / range, -1, 1) * MAX_TILT_RAD
      tiltState.targetX = clamp(dy / range, -1, 1) * MAX_TILT_RAD
    }
    const endPointer = (e: PointerEvent) => {
      activePointers.delete(e.pointerId)
      if (dragPointerId === e.pointerId) {
        stopDrag()
        if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      }
    }
    const onContextMenu = (e: MouseEvent) => e.preventDefault()

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', endPointer)
    el.addEventListener('pointercancel', endPointer)
    el.addEventListener('contextmenu', onContextMenu)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endPointer)
      el.removeEventListener('pointercancel', endPointer)
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
