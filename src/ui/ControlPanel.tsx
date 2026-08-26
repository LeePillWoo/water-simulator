import { useSimStore } from '../store/useSimStore'

export function ControlPanel() {
  const gate1Open = useSimStore((s) => s.gate1Open)
  const gate2Open = useSimStore((s) => s.gate2Open)
  const isRunning = useSimStore((s) => s.isRunning)
  const particleCount = useSimStore((s) => s.particleCount)
  const setGate1 = useSimStore((s) => s.setGate1)
  const setGate2 = useSimStore((s) => s.setGate2)
  const setParticleCount = useSimStore((s) => s.setParticleCount)
  const togglePlaying = useSimStore((s) => s.togglePlaying)
  const reset = useSimStore((s) => s.reset)

  return (
    <div className="panel">
      <h1>물 시뮬레이터</h1>

      <div className="field">
        <label>
          수문 1 (상단 댐) <span className="value">{gate1Open}%</span>
        </label>
        <input type="range" min={0} max={100} value={gate1Open} onChange={(e) => setGate1(Number(e.target.value))} />
      </div>

      <div className="field">
        <label>
          수문 2 (중단 댐) <span className="value">{gate2Open}%</span>
        </label>
        <input type="range" min={0} max={100} value={gate2Open} onChange={(e) => setGate2(Number(e.target.value))} />
      </div>

      <div className="field">
        <label>
          파티클 수 (다음 리셋에 적용) <span className="value">{particleCount}</span>
        </label>
        <input
          type="range"
          min={200}
          max={3500}
          step={100}
          value={particleCount}
          onChange={(e) => setParticleCount(Number(e.target.value))}
        />
      </div>

      <div className="button-row">
        <button onClick={togglePlaying}>{isRunning ? '일시정지' : '재생'}</button>
        <button onClick={reset}>리셋 (물 채우기)</button>
      </div>
    </div>
  )
}
