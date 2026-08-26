import { useSimStore } from '../store/useSimStore'
import { FLOOR, Z_MIN, Z_MAX } from '../labLayout'
import type { ThreeEvent } from '@react-three/fiber'

function ObstacleMesh({ id }: { id: string }) {
  const obstacle = useSimStore((s) => s.obstacles.find((o) => o.id === id))
  const selectedId = useSimStore((s) => s.selectedObstacleId)
  const selectObstacle = useSimStore((s) => s.selectObstacle)
  if (!obstacle) return null

  const selected = obstacle.id === selectedId
  const color = selected ? '#ffb703' : '#5d7a8c'
  const [x, y, z] = obstacle.position
  const [w, h, d] = obstacle.size

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    selectObstacle(obstacle.id)
  }

  if (obstacle.type === 'box') {
    return (
      <mesh position={[x, y + h / 2, z]} onClick={onClick} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
    )
  }
  return (
    <mesh position={[x, y + h / 2, z]} onClick={onClick} castShadow>
      <cylinderGeometry args={[w / 2, w / 2, h, 24]} />
      <meshStandardMaterial color={color} roughness={0.7} />
    </mesh>
  )
}

export function Obstacles() {
  const obstacles = useSimStore((s) => s.obstacles)
  const placingType = useSimStore((s) => s.placingType)
  const addObstacle = useSimStore((s) => s.addObstacle)
  const selectObstacle = useSimStore((s) => s.selectObstacle)

  const cx = (FLOOR.xMin + FLOOR.xMax) / 2
  const width = FLOOR.xMax - FLOOR.xMin
  const depth = Z_MAX - Z_MIN

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (placingType) {
      addObstacle([e.point.x, FLOOR.y, e.point.z])
    } else {
      selectObstacle(null)
    }
  }

  return (
    <group>
      <mesh
        position={[cx, FLOOR.y + 0.001, (Z_MIN + Z_MAX) / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={onFloorClick}
      >
        <planeGeometry args={[width, depth]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {obstacles.map((o) => (
        <ObstacleMesh key={o.id} id={o.id} />
      ))}
    </group>
  )
}
