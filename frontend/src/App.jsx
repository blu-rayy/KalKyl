import { Suspense, useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { KalKylPanel } from './KalKylPanel'
import { TerminalOverlay } from './TerminalOverlay'
import { VintageDocOverlay } from './VintageDocOverlay'
import { ScreenDisplay } from './ScreenDisplay'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { AdaptiveDpr } from '@react-three/drei'
import { Model } from './Model'
import { DebugTracker, DebugOverlay, DebugMovement, Crosshair } from './DebugHUD'
import { StageLight } from './StageLight'
import { DustParticles } from './DustParticles'
import { HoverLight } from './HoverLight'
import { Raycaster, Vector2, Euler as ThreeEuler } from 'three'

const DEG = Math.PI / 180

// ── Audio system ───────────────────────────────────────────────────────────────
let _appAudioCtx = null
function appAC() {
  if (!_appAudioCtx) _appAudioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (_appAudioCtx.state === 'suspended') _appAudioCtx.resume()
  return _appAudioCtx
}

// TV blink beep (existing)
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

// VHS tape-slot mechanical click
function playVHSClick() {
  try {
    const ctx = appAC()
    const len = ctx.sampleRate * 0.12
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, 2.2)
      d[i] = (Math.random() * 2 - 1) * env
    }
    const src = ctx.createBufferSource(); src.buffer = buf
    const lp  = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 1800; lp.Q.value = 0.7
    const g   = ctx.createGain(); g.gain.value = 0.22
    src.connect(lp); lp.connect(g); g.connect(ctx.destination)
    src.start()
  } catch {}
}

// PC screen focus click — brief soft blip
function playScreenClick() {
  try {
    const ctx = appAC()
    const osc = ctx.createOscillator(); const g = ctx.createGain()
    osc.type = 'sine'; osc.frequency.setValueAtTime(420, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(210, ctx.currentTime + 0.06)
    g.gain.setValueAtTime(0.04, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + 0.09)
  } catch {}
}

// Ambient room hum — low rumble + 60 Hz electrical buzz
let _ambientNodes = null
function startAmbient() {
  if (_ambientNodes) return
  try {
    const ctx = appAC()
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 3)
    master.connect(ctx.destination)

    // Low-frequency room rumble (filtered white noise)
    const bufSize = ctx.sampleRate * 4
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
    const lp  = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 95
    const ng  = ctx.createGain(); ng.gain.value = 0.032
    noise.connect(lp); lp.connect(ng); ng.connect(master)
    noise.start()

    // 60 Hz electrical hum
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 60
    const og  = ctx.createGain(); og.gain.value = 0.011
    osc.connect(og); og.connect(master)
    osc.start()

    _ambientNodes = { noise, osc, master }
  } catch {}
}
function stopAmbient() {
  if (!_ambientNodes) return
  try {
    const { noise, osc, master } = _ambientNodes
    const ctx = appAC()
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime)
    master.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5)
    setTimeout(() => { try { noise.stop(); osc.stop() } catch {} }, 1700)
  } catch {}
  _ambientNodes = null
}

