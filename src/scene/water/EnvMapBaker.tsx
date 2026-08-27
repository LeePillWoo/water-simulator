import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { envMapState } from './envMap'

const gradientVertexShader = /* glsl */ `
varying vec3 vWorldDir;
void main() {
  vWorldDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const gradientFragmentShader = /* glsl */ `
varying vec3 vWorldDir;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uGround;
void main() {
  float t = clamp(vWorldDir.y, -1.0, 1.0);
  vec3 color = t >= 0.0
    ? mix(uHorizon, uZenith, smoothstep(0.0, 1.0, t))
    : mix(uHorizon, uGround, smoothstep(0.0, 1.0, -t));
  gl_FragColor = vec4(color, 1.0);
}
`

/** 물 표면 반사용 절차적 그라디언트 하늘을 큐브맵으로 한 번 베이크한다. */
export function EnvMapBaker() {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const renderTarget = new THREE.WebGLCubeRenderTarget(256)
    const cubeCamera = new THREE.CubeCamera(0.1, 50, renderTarget)
    const bakeScene = new THREE.Scene()
    const material = new THREE.ShaderMaterial({
      vertexShader: gradientVertexShader,
      fragmentShader: gradientFragmentShader,
      uniforms: {
        uZenith: { value: new THREE.Color('#bfe3ff') },
        uHorizon: { value: new THREE.Color('#e8f3ff') },
        uGround: { value: new THREE.Color('#2a2f38') },
      },
      side: THREE.BackSide,
    })
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 16), material)
    bakeScene.add(sphere)
    cubeCamera.update(gl, bakeScene)
    envMapState.texture = renderTarget.texture

    return () => {
      sphere.geometry.dispose()
      material.dispose()
      renderTarget.dispose()
      envMapState.texture = null
    }
  }, [gl])

  return null
}
