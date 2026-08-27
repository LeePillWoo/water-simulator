import { useSimStore } from '../store/useSimStore'

export function ControlPanel() {
  const isRunning = useSimStore((s) => s.isRunning)
  const togglePlaying = useSimStore((s) => s.togglePlaying)
  const reset = useSimStore((s) => s.reset)

  return (
    <div className="panel">
      <h1>물 시뮬레이터</h1>
      <p className="hint">좌클릭 드래그: 수조 흔들기 · 우클릭 드래그: 카메라 회전</p>

      <div className="button-row">
        <button onClick={togglePlaying}>{isRunning ? '일시정지' : '재생'}</button>
        <button onClick={reset}>리셋 (물 평평하게)</button>
      </div>
    </div>
  )
}
