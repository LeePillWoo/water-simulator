import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { envMapState } from './envMap'
import { SUN_DIRECTION, SUN_COLOR } from './sunLight'

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
uniform vec3 uSunDir;
uniform vec3 uSunColor;
void main() {
  vec3 dir = normalize(vWorldDir);
  float t = clamp(dir.y, -1.0, 1.0);
  vec3 color = t >= 0.0
    ? mix(uHorizon, uZenith, smoothstep(0.0, 1.0, t))
    : mix(uHorizon, uGround, smoothstep(0.0, 1.0, -t));

  // 또렷한 해 원반 + 주변으로 은은히 퍼지는 빛무리. 값이 1.0을 넘어가는 부분은
  // 톤매핑 후에도 하얗게 타 보이고, 블룸 패스가 이 부분을 잡아 번지게 한다.
  float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
  float sunDisc = smoothstep(0.9985, 0.9995, sunDot);
  float sunGlow = pow(sunDot, 40.0) * 0.35;
  color += uSunColor * (sunDisc * 4.0 + sunGlow);

  gl_FragColor = vec4(color, 1.0);
}
`

/** 태양이 있는 야외 하늘을 절차적으로 만들어 큐브맵으로 굽고, 물 반사뿐 아니라 씬 배경으로도 쓴다. */
export function EnvMapBaker() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)

  useEffect(() => {
    const renderTarget = new THREE.WebGLCubeRenderTarget(256)
    const cubeCamera = new THREE.CubeCamera(0.1, 50, renderTarget)
    const bakeScene = new THREE.Scene()
    const material = new THREE.ShaderMaterial({
      vertexShader: gradientVertexShader,
      fragmentShader: gradientFragmentShader,
      uniforms: {
        uZenith: { value: new THREE.Color('#4f9bea') },
        uHorizon: { value: new THREE.Color('#fdf1d6') },
        uGround: { value: new THREE.Color('#8a8f78') },
        uSunDir: { value: SUN_DIRECTION },
        uSunColor: { value: SUN_COLOR },
      },
      side: THREE.BackSide,
    })
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(25, 32, 16), material)
    bakeScene.add(sphere)
    cubeCamera.update(gl, bakeScene)
    envMapState.texture = renderTarget.texture
    scene.background = renderTarget.texture

    return () => {
      sphere.geometry.dispose()
      material.dispose()
      renderTarget.dispose()
      envMapState.texture = null
      scene.background = null
    }
  }, [gl, scene])

  return null
}
