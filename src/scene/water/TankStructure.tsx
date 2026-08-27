import { TANK_WIDTH, TANK_DEPTH, TANK_WALL_HEIGHT, WALL_THK, FLOOR_Y } from '../../labLayout'
import { GlassWall } from './GlassWall'

const wallCy = FLOOR_Y + TANK_WALL_HEIGHT / 2

export function TankStructure() {
  return (
    <group>
      <mesh position={[0, FLOOR_Y - WALL_THK / 2, 0]} receiveShadow>
        <boxGeometry args={[TANK_WIDTH, WALL_THK, TANK_DEPTH]} />
        <meshStandardMaterial color="#8a8f98" roughness={0.85} />
      </mesh>

      <GlassWall args={[TANK_WIDTH, TANK_WALL_HEIGHT, WALL_THK]} position={[0, wallCy, -TANK_DEPTH / 2 - WALL_THK / 2]} />
      <GlassWall args={[TANK_WIDTH, TANK_WALL_HEIGHT, WALL_THK]} position={[0, wallCy, TANK_DEPTH / 2 + WALL_THK / 2]} />
      <GlassWall
        args={[WALL_THK, TANK_WALL_HEIGHT, TANK_DEPTH + WALL_THK * 2]}
        position={[-TANK_WIDTH / 2 - WALL_THK / 2, wallCy, 0]}
      />
      <GlassWall
        args={[WALL_THK, TANK_WALL_HEIGHT, TANK_DEPTH + WALL_THK * 2]}
        position={[TANK_WIDTH / 2 + WALL_THK / 2, wallCy, 0]}
      />
    </group>
  )
}
