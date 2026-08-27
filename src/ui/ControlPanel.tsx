import { useSimStore, type BallType } from '../store/useSimStore'
import { TOY_DEFS } from '../physics/toyTypes'
import { MAX_BALLS_PER_TYPE } from '../labLayout'
import { playClick } from '../audio/soundEngine'

const TOY_ORDER: BallType[] = ['wood', 'iron', 'boat', 'duck']

export function ControlPanel() {
  const isRunning = useSimStore((s) => s.isRunning)
  const togglePlaying = useSimStore((s) => s.togglePlaying)
  const reset = useSimStore((s) => s.reset)
  const dropBall = useSimStore((s) => s.dropBall)
  const clearBalls = useSimStore((s) => s.clearBalls)
  const balls = useSimStore((s) => s.balls)
  const ballCount = balls.length

  const countByType = (type: BallType) => balls.reduce((n, b) => (b.type === type ? n + 1 : n), 0)

  return (
    <div className="panel">
      <h1>물 시뮬레이터</h1>
      <p className="hint">드래그: 수조 흔들기 · 우클릭/두 손가락 드래그: 카메라 회전</p>

      <div className="button-row">
        <button
          onClick={() => {
            playClick()
            togglePlaying()
          }}
        >
          {isRunning ? '일시정지' : '재생'}
        </button>
        <button
          onClick={() => {
            playClick()
            reset()
          }}
        >
          리셋 (물 평평하게)
        </button>
      </div>

      <h2>물체 낙하</h2>
      <p className="hint">밀도 계산으로 뜨고 가라앉는 정도가 다르고, 무거울수록 물에 부딪히는 소리·물결도 커집니다.</p>
      <div className="toy-grid">
        {TOY_ORDER.map((type) => {
          const def = TOY_DEFS[type]
          const count = countByType(type)
          const atCap = count >= MAX_BALLS_PER_TYPE
          return (
            <button
              key={type}
              onClick={() => {
                playClick()
                dropBall(type)
              }}
              disabled={atCap}
              title={atCap ? `최대 ${MAX_BALLS_PER_TYPE}개까지 놓을 수 있어요` : undefined}
            >
              {def.label}
              <span className="btn-sub">
                {def.density}kg/m³ · {count}/{MAX_BALLS_PER_TYPE}
              </span>
            </button>
          )
        })}
      </div>
      <div className="button-row">
        <button
          onClick={() => {
            playClick()
            clearBalls()
          }}
          disabled={ballCount === 0}
        >
          물체 모두 지우기 ({ballCount})
        </button>
      </div>
    </div>
  )
}
