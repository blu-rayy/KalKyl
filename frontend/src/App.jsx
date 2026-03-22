import { Suspense, useState, useCallback, useEffect, useRef } from 'react'
import { KalKylPanel } from './KalKylPanel'
import { TerminalOverlay } from './TerminalOverlay'
import { ScreenDisplay } from './ScreenDisplay'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { PointerLockControls, AdaptiveDpr } from '@react-three/drei'
import { Model } from './Model'
import { DebugTracker, DebugOverlay, DebugMovement, Crosshair } from './DebugHUD'
import { StageLight } from './StageLight'
import { DustParticles } from './DustParticles'
import { HoverLight } from './HoverLight'
import { Raycaster, Vector2 } from 'three'

const DEG = Math.PI / 180

// ── Minimal audio for TV blink SFX ────────────────────────────────────────────
let _appAudioCtx = null
function appAC() {
  if (!_appAudioCtx) _appAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (_appAudioCtx.state === 'suspended') _appAudioCtx.resume()
  return _appAudioCtx
}
function playBlinkBeep() {
  try {
    const ctx = appAC()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.type = 'square'; osc.frequency.value = 880
    g.gain.setValueAtTime(0.035, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.055)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.055)
  } catch {}
}

// ── Plankalkül Grid Overlay ────────────────────────────────────────────────────
const G_OV    = '#00ff88'
const G2_OV   = '#00cc6a'
const DIM_OV  = '#009944'
const FAINT_OV = '#005528'

function GridOverlay({ grid, onClose }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id) }, [])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' || (e.ctrlKey && e.key === 'x')) { e.preventDefault(); close() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function close() { setVisible(false); setTimeout(onClose, 300) }

  if (!grid) return null

  const { rule_name, columns } = grid
  const rowLabels = ['V', 'K', 'T']
  const cellW = 10   // chars per cell for padding

  function pad(s, w) { return String(s ?? '').padStart(Math.floor((w + String(s ?? '').length) / 2)).padEnd(w) }

  const rows = [
    columns.map(c => pad(c.formula, cellW)),
    columns.map(c => pad(c.index,   cellW)),
    columns.map(c => pad(c.type,    cellW)),
  ]

  const sep = '─'.repeat(cellW)
  const rowSep = `  ──┼${columns.map(() => sep).join('┼')}┤`

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(0,0,0,0.6)',
        opacity: visible ? 1 : 0, transition: 'opacity 0.3s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#000', border: '1px solid #004422',
          padding: '28px 32px',
          width: '740px', height: '560px',
          boxSizing: 'border-box',
          fontFamily: '"Courier New", monospace', fontSize: '13px',
          boxShadow: '0 0 0 1px #001a0d, 0 0 40px rgba(0,255,136,0.07)',
          position: 'relative',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* CRT scanlines */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.1) 2px,rgba(0,0,0,0.1) 4px)' }} />
        {/* Vignette */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ color: FAINT_OV, marginBottom: '4px', letterSpacing: '0.04em', flexShrink: 0 }}>
            ─── Plankalkül Grid ──────────────────────── Ctrl+X to close ───
          </div>
          <div style={{ color: G_OV, fontWeight: 'bold', fontSize: '15px', marginBottom: '16px',
            textShadow: `0 0 8px ${G_OV}`, flexShrink: 0 }}>
            {rule_name}
          </div>

          {/* Grid rows — scrollable */}
          <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
          {rows.map((row, ri) => (
            <div key={ri}>
              <div style={{ color: ri === 0 ? G2_OV : ri === 1 ? DIM_OV : G_OV, whiteSpace: 'pre' }}>
                {'  '}{rowLabels[ri]}{' '}{'│'}{row.map((cell, ci) => cell + (ci < row.length - 1 ? '│' : '│')).join('')}
              </div>
              {ri < rows.length - 1 && (
                <div style={{ color: FAINT_OV, whiteSpace: 'pre' }}>{rowSep}</div>
              )}
            </div>
          ))}

          </div>

          {/* Footer */}
          <div style={{ color: FAINT_OV, marginTop: '16px', fontSize: '11px', flexShrink: 0 }}>
            {columns.length} operand{columns.length !== 1 ? 's' : ''}  ·  Konrad Zuse notation  ·  KalKyl v1.0
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <span onClick={close} style={{ color: DIM_OV, cursor: 'pointer', fontSize: '11px',
              letterSpacing: '0.1em', userSelect: 'none' }}>
              [ close ]
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── TV blink audio — plays beep each ON edge, no light ────────────────────────
function TVBlinkAudio({ tvMode }) {
  const prevOnRef = useRef(false)

  useFrame((state) => {
    if (tvMode !== 'alert') { prevOnRef.current = false; return }
    const on = Math.floor(state.clock.elapsedTime * 3) % 2 === 0
    if (on && !prevOnRef.current) playBlinkBeep()
    prevOnRef.current = on
  })

  return null
}

