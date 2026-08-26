import { useEffect, useMemo, useRef } from 'react'
import { createPortal, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { SPHSolver } from '../../physics/sphSolver'
import { buildColliders } from '../../physics/colliders'
import { useSimStore } from '../../store/useSimStore'
import { TIER1 } from '../../labLayout'
import type { SimParams } from '../../physics/types'
import {
  depthVertexShader,
  depthFragmentShader,
  thicknessVertexShader,
  thicknessFragmentShader,
  fullscreenVertexShader,
  blurFragmentShader,
  compositeFragmentShader,
} from './shaders'

const CAPACITY = 4000
const PARTICLE_RADIUS = 0.06

const PARAMS: SimParams = (() => {
  const spacing = PARTICLE_RADIUS * 2.1
  // mass는 spacing 기준 "목표 패킹 밀도"(1000)로 산출하지만, 실제 restDensity는
  // 그보다 낮게 잡아야 정지 패킹 상태에서도 압력이 발생해 정수압처럼 옆으로 퍼진다.
  const nominalDensity = 1000
  return {
    smoothingRadius: PARTICLE_RADIUS * 4,
    restDensity: 450,
    stiffness: 20,
    viscosity: 2.5,
    gravity: -9.8,
    particleRadius: PARTICLE_RADIUS,
    mass: nominalDensity * spacing * spacing * spacing,
    maxSpeed: 6,
  }
})()

const RT_SCALE = 0.75
const LIGHT_DIR_WORLD = new THREE.Vector3(6, 12, 6).normalize()
// Reused per-frame scratch to avoid allocating a Vector3 every frame just to
// transform the light direction into view space.
const scratchLightDir = new THREE.Vector3()

const dummy = new THREE.Object3D()

// Depth / blurA / blurB carry a value in R and a coverage mask in A (written
// together as 1.0/0.0 by the depth pass and propagated through the blur
// passes) — G and B are always 0 and unused. Keep RGBA (so the coverage mask
// semantics relied on by the blur and composite shaders are untouched) but
// use HalfFloat instead of full Float to halve bandwidth across these 4
// render targets and the multiple blur passes that sample them each frame.
function makeDataRT(width: number, height: number) {
  return new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

// Thickness is only ever sampled via `.r` (see compositeFragmentShader) and
// is never blurred or coverage-masked, so it can be a single-channel target.
function makeThicknessRT(width: number, height: number) {
  return new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RedFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false,
    stencilBuffer: false,
  })
}

function makeBackgroundRT(width: number, height: number) {
  const rt = new THREE.WebGLRenderTarget(width, height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  })
  rt.depthTexture = new THREE.DepthTexture(width, height)
  rt.depthTexture.type = THREE.UnsignedIntType
  return rt
}

interface RTBundle {
  depth: THREE.WebGLRenderTarget
  blurA: THREE.WebGLRenderTarget
  blurB: THREE.WebGLRenderTarget
  thickness: THREE.WebGLRenderTarget
  background: THREE.WebGLRenderTarget
  w: number
  h: number
}

