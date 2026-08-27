import { FLOOR_Y } from '../labLayout'
import { SUN_POSITION, SUN_COLOR } from './water/sunLight'

export function Lab() {
  return (
    <group>
      {/* 하늘에서 오는 파란빛 + 바닥에서 반사되는 따뜻한 빛을 함께 섞는 야외용 앰비언트. */}
      <hemisphereLight args={['#bfe0f7', '#9c8a63', 0.65]} />
      <directionalLight
        position={SUN_POSITION}
        intensity={2.4}
        color={SUN_COLOR}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
        shadow-camera-near={1}
        shadow-camera-far={14}
        shadow-bias={-0.0015}
      />
      <directionalLight position={[-4, 4, -3]} intensity={0.3} color="#cfe3ff" />

      <mesh position={[0, FLOOR_Y - 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[6, 6]} />
        <meshStandardMaterial color="#3a3f36" roughness={0.95} />
      </mesh>
    </group>
  )
}
