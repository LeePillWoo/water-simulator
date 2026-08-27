import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { MOUSE, TOUCH } from 'three'
import { Lab } from './Lab'
import { TankStructure } from './water/TankStructure'
import { WaterSurface } from './water/WaterSurface'
import { FloatingBodies } from './water/FloatingBodies'
import { TiltRig } from './water/TiltRig'
import { EnvMapBaker } from './water/EnvMapBaker'
import { ResponsiveCamera } from './ResponsiveCamera'

export function Scene() {
  return (
    <>
      {/* 하늘 큐브맵이 준비되기 전 첫 프레임에 잠깐 보이는 배경색 — 검은색 대신
          하늘 색조로 맞춰 그 순간에도 "실내 암실"처럼 보이지 않게 한다. */}
      <color attach="background" args={['#bfe0f7']} />
      <fog attach="fog" args={['#fdf1d6', 30, 60]} />
      <PerspectiveCamera makeDefault fov={45} />
      <ResponsiveCamera />
      <OrbitControls
        makeDefault
        target={[0, 0.7, 0]}
        minDistance={2}
        maxDistance={14}
        mouseButtons={{ MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
        touches={{ TWO: TOUCH.DOLLY_ROTATE }}
      />
      <Lab />
      <EnvMapBaker />
      <TiltRig>
        <TankStructure />
        <WaterSurface />
        <FloatingBodies />
      </TiltRig>
      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.15} intensity={0.4} radius={0.4} />
      </EffectComposer>
    </>
  )
}