export function FluidSurface() {
  const { gl, camera, size } = useThree()
  const solver = useMemo(() => new SPHSolver(CAPACITY, PARAMS), [])
  const meshRef = useRef<THREE.InstancedMesh>(null!)
  const waterScene = useMemo(() => new THREE.Scene(), [])
  const quadScene = useMemo(() => new THREE.Scene(), [])
  const quadCamera = useMemo(() => new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1), [])

  const depthMaterial = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: depthVertexShader, fragmentShader: depthFragmentShader }),
    [],
  )
  const thicknessMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: thicknessVertexShader,
        fragmentShader: thicknessFragmentShader,
        uniforms: { uThicknessScale: { value: 0.35 } },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  )
  const blurMaterialH = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertexShader,
        fragmentShader: blurFragmentShader,
        uniforms: {
          tInput: { value: null },
          uTexelSize: { value: new THREE.Vector2() },
          uDirection: { value: new THREE.Vector2(1, 0) },
          uDepthSigma: { value: 0.15 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )
  const blurMaterialV = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertexShader,
        fragmentShader: blurFragmentShader,
        uniforms: {
          tInput: { value: null },
          uTexelSize: { value: new THREE.Vector2() },
          uDirection: { value: new THREE.Vector2(0, 1) },
          uDepthSigma: { value: 0.15 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )
  const compositeMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVertexShader,
        fragmentShader: compositeFragmentShader,
        uniforms: {
          tBackground: { value: null },
          tBackgroundDepth: { value: null },
          tDepth: { value: null },
          tThickness: { value: null },
          uTexelSize: { value: new THREE.Vector2() },
          uCameraNear: { value: 0.1 },
          uCameraFar: { value: 100 },
          uTanHalfFov: { value: new THREE.Vector2() },
          uLightDirView: { value: new THREE.Vector3(0, 1, 0) },
          uShallowColor: { value: new THREE.Color('#2f8fd1') },
          uDeepColor: { value: new THREE.Color('#0a3a5c') },
          uAbsorption: { value: 2.2 },
          uFresnelPower: { value: 4.0 },
          uRefractionStrength: { value: 0.04 },
          // Occlusion bias for the bgDist < waterDist comparison in the composite shader.
          // Must be just large enough to absorb depth-buffer precision noise and bilateral-blur
          // ripple on the reconstructed water surface, not large enough to hide foreground
          // geometry (dam gates, obstacles) sitting close in front of the water. Tied to
          // PARTICLE_RADIUS (the water-surface reconstruction scale) rather than a bare magic
          // number.
          uOcclusionBias: { value: PARTICLE_RADIUS * 0.5 },
        },
        depthTest: false,
        depthWrite: false,
      }),
    [],
  )

  const quadMesh = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(2, 2)
    const mesh = new THREE.Mesh(geometry, blurMaterialH)
    quadScene.add(mesh)
    return mesh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const rtRef = useRef<RTBundle | null>(null)

  function ensureRTs(): RTBundle {
    const pixelRatio = gl.getPixelRatio()
    const w = Math.max(1, Math.round(size.width * pixelRatio * RT_SCALE))
    const h = Math.max(1, Math.round(size.height * pixelRatio * RT_SCALE))
    const current = rtRef.current
    if (current && current.w === w && current.h === h) return current
    if (current) {
      current.depth.dispose()
      current.blurA.dispose()
      current.blurB.dispose()
      current.thickness.dispose()
      current.background.dispose()
    }
    const bundle: RTBundle = {
      depth: makeDataRT(w, h),
      blurA: makeDataRT(w, h),
      blurB: makeDataRT(w, h),
      thickness: makeThicknessRT(w, h),
      background: makeBackgroundRT(w, h),
      w,
      h,
    }
    rtRef.current = bundle
    return bundle
  }

  const resetSignal = useSimStore((s) => s.resetSignal)
  const particleCount = useSimStore((s) => s.particleCount)

  useEffect(() => {
    solver.spawnGrid(particleCount, {
      xMin: TIER1.xMin + 0.3,
      xMax: TIER1.xMax - 0.3,
      yMin: TIER1.y + 0.15,
      yMax: TIER1.y + 1.6,
      zMin: -2.2,
      zMax: 2.2,
    })
    const mesh = meshRef.current
    if (mesh) {
      for (let i = 0; i < CAPACITY; i++) {
        dummy.position.set(solver.positions[i * 3], solver.positions[i * 3 + 1], solver.positions[i * 3 + 2])
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      }
      mesh.instanceMatrix.needsUpdate = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal])

  useFrame((state, delta) => {
    const isRunning = useSimStore.getState().isRunning
    if (isRunning) {
      const { gate1Open, gate2Open, obstacles } = useSimStore.getState()
      const colliders = buildColliders(gate1Open, gate2Open, obstacles)
      solver.step(Math.min(delta, 1 / 30), colliders)
    }

    const mesh = meshRef.current
    if (mesh) {
      // Rotation is always identity and scale is always 1 for every instance
      // (only translation ever changes), so skip the quaternion+scale matrix
      // compose in dummy.updateMatrix() and write the translation directly
      // into the instance matrix array. Column-major 4x4, translation lives
      // at offsets 12/13/14 of each instance's 16-float block; the rest of
      // the block (identity rotation/scale) is established once by the
      // reset effect above and never changes.
      const positions = solver.positions
      const matrixArray = mesh.instanceMatrix.array as Float32Array
      for (let i = 0; i < CAPACITY; i++) {
        const o = i * 16
        matrixArray[o + 12] = positions[i * 3]
        matrixArray[o + 13] = positions[i * 3 + 1]
        matrixArray[o + 14] = positions[i * 3 + 2]
      }
      mesh.instanceMatrix.needsUpdate = true
    }

    const rts = ensureRTs()
    const renderer = gl
    const cam = camera as THREE.PerspectiveCamera

    // 1) 배경(물 제외 전체 씬) 렌더 — 굴절/오클루전 판정용 컬러+깊이 확보
    renderer.setRenderTarget(rts.background)
    renderer.setClearColor(0x12151a, 1)
    renderer.clear(true, true, false)
    renderer.render(state.scene, cam)

    if (mesh) {
      // 2) 물 깊이
      renderer.setRenderTarget(rts.depth)
      renderer.setClearColor(0x000000, 0)
      renderer.clear(true, true, false)
      mesh.material = depthMaterial
      renderer.render(waterScene, cam)

      // 3) 물 두께 (가산 블렌딩 누적)
      renderer.setRenderTarget(rts.thickness)
      renderer.clear(true, true, false)
      mesh.material = thicknessMaterial
      renderer.render(waterScene, cam)
    }

    // 4) 바이래터럴 블러 (가로 → 세로, 2회 반복해 표면을 매끈하게)
    blurMaterialH.uniforms.uTexelSize.value.set(1 / rts.w, 1 / rts.h)
    blurMaterialV.uniforms.uTexelSize.value.set(1 / rts.w, 1 / rts.h)

    blurMaterialH.uniforms.tInput.value = rts.depth.texture
    quadMesh.material = blurMaterialH
    renderer.setRenderTarget(rts.blurA)
    renderer.render(quadScene, quadCamera)

    blurMaterialV.uniforms.tInput.value = rts.blurA.texture
    quadMesh.material = blurMaterialV
    renderer.setRenderTarget(rts.blurB)
    renderer.render(quadScene, quadCamera)

    blurMaterialH.uniforms.tInput.value = rts.blurB.texture
    quadMesh.material = blurMaterialH
    renderer.setRenderTarget(rts.blurA)
    renderer.render(quadScene, quadCamera)

    blurMaterialV.uniforms.tInput.value = rts.blurA.texture
    quadMesh.material = blurMaterialV
    renderer.setRenderTarget(rts.blurB)
    renderer.render(quadScene, quadCamera)

    // 5) 합성 → 화면
    const fovRad = (cam.fov * Math.PI) / 180
    const tanHalfY = Math.tan(fovRad / 2)
    compositeMaterial.uniforms.tBackground.value = rts.background.texture
    compositeMaterial.uniforms.tBackgroundDepth.value = rts.background.depthTexture
    compositeMaterial.uniforms.tDepth.value = rts.blurB.texture
    compositeMaterial.uniforms.tThickness.value = rts.thickness.texture
    compositeMaterial.uniforms.uTexelSize.value.set(1 / rts.w, 1 / rts.h)
    compositeMaterial.uniforms.uCameraNear.value = cam.near
    compositeMaterial.uniforms.uCameraFar.value = cam.far
    compositeMaterial.uniforms.uTanHalfFov.value.set(tanHalfY * cam.aspect, tanHalfY)
    scratchLightDir.copy(LIGHT_DIR_WORLD).transformDirection(cam.matrixWorldInverse)
    compositeMaterial.uniforms.uLightDirView.value.copy(scratchLightDir)

    quadMesh.material = compositeMaterial
    renderer.setRenderTarget(null)
    renderer.render(quadScene, quadCamera)
  }, 1)

  return createPortal(
    <instancedMesh ref={meshRef} args={[undefined, undefined, CAPACITY]} frustumCulled={false}>
      <sphereGeometry args={[PARTICLE_RADIUS, 12, 12]} />
      <meshBasicMaterial />
    </instancedMesh>,
    waterScene,
  )
}
