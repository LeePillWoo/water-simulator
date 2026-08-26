import { Grid } from '@react-three/drei'
import { FLOOR } from '../labLayout'

export function Lab() {
  return (
    <group>
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 12, 6]} intensity={1.4} castShadow />
      <directionalLight position={[-6, 6, -4]} intensity={0.4} />

      {/* 실험실 바닥 (배수구 아래까지 넓게) */}
      <mesh position={[-2, FLOOR.y - 1.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 12]} />
        <meshStandardMaterial color="#2a2f38" roughness={0.95} />
      </mesh>
      <Grid
        position={[-2, FLOOR.y - 1, 0]}
        args={[20, 12]}
        cellSize={0.5}
        cellColor="#3a4250"
        sectionColor="#4d5867"
        fadeDistance={30}
        infiniteGrid={false}
      />
    </group>
  )
}
