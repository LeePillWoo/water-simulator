import * as THREE from 'three'

// 태양 방향/색을 하나로 통일해, 하늘 큐브맵의 해 원반·수조 조명·물 스펙큘러가
// 전부 같은 방향의 햇빛을 가리키게 한다.
export const SUN_POSITION: [number, number, number] = [4, 8, 4]
export const SUN_DIRECTION = new THREE.Vector3(...SUN_POSITION).normalize()
export const SUN_COLOR = new THREE.Color('#fff3d9')
