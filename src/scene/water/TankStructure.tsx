import { TANK_WIDTH, TANK_DEPTH, TANK_WALL_HEIGHT, WALL_THK, FLOOR_Y } from '../../labLayout'
import { GlassWall } from './GlassWall'
import { FloorCrack } from './FloorCrack'

const wallCy = FLOOR_Y + TANK_WALL_HEIGHT / 2

export function TankStructure() {
  return (
    <group>
      {/* 바닥을 회색이 아니라 밝은 풀 타일 톤으로 둬서, 굴절로 비쳐 보이는 물이
          탁하지 않고 선명한 파란빛으로 보이게 한다. */}
      <mesh position={[0, FLOOR_Y - WALL_THK / 2, 0]} receiveShadow>
        <boxGeometry args={[TANK_WIDTH, WALL_THK, TANK_DEPTH]} />
        <meshStandardMaterial color="#2f9dc2" roughness={0.7} />
      </mesh>
      <FloorCrack />

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
