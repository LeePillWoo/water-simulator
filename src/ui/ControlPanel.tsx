import { useSimStore } from '../store/useSimStore'

export function ControlPanel() {
  const isRunning = useSimStore((s) => s.isRunning)
  const togglePlaying = useSimStore((s) => s.togglePlaying)
  const reset = useSimStore((s) => s.reset)
  const dropBall = useSimStore((s) => s.dropBall)
  const clearBalls = useSimStore((s) => s.clearBalls)
  const ballCount = useSimStore((s) => s.balls.length)

  return (
    <div className="panel">
      <h1>물 시뮬레이터</h1>
      <p className="hint">드래그: 수조 흔들기 · 우클릭/두 손가락 드래그: 카메라 회전</p>

      <div className="button-row">
        <button onClick={togglePlaying}>{isRunning ? '일시정지' : '재생'}</button>
        <button onClick={reset}>리셋 (물 평평하게)</button>
      </div>

      <h2>물체 낙하</h2>
      <p className="hint">밀도 계산으로 나무는 뜨고 쇠는 가라앉습니다 (물 1000kg/m³)</p>
      <div className="button-row">
        <button onClick={() => dropBall('wood')}>
          나무공<span className="btn-sub">600kg/m³</span>
        </button>
        <button onClick={() => dropBall('iron')}>
          쇠공<span className="btn-sub">7800kg/m³</span>
        </button>
      </div>
      <div className="button-row">
        <button onClick={clearBalls} disabled={ballCount === 0}>
          물체 모두 지우기 ({ballCount})
        </button>
      </div>
    </div>
  )
}
