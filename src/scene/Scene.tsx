import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { MOUSE } from 'three'
import { Lab } from './Lab'
import { TankStructure } from './water/TankStructure'
import { WaterSurface } from './water/WaterSurface'
import { FloatingBodies } from './water/FloatingBodies'
import { TiltRig } from './water/TiltRig'
import { EnvMapBaker } from './water/EnvMapBaker'

export function Scene() {
  return (
    <>
      <color attach="background" args={['#12151a']} />
      <fog attach="fog" args={['#12151a', 10, 24]} />
      <PerspectiveCamera makeDefault position={[3, 3.2, 4.5]} fov={45} />
      <OrbitControls
        target={[0, 0.7, 0]}
        minDistance={2}
        maxDistance={12}
        mouseButtons={{ MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.ROTATE }}
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
