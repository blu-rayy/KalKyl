import { Suspense, useState, useCallback, useEffect } from 'react'
import { KalKylPanel } from './KalKylPanel'
import { Canvas, useThree } from '@react-three/fiber'
import { PointerLockControls, AdaptiveDpr } from '@react-three/drei'
import { Model } from './Model'
import { DebugTracker, DebugOverlay, DebugMovement, Crosshair } from './DebugHUD'
import { StageLight } from './StageLight'
import { DustParticles } from './DustParticles'
import { HoverLight } from './HoverLight'

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
  const [panelVisible, setPanelVisible] = useState(false)
  const [debugInfo, setDebugInfo] = useState(DEFAULT_DEBUG)
  const [crosshairInfo, setCrosshairInfo] = useState({ hit: false })

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.altKey && e.key === 'n') {
        e.preventDefault()
        setDebugVisible(v => !v)
      }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setPanelVisible(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleDebugUpdate = useCallback((info) => setDebugInfo(info), [])
  const handleCrosshairUpdate = useCallback((info) => setCrosshairInfo(info), [])

  return (
    <>
      <Canvas
        camera={{ position: [8.80, 98.93, -82.78], fov: 50 }}
        style={{ width: '100vw', height: '100vh', display: 'block' }}
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
      >
        <ambientLight intensity={0.04} />
        <Suspense fallback={null}>
          <Model path="/retro_room.glb" />
        </Suspense>
        <StageLight position={[8.65, 155, 8.65]} targetPos={[8.65, 95, 8.65]} angle={0.85} intensity={8000} penumbra={0.9} />
        <HoverLight hitCenter={[58.49, 105, -13.71]} hitRadius={15} position={[33.42, 130, -60.11]} targetPos={[58.63, 103.62, -13.78]} maxIntensity={8000} angle={0.3} penumbra={0.8} distance={150} color="#ffe8c0" />
        <HoverLight hitCenter={[-33.15, 82.58, 11.74]} hitRadius={15} position={[-33.15, 150, 11.74]} targetPos={[-33.15, 82.58, 11.74]} maxIntensity={8000} angle={0.4} penumbra={0.8} distance={150} color="#ffe8c0" />
        <DustParticles position={[8.65, 88, 8.65]} />
        <AdaptiveDpr pixelated />
        <CameraInit />
        {debugVisible && <DebugTracker onUpdate={handleDebugUpdate} onCrosshairUpdate={handleCrosshairUpdate} />}
        {debugVisible && <DebugMovement />}
        <PointerLockControls />
      </Canvas>

      <Crosshair />
      {debugVisible && <DebugOverlay info={debugInfo} crosshair={crosshairInfo} />}
      {panelVisible && <KalKylPanel onClose={() => setPanelVisible(false)} />}
    </>
  )
}

export default App
