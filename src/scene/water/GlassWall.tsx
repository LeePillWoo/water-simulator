import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { wallVertexShader, wallFragmentShader } from './wallShader'
import { waterFieldState } from './waterFieldState'
import { getFallbackHeightTexture } from './heightFieldTexture'
import { REST_WATER_DEPTH, TANK_WIDTH, TANK_DEPTH } from '../../labLayout'

interface GlassWallProps {
  args: [number, number, number]
  position: [number, number, number]
}

/** 수조 옆면 유리. 공유 높이장 텍스처로 현재 수위를 조회해, 수위 아래는 물색/굴절 느낌을 내고 위는 맑은 유리로 남긴다. */
export function GlassWall({ args, position }: GlassWallProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: wallVertexShader,
        fragmentShader: wallFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uMeshOffset: { value: new THREE.Vector3(...position) },
          uHeightMap: { value: getFallbackHeightTexture() },
          uRestDepth: { value: REST_WATER_DEPTH },
          uTankWidth: { value: TANK_WIDTH },
          uTankDepth: { value: TANK_DEPTH },
          uGlassColor: { value: new THREE.Color('#dff3fb') },
          uShallowColor: { value: new THREE.Color('#6fd2f2') },
          uDeepColor: { value: new THREE.Color('#1478ab') },
          uGlassOpacity: { value: 0.16 },
          uWaterOpacity: { value: 0.55 },
          uAbsorption: { value: 0.45 },
          uTime: { value: 0 },
        },
      }),
    // position은 벽마다 고정이라 마운트 시 한 번만 uMeshOffset에 반영하면 된다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    if (waterFieldState.heightTexture && material.uniforms.uHeightMap.value !== waterFieldState.heightTexture) {
      material.uniforms.uHeightMap.value = waterFieldState.heightTexture
    }
    material.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh position={position} material={material} receiveShadow>
      <boxGeometry args={args} />
    </mesh>
  )
}