// PC fan — starts once on first pointer lock, never stops (PC is always on)
let _pcFanStarted = false
function startPCFan() {
  if (_pcFanStarted) return
  _pcFanStarted = true
  try {
    const ctx = appAC()
    const master = ctx.createGain()
    master.gain.setValueAtTime(0, ctx.currentTime)
    master.gain.linearRampToValueAtTime(1, ctx.currentTime + 5)
    master.connect(ctx.destination)

    // Main fan whoosh — white noise band-passed to the classic mid-range drone
    const bufSize = ctx.sampleRate * 4
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1
    const noise = ctx.createBufferSource(); noise.buffer = buf; noise.loop = true
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 75
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass';  lp.frequency.value = 1300
    const ng = ctx.createGain(); ng.gain.value = 0.016
    noise.connect(hp); hp.connect(lp); lp.connect(ng); ng.connect(master)
    noise.start()

    // Motor hum at blade-pass frequency
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 115
    const humLp = ctx.createBiquadFilter(); humLp.type = 'lowpass'; humLp.frequency.value = 320
    const hg = ctx.createGain(); hg.gain.value = 0.002
    hum.connect(humLp); humLp.connect(hg); hg.connect(master)
    hum.start()

    // Slow LFO — slight "breathing" wobble in fan speed
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.38
    const lfog = ctx.createGain(); lfog.gain.value = 0.012
    lfo.connect(lfog); lfog.connect(ng.gain)
    lfo.start()
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

  // Per-column widths: max of formula/index/type length, minimum 6
  const colWidths = columns.map(c => Math.max(
    6,
    String(c.formula ?? '').length,
    String(c.index   ?? '').length,
    String(c.type    ?? '').length,
  ) + 2)  // +2 for padding

  function pad(s, w) {
    const str = String(s ?? '')
    const total = w
    const lpad = Math.floor((total - str.length) / 2)
    const rpad = total - str.length - lpad
    return ' '.repeat(Math.max(0, lpad)) + str + ' '.repeat(Math.max(0, rpad))
  }

  const rows = [
    columns.map((c, i) => pad(c.formula, colWidths[i])),
    columns.map((c, i) => pad(c.index,   colWidths[i])),
    columns.map((c, i) => pad(c.type,    colWidths[i])),
  ]

  const rowSep = `  ──┼${colWidths.map(w => '─'.repeat(w)).join('┼')}┤`

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


// Owns pointer-lock + camera control entirely, replacing PointerLockControls.
// Clamps horizontal yaw to ±90° from the initial facing direction with proper
// angle-difference wraparound so the limit is always centred on the monitor.
const CameraController = forwardRef(function CameraController({ enabled }, ref) {
  const { camera, gl } = useThree()
  const euler       = useRef(new ThreeEuler(0, 0, 0, 'YXZ'))
  const centerY     = useRef(null)
  const initialized = useRef(false)

  // Expose unlock() so overlays can call plcRef.current.unlock()
  useImperativeHandle(ref, () => ({
    unlock() { document.exitPointerLock() },
  }), [])

  // Set initial camera rotation exactly once
  useEffect(() => {
    if (initialized.current) return
    camera.rotation.set(-172.2 * DEG, 1.4 * DEG, 179.8 * DEG)
    euler.current.setFromQuaternion(camera.quaternion, 'YXZ')
    centerY.current = euler.current.y
    initialized.current = true
  }, [camera])

  // Mouse + pointer-lock listeners — only active when not in terminal/overlay
  useEffect(() => {
    if (!enabled) return

    const SENSITIVITY = 0.002
    const MAX_YAW     = Math.PI / 2
    const MAX_PITCH   = Math.PI * 0.48

    const onMove = (e) => {
      if (!document.pointerLockElement) return
      if (centerY.current === null) return

      euler.current.setFromQuaternion(camera.quaternion, 'YXZ')

      // Pitch — clamp to avoid flipping over
      euler.current.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH,
        euler.current.x - e.movementY * SENSITIVITY))

      // Yaw — clamp to ±90° from center with wraparound
      const rawYaw = euler.current.y - e.movementX * SENSITIVITY
      let diff = rawYaw - centerY.current
      if (diff >  Math.PI) diff -= 2 * Math.PI
      if (diff < -Math.PI) diff += 2 * Math.PI
      euler.current.y = centerY.current + Math.max(-MAX_YAW, Math.min(MAX_YAW, diff))

      camera.quaternion.setFromEuler(euler.current)
    }

    const onClick = () => {
      if (!document.pointerLockElement) gl.domElement.requestPointerLock()
    }

    document.addEventListener('mousemove', onMove)
    gl.domElement.addEventListener('click', onClick)
    return () => {
      document.removeEventListener('mousemove', onMove)
      gl.domElement.removeEventListener('click', onClick)
    }
  }, [enabled, camera, gl])

  return null
})