function CameraInit() {
  const { camera } = useThree()
  useEffect(() => {
    camera.rotation.set(-172.2 * DEG, 1.4 * DEG, 179.8 * DEG)
  }, [camera])
  return null
}

// Casts a ray from camera center each frame; reports which screen (PC / TV) is aimed at.
// PC screen: vertex X ≈ 10  →  world hit.x < 30
// TV screen: vertex X ≈ 58  →  world hit.x ≥ 30
function ScreenAimDetector({ onAimChange }) {
  const { camera, scene } = useThree()
  const ray    = useRef(new Raycaster())
  const center = useRef(new Vector2(0, 0))
  const prev   = useRef({ pc: false, tv: false })

  useFrame(() => {
    ray.current.setFromCamera(center.current, camera)
    const hits      = ray.current.intersectObjects(scene.children, true)
    const screenHit = hits.find(h => h.object.name === 'screen_glass_glass_0')
    const aimPC = !!(screenHit && screenHit.point.x < 30)
    const aimTV = !!(screenHit && screenHit.point.x >= 30)
    if (aimPC !== prev.current.pc || aimTV !== prev.current.tv) {
      prev.current = { pc: aimPC, tv: aimTV }
      onAimChange({ pc: aimPC, tv: aimTV })
    }
  })

  return null
}

const DEFAULT_DEBUG = {
  pos:  { x: '8.38',  y: '106.93', z: '-73.77' },
  rot:  { x: '0.0',   y: '0.0',   z: '0.0' },
  dir:  { x: '0.00',  y: '0.00',  z: '-1.00' },
  fov:  '50.0',
  locked: false,
}

