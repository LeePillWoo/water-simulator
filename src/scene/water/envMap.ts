import type * as THREE from 'three'

// EnvMapBaker가 한 번 채워 넣고, WaterSurface가 매 프레임 값이 준비됐는지 확인해 읽는다.
export const envMapState: { texture: THREE.CubeTexture | null } = { texture: null }
