export type BoxCollider = {
  kind: 'box'
  center: [number, number, number]
  half: [number, number, number]
}

export type CylinderCollider = {
  kind: 'cylinder'
  center: [number, number, number]
  radius: number
  halfHeight: number
}

export type Collider = BoxCollider | CylinderCollider

export interface SimParams {
  smoothingRadius: number
  restDensity: number
  stiffness: number
  viscosity: number
  gravity: number
  particleRadius: number
  mass: number
  maxSpeed: number
}

export type ObstacleType = 'box' | 'cylinder'

export interface ObstacleDef {
  id: string
  type: ObstacleType
  position: [number, number, number]
  size: [number, number, number] // box: [width, height, depth] / cylinder: [diameter, height, diameter]
}