function App() {
  const [booted, setBooted]             = useState(false)
  const [screenFocused, setScreenFocused] = useState(false)
  const [aimingAtScreen, setAimingAtScreen] = useState(false)
  const [aimingAtTV, setAimingAtTV]     = useState(false)
  const [transcript, setTranscript]     = useState([
    { text: 'KalKyl Terminal  v1.0', color: '#005500' },
    { text: 'Type a statement and press ENTER.', color: '#005500' },
    { text: '', color: '#005500' },
  ])
  const [debugVisible, setDebugVisible] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [debugInfo, setDebugInfo]       = useState(DEFAULT_DEBUG)
  const [crosshairInfo, setCrosshairInfo] = useState({ hit: false })
  const [gridData, setGridData]         = useState(null)
  const [tvMode, setTvMode]             = useState('blank') // 'blank'|'alert'|'grid'

  const aimingPCRef     = useRef(false)
  const aimingTVRef     = useRef(false)
  const aimingRef       = useRef(false)   // kept for backward compat (PC only)
  const lockedRef       = useRef(false)   // true while pointer lock is active
  const plcRef          = useRef()
  const gridNotifiedRef = useRef(false)   // blinking !! shown only once per session

  // Track pointer lock state so we only open overlay from a locked click
  useEffect(() => {
    const onChange = () => { lockedRef.current = !!document.pointerLockElement }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  // Unlock pointer when overlay opens
  useEffect(() => {
    if (screenFocused) plcRef.current?.unlock()
  }, [screenFocused])

  // Keyboard shortcuts
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

  const [gridOverlayOpen, setGridOverlayOpen] = useState(false)

  const handleTVClick = useCallback(() => {
    setTvMode(m => (m === 'alert' || m === 'grid') ? 'grid' : m)
    setGridOverlayOpen(true)
  }, [])

  const handleAimChange = useCallback(({ pc, tv }) => {
    aimingPCRef.current = pc
    aimingTVRef.current = tv
    aimingRef.current   = pc   // backward compat
    setAimingAtScreen(pc)
    setAimingAtTV(tv)
  }, [])

  const handleGridReady = useCallback((grid) => {
    setGridData(grid)
    if (!gridNotifiedRef.current) {
      gridNotifiedRef.current = true
      setTvMode('alert')
    } else {
      setTvMode('grid')
    }
  }, [])

  // mousedown fires before the browser can release pointer lock, so lockedRef is still true.
  // PC: require lock. TV: allow if aiming regardless (grid overlay opens on top).
  useEffect(() => {
    const onDown = (e) => {
      if (e.button !== 0) return
      if (aimingTVRef.current && (tvMode === 'alert' || tvMode === 'grid')) {
        handleTVClick(); return
      }
      if (lockedRef.current && aimingPCRef.current) { setScreenFocused(true) }
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [handleTVClick, tvMode])

  const handleDebugUpdate    = useCallback((info) => setDebugInfo(info), [])
  const handleCrosshairUpdate = useCallback((info) => setCrosshairInfo(info), [])

  return (
    <>
      <Canvas
        camera={{ position: [8.38, 106.93, -73.77], fov: 50 }}
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
        <ScreenDisplay booted={booted} transcript={transcript} gridData={gridData} tvMode={tvMode} />
        <TVBlinkAudio tvMode={tvMode} />
        <ScreenAimDetector onAimChange={handleAimChange} />
        {debugVisible && <DebugTracker onUpdate={handleDebugUpdate} onCrosshairUpdate={handleCrosshairUpdate} />}
        {debugVisible && !screenFocused && <DebugMovement />}
        {!screenFocused && <PointerLockControls ref={plcRef} />}
      </Canvas>

      {debugVisible && <Crosshair />}

      {/* "click to view grid" hint when aiming at TV in alert mode */}
      {aimingAtTV && (tvMode === 'alert' || tvMode === 'grid') && !screenFocused && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, 22px)',
          color: '#00ff88',
          fontFamily: '"Courier New", monospace',
          fontSize: '12px',
          background: 'rgba(0,0,0,0.6)',
          padding: '3px 10px',
          borderRadius: '3px',
          pointerEvents: 'none',
          letterSpacing: '0.06em',
          userSelect: 'none',
          border: '1px solid rgba(0,255,136,0.2)',
        }}>
          {tvMode === 'alert' ? 'click to view Plankalkül grid' : 'click to open grid'}
        </div>
      )}

      {/* "click to interact" hint when aiming at PC screen */}
      {aimingAtScreen && !screenFocused && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, 22px)',
          color: '#e0e0e0',
          fontFamily: '"Courier New", monospace',
          fontSize: '12px',
          background: 'rgba(0,0,0,0.6)',
          padding: '3px 10px',
          borderRadius: '3px',
          pointerEvents: 'none',
          letterSpacing: '0.06em',
          userSelect: 'none',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          click to interact
        </div>
      )}

      {debugVisible && <DebugOverlay info={debugInfo} crosshair={crosshairInfo} />}
      {panelVisible && <KalKylPanel onClose={() => setPanelVisible(false)} />}
      {gridOverlayOpen && (
        <GridOverlay grid={gridData} onClose={() => setGridOverlayOpen(false)} />
      )}
      {screenFocused && (
        <TerminalOverlay
          booted={booted}
          onBoot={() => setBooted(true)}
          onClose={() => setScreenFocused(false)}
          transcript={transcript}
          setTranscript={setTranscript}
          onGridReady={handleGridReady}
        />
      )}
    </>
  )
}

export default App
