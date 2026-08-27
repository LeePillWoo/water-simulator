import { FLOOR_Y } from '../labLayout'

export function Lab() {
  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 8, 4]} intensity={1.4} castShadow />
      <directionalLight position={[-4, 4, -3]} intensity={0.4} />

      <mesh position={[0, FLOOR_Y - 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#2a2f38" roughness={0.95} />
      </mesh>
    </group>
  )
}
