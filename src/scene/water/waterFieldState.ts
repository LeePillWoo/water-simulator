import type { WaveSolver } from '../../physics/waveSolver'

// WaterSurface가 마운트 시 채워 넣고, FloatingBodies가 매 프레임 읽어서
// 부력 계산(sampleHeight)과 파동 주입(addVolumeSource)에 사용한다.
export const waterFieldState: { solver: WaveSolver | null } = { solver: null }
