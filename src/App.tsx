import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/Scene'
import { ControlPanel } from './ui/ControlPanel'
import { ScreenSplat } from './ui/ScreenSplat'

function App() {
  return (
    <div className="app">
      <Canvas shadows>
        <Scene />
      </Canvas>
      <div className="ui-overlay">
        <ControlPanel />
      </div>
      <ScreenSplat />
    </div>
  )
}

export default App
