import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { ControlPanel } from './ui/ControlPanel'

function App() {
  return (
    <div className="app">
      <Canvas shadows>
        <Scene />
      </Canvas>
      <div className="ui-overlay">
        <ControlPanel />
      </div>
    </div>
  )
}

export default App