// Casts a ray from camera center each frame; reports which screen (PC / TV) is aimed at.
// PC screen: vertex X ≈ 10  →  world hit.x < 30
// TV screen: vertex X ≈ 58  →  world hit.x ≥ 30
function ScreenAimDetector({ onAimChange }) {
  const { camera, scene } = useThree()
  const ray    = useRef(new Raycaster())
  const center = useRef(new Vector2(0, 0))
  const prev   = useRef({ pc: false, tv: false, vhs: false })

  useFrame(() => {
    ray.current.setFromCamera(center.current, camera)
    const hits      = ray.current.intersectObjects(scene.children, true)
    const screenHit = hits.find(h => h.object.name === 'screen_glass_glass_0')
    const vhsHit    = hits.find(h => h.object.name === 'vhs_vhsPlayer_mat_0')
    const aimPC  = !!(screenHit && screenHit.point.x < 30)
    const aimTV  = !!(screenHit && screenHit.point.x >= 30)
    const aimVHS = !!vhsHit
    if (aimPC !== prev.current.pc || aimTV !== prev.current.tv || aimVHS !== prev.current.vhs) {
      prev.current = { pc: aimPC, tv: aimTV, vhs: aimVHS }
      onAimChange({ pc: aimPC, tv: aimTV, vhs: aimVHS })
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
  const [aimingAtVHS, setAimingAtVHS]   = useState(false)
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
  const [gridOverlayOpen, setGridOverlayOpen] = useState(false)
  const [docOverlayOpen, setDocOverlayOpen]   = useState(false)

  const aimingPCRef     = useRef(false)
  const aimingTVRef     = useRef(false)
  const aimingVHSRef    = useRef(false)
  const aimingRef       = useRef(false)   // kept for backward compat (PC only)
  const lockedRef       = useRef(false)   // true while pointer lock is active
  const plcRef          = useRef()
  const gridNotifiedRef = useRef(false)   // blinking !! shown only once per session

  // Track pointer lock state; drive ambient sound with lock
  useEffect(() => {
    const onChange = () => {
      lockedRef.current = !!document.pointerLockElement
      if (lockedRef.current) { startPCFan(); startAmbient() }
      else stopAmbient()
    }
    document.addEventListener('pointerlockchange', onChange)
    return () => document.removeEventListener('pointerlockchange', onChange)
  }, [])

  // Unlock pointer when any overlay opens
  useEffect(() => {
    if (screenFocused || docOverlayOpen) plcRef.current?.unlock()
  }, [screenFocused, docOverlayOpen])

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

  const handleTVClick = useCallback(() => {
    setTvMode(m => (m === 'alert' || m === 'grid') ? 'grid' : m)
    setGridOverlayOpen(true)
  }, [])

  const handleAimChange = useCallback(({ pc, tv, vhs }) => {
    aimingPCRef.current  = pc
    aimingTVRef.current  = tv
    aimingVHSRef.current = vhs
    aimingRef.current    = pc   // backward compat
    setAimingAtScreen(pc)
    setAimingAtTV(tv)
    setAimingAtVHS(vhs)
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
      if (lockedRef.current && aimingVHSRef.current) { playVHSClick(); setDocOverlayOpen(true); return }
      if (aimingTVRef.current && (tvMode === 'alert' || tvMode === 'grid')) {
        handleTVClick(); return
      }
      if (lockedRef.current && aimingPCRef.current) { playScreenClick(); setScreenFocused(true) }
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
        <ambientLight intensity={0.055} />
        <Suspense fallback={null}>
          <Model path="/retro_room.glb" />
        </Suspense>
        <StageLight position={[8.65, 155, 8.65]} targetPos={[8.65, 95, 8.65]} angle={0.85} intensity={8000} penumbra={0.9} />
        <HoverLight hitCenter={[58.49, 105, -13.71]} hitRadius={15} position={[33.42, 130, -60.11]} targetPos={[58.63, 103.62, -13.78]} maxIntensity={8000} angle={0.3} penumbra={0.8} distance={150} color="#ffe8c0" />
        <HoverLight hitCenter={[-33.15, 82.58, 11.74]} hitRadius={15} position={[-33.15, 150, 11.74]} targetPos={[-33.15, 82.58, 11.74]} maxIntensity={8000} angle={0.4} penumbra={0.8} distance={150} color="#ffe8c0" />
        {/* PC monitor cool-blue screen glow */}
        <pointLight position={[10, 104, -72]} color="#8aaeff" intensity={90} distance={55} decay={2} />
        {/* Warm fill from desk lamp area */}
        <pointLight position={[8, 92, 10]} color="#ffcc88" intensity={30} distance={60} decay={2} />
<DustParticles position={[8.65, 88, 8.65]} />
        <AdaptiveDpr pixelated />
        <CameraController ref={plcRef} enabled={!screenFocused} />
        <ScreenDisplay booted={booted} transcript={transcript} gridData={gridData} tvMode={tvMode} />
        <TVBlinkAudio tvMode={tvMode} />
        <ScreenAimDetector onAimChange={handleAimChange} />
        {debugVisible && <DebugTracker onUpdate={handleDebugUpdate} onCrosshairUpdate={handleCrosshairUpdate} />}
        {debugVisible && !screenFocused && <DebugMovement />}
      </Canvas>

      {debugVisible && <Crosshair />}

      {/* Wordless interact indicator — pulsing ring at crosshair */}
      {!screenFocused && (() => {
        const color =
          aimingAtScreen ? 'rgba(220,220,220,0.9)' :
          (aimingAtTV && (tvMode === 'alert' || tvMode === 'grid')) ? 'rgba(0,255,136,0.9)' :
          aimingAtVHS   ? 'rgba(232,208,144,0.9)' :
          null
        if (!color) return null
        return (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9000 }}>
            {/* Expanding ring */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 22, height: 22,
              borderRadius: '50%',
              border: `1.5px solid ${color}`,
              animation: 'kk-interact-ring 1.1s ease-out infinite',
            }} />
            {/* Inner dot */}
            <div style={{
              position: 'absolute',
              top: '50%', left: '50%',
              width: 6, height: 6,
              borderRadius: '50%',
              background: color,
              animation: 'kk-interact-dot 1.1s ease-in-out infinite',
            }} />
          </div>
        )
      })()}

      {debugVisible && <DebugOverlay info={debugInfo} crosshair={crosshairInfo} />}
      {panelVisible && <KalKylPanel onClose={() => setPanelVisible(false)} />}
      {gridOverlayOpen && (
        <GridOverlay grid={gridData} onClose={() => setGridOverlayOpen(false)} />
      )}
      {docOverlayOpen && (
        <VintageDocOverlay onClose={() => setDocOverlayOpen(false)} />
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
