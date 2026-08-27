import * as THREE from 'three'
import { GRID_RES } from '../../labLayout'

const N = GRID_RES
const STRIDE = N + 1

/** solver.h를 그대로 얹어 옆면 유리 셰이더가 수위를 조회할 수 있게 하는 높이장 텍스처. */
export function createHeightFieldTexture(initial: Float32Array) {
  const texture = new THREE.DataTexture(initial, STRIDE, STRIDE, THREE.RedFormat, THREE.FloatType)
  texture.minFilter = THREE.LinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.wrapS = THREE.ClampToEdgeWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

let fallback: THREE.DataTexture | null = null

/** 실제 높이장 텍스처가 준비되기 전, 옆면 유리 셰이더가 참조할 안전한 1x1(h=0) 텍스처. */
export function getFallbackHeightTexture() {
  if (!fallback) {
    fallback = new THREE.DataTexture(new Float32Array([0]), 1, 1, THREE.RedFormat, THREE.FloatType)
    fallback.needsUpdate = true
  }
  return fallback
}
