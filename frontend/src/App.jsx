import { Suspense, useState, useCallback, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { PointerLockControls, AdaptiveDpr } from '@react-three/drei'
import { Model } from './Model'
import { DebugTracker, DebugOverlay } from './DebugHUD'

const DEG = Math.PI / 180

function CameraInit() {
  const { camera } = useThree()
  useEffect(() => {
    camera.rotation.set(-176.4 * DEG, 0.9 * DEG, 179.9 * DEG)
  }, [camera])
  return null
}

const DEFAULT_DEBUG = {
  pos:  { x: '8.80',  y: '98.93', z: '-82.78' },
  rot:  { x: '0.0',   y: '0.0',   z: '0.0' },
  dir:  { x: '0.00',  y: '0.00',  z: '-1.00' },
  fov:  '50.0',
  locked: false,
}

function App() {
  const [debugVisible, setDebugVisible] = useState(false)
  const [debugInfo, setDebugInfo] = useState(DEFAULT_DEBUG)

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.altKey && e.key === 'n') {
        e.preventDefault()
        setDebugVisible(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleDebugUpdate = useCallback((info) => setDebugInfo(info), [])

  return (
    <>
      <Canvas
        camera={{ position: [8.80, 98.93, -82.78], fov: 50 }}
        style={{ width: '100vw', height: '100vh', display: 'block' }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Model path="/retro_room.glb" />
        </Suspense>
        <AdaptiveDpr pixelated />
        <CameraInit />
        {debugVisible && <DebugTracker onUpdate={handleDebugUpdate} />}
        <PointerLockControls />
      </Canvas>

      {debugVisible && <DebugOverlay info={debugInfo} />}
    </>
  )
}

export default App
