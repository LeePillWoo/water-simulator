import { SUN_POSITION, SUN_COLOR } from './water/sunLight'

/** 수조가 하늘에 떠 있는 형태라 바닥 없이 조명만 담당한다. */
export function Lab() {
  return (
    <group>
      {/* 하늘에서 오는 파란빛 + 아래쪽 은은한 반사색을 함께 섞는 야외용 앰비언트. */}
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
        shadow-bias={0}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-4, 4, -3]} intensity={0.3} color="#cfe3ff" />
    </group>
  )
}
