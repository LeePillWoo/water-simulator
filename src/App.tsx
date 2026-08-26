import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { ControlPanel } from './ui/ControlPanel'
import { ObstacleToolbar } from './ui/ObstacleToolbar'

function App() {
  return (
    <div className="app">
      <Canvas shadows>
        <Scene />
      </Canvas>
      <div className="ui-overlay">
        <ControlPanel />
        <ObstacleToolbar />
      </div>
    </div>
  )
}

export default App
