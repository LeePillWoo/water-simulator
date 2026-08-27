import type { WaveSolver } from '../../physics/waveSolver'
import type { DataTexture } from 'three'

// WaterSurface가 마운트 시 채워 넣고, FloatingBodies가 매 프레임 읽어서
// 부력 계산(sampleHeight)과 파동 주입(addVolumeSource)에 사용한다.
// heightTexture는 옆면 유리 셰이더(GlassWall)가 수위를 조회하는 데 쓴다.
export const waterFieldState: { solver: WaveSolver | null; heightTexture: DataTexture | null } = {
  solver: null,
  heightTexture: null,
}
