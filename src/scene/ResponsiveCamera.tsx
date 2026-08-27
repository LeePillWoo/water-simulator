import { useEffect, useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

const BASE_DIRECTION = new THREE.Vector3(3, 3.2, 4.5).normalize()
const LOOK_TARGET = new THREE.Vector3(0, 0.7, 0)
// 수조를 감싸는 대략적인 바운딩 구 반지름(중심 [0, 0.8, 0] 기준) — 카메라가
// 화면 비율과 무관하게 항상 수조 전체를 시야에 담도록 거리 계산에 쓴다.
const BOUNDING_RADIUS = 2.4
const VERTICAL_FOV_DEG = 45

interface ControlsLike {
  target: THREE.Vector3
  addEventListener: (type: string, listener: () => void) => void
  removeEventListener: (type: string, listener: () => void) => void
}

/**
 * 화면 가로세로 비율에 맞춰 카메라 거리를 조정해, 세로로 좁은 화면(모바일 세로
 * 모드 등)에서도 수조 전체가 시야 안에 들어오게 한다. 사용자가 한 번이라도
 * 카메라를 직접 조작(드래그/줌)하면 그 뒤로는 화면 크기 변화에 개입하지 않는다.
 */
export function ResponsiveCamera() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const controls = useThree((s) => s.controls) as ControlsLike | null
  const interacted = useRef(false)

  useEffect(() => {
    if (!controls) return
    const onStart = () => {
      interacted.current = true
    }
    controls.addEventListener('start', onStart)
    return () => controls.removeEventListener('start', onStart)
  }, [controls])

  useLayoutEffect(() => {
    if (interacted.current) return
    if (!(camera instanceof THREE.PerspectiveCamera)) return

    const aspect = size.width / size.height
    const vFov = THREE.MathUtils.degToRad(VERTICAL_FOV_DEG)
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
    const minHalfFov = Math.min(vFov, hFov) / 2
    const distance = BOUNDING_RADIUS / Math.sin(minHalfFov)

    camera.position.copy(BASE_DIRECTION).multiplyScalar(distance)
    camera.lookAt(LOOK_TARGET)
  }, [camera, size])

  return null
}
