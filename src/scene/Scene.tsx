import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
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
      <color attach="background" args={['#12151a']} />
      <fog attach="fog" args={['#12151a', 10, 24]} />
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
    </>
  )
}
