import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Lab } from './Lab'
import { DamStructure } from './DamStructure'
import { Obstacles } from './Obstacles'
import { FluidSurface } from './fluid/FluidSurface'

export function Scene() {
  return (
    <>
      <color attach="background" args={['#12151a']} />
      <fog attach="fog" args={['#12151a', 18, 40]} />
      <PerspectiveCamera makeDefault position={[2, 11, 15]} fov={45} />
      <OrbitControls target={[-1, 3, 0]} maxDistance={30} minDistance={4} />
      <Lab />
      <DamStructure />
      <Obstacles />
      <FluidSurface />
    </>
  )
}
