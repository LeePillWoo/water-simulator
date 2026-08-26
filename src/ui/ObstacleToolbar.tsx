import { useSimStore } from '../store/useSimStore'

export function ObstacleToolbar() {
  const placingType = useSimStore((s) => s.placingType)
  const selectedObstacleId = useSimStore((s) => s.selectedObstacleId)
  const startPlacing = useSimStore((s) => s.startPlacing)
  const cancelPlacing = useSimStore((s) => s.cancelPlacing)
  const removeSelected = useSimStore((s) => s.removeSelected)

  return (
    <div className="panel">
      <h2>장애물</h2>
      <p className="hint">
        {placingType ? '실험실 바닥을 클릭해 배치하세요.' : '추가할 모양을 선택한 뒤 바닥을 클릭하세요.'}
      </p>
      <div className="button-row">
        <button className={placingType === 'box' ? 'active' : ''} onClick={() => startPlacing('box')}>
          박스 추가
        </button>
        <button className={placingType === 'cylinder' ? 'active' : ''} onClick={() => startPlacing('cylinder')}>
          원통 추가
        </button>
        {placingType && <button onClick={cancelPlacing}>취소</button>}
      </div>
      <div className="button-row">
        <button disabled={!selectedObstacleId} onClick={removeSelected}>
          선택한 장애물 삭제
        </button>
      </div>
    </div>
  )
}
