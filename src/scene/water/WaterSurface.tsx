import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSimStore } from '../../store/useSimStore'
import { WaveSolver } from '../../physics/waveSolver'
import { tiltState } from './tiltState'
import { envMapState } from './envMap'
import { waterFieldState } from './waterFieldState'
import { createHeightFieldTexture } from './heightFieldTexture'
import { waterVertexShader, waterFragmentShader } from './shaders'
import { SUN_DIRECTION } from './sunLight'
import { GRID_RES, TANK_WIDTH, TANK_DEPTH, REST_WATER_DEPTH, SIM_GRAVITY, SHORE_FADE_RANGE } from '../../labLayout'

const N = GRID_RES
const STRIDE = N + 1
const SIZE = STRIDE * STRIDE
const WATER_LAYER = 1

const scratchLightDir = new THREE.Vector3()
const scratchSize = new THREE.Vector2()

function buildGeometry() {
  const geometry = new THREE.BufferGeometry()
  const positions = new Float32Array(SIZE * 3)
  const normals = new Float32Array(SIZE * 3)
  const uvs = new Float32Array(SIZE * 2)
  const overflow = new Float32Array(SIZE)
  const dx = TANK_WIDTH / N
  const dz = TANK_DEPTH / N

  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const idx = j * STRIDE + i
      positions[idx * 3] = -TANK_WIDTH / 2 + i * dx
      positions[idx * 3 + 1] = REST_WATER_DEPTH
      positions[idx * 3 + 2] = -TANK_DEPTH / 2 + j * dz
      normals[idx * 3 + 1] = 1
      uvs[idx * 2] = i / N
      uvs[idx * 2 + 1] = j / N
    }
  }

  const indices: number[] = []
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = j * STRIDE + i
      const b = a + 1
      const c = a + STRIDE
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const posAttr = new THREE.BufferAttribute(positions, 3)
  const normAttr = new THREE.BufferAttribute(normals, 3)
  const overflowAttr = new THREE.BufferAttribute(overflow, 1)
  geometry.setAttribute('position', posAttr)
  geometry.setAttribute('normal', normAttr)
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geometry.setAttribute('overflow', overflowAttr)
  geometry.setIndex(indices)
  return { geometry, positions, normals, overflow, posAttr, normAttr, overflowAttr }
}

/** 얕은물 시뮬레이션을 굴절/Fresnel/반사/스펙큘러로 합성해 그리는 실제 물 표면 메시. */
export function WaterSurface() {
  const meshRef = useRef<THREE.Mesh>(null)
  const built = useMemo(() => buildGeometry(), [])
  const solver = useMemo(() => new WaveSolver(), [])
  const heightTexture = useMemo(() => createHeightFieldTexture(solver.h), [solver])
  const isRunning = useSimStore((s) => s.isRunning)
  const resetSignal = useSimStore((s) => s.resetSignal)

  const backgroundRT = useMemo(
    () => new THREE.WebGLRenderTarget(1, 1, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType }),
    [],
  )

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          tBackground: { value: backgroundRT.texture },
          uEnvMap: { value: null },
          uHasEnvMap: { value: 0 },
          uResolution: { value: new THREE.Vector2(1, 1) },
          uLightDirView: { value: new THREE.Vector3() },
          uShallowColor: { value: new THREE.Color('#4fb8e8') },
          uDeepColor: { value: new THREE.Color('#0a4d7a') },
          uSkyColor: { value: new THREE.Color('#bfe3ff') },
          uAbsorption: { value: 0.35 },
          uFresnelPower: { value: 3.0 },
          uRefractionStrength: { value: 0.045 },
          uShoreFadeRange: { value: SHORE_FADE_RANGE },
          uTime: { value: 0 },
        },
      }),
    [backgroundRT],
  )

  useEffect(() => {
    meshRef.current?.layers.set(WATER_LAYER)
  }, [])

  useEffect(() => {
    solver.reset()
  }, [solver, resetSignal])

  useEffect(() => {
    waterFieldState.solver = solver
    waterFieldState.heightTexture = heightTexture
    return () => {
      waterFieldState.solver = null
      waterFieldState.heightTexture = null
    }
  }, [solver, heightTexture])

  useEffect(() => {
    return () => {
      built.geometry.dispose()
      material.dispose()
      backgroundRT.dispose()
      heightTexture.dispose()
    }
  }, [built, material, backgroundRT, heightTexture])

  useFrame((state, delta) => {
    const { gl: renderer, camera, scene } = state
    const size = renderer.getDrawingBufferSize(scratchSize)
    if (backgroundRT.width !== size.x || backgroundRT.height !== size.y) {
      backgroundRT.setSize(Math.max(1, size.x), Math.max(1, size.y))
    }
    material.uniforms.uResolution.value.set(size.x, size.y)
    material.uniforms.uTime.value = state.clock.elapsedTime
    scratchLightDir.copy(SUN_DIRECTION).transformDirection(camera.matrixWorldInverse)
    material.uniforms.uLightDirView.value.copy(scratchLightDir)

    if (!material.uniforms.uHasEnvMap.value && envMapState.texture) {
      material.uniforms.uEnvMap.value = envMapState.texture
      material.uniforms.uHasEnvMap.value = 1
    }

    if (isRunning) {
      const accelX = -SIM_GRAVITY * Math.sin(tiltState.z)
      const accelZ = SIM_GRAVITY * Math.sin(tiltState.x)
      solver.step(delta, accelX, accelZ)
    }

    for (let idx = 0; idx < SIZE; idx++) {
      built.positions[idx * 3 + 1] = REST_WATER_DEPTH + solver.h[idx]
      built.normals[idx * 3] = solver.normals[idx * 3]
      built.normals[idx * 3 + 1] = solver.normals[idx * 3 + 1]
      built.normals[idx * 3 + 2] = solver.normals[idx * 3 + 2]
      built.overflow[idx] = solver.overflow[idx]
    }
    built.posAttr.needsUpdate = true
    built.normAttr.needsUpdate = true
    built.overflowAttr.needsUpdate = true

    heightTexture.image.data = solver.h
    heightTexture.needsUpdate = true

    camera.layers.disable(WATER_LAYER)
    renderer.setRenderTarget(backgroundRT)
    renderer.render(scene, camera)

    camera.layers.enable(WATER_LAYER)
    renderer.setRenderTarget(null)
    renderer.render(scene, camera)
  }, 1)

  return <mesh ref={meshRef} geometry={built.geometry} material={material} frustumCulled={false} />
}
