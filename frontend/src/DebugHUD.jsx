import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, Raycaster, Vector2 } from 'three'

const _dir = new Vector3()
const _fwd = new Vector3()
const _right = new Vector3()
const _up = new Vector3(0, 1, 0)
const _center = new Vector2(0, 0)
const SPEED = 0.4

function r(n, d = 2) { return Number(n).toFixed(d) }
function deg(rad) { return r((rad * 180) / Math.PI, 1) }

// Inside Canvas — WASD + Q/E movement (active while debug is visible)
export function DebugMovement() {
  const { camera } = useThree()
  const keys = useRef({})

  useEffect(() => {
    const down = (e) => { keys.current[e.code] = true }
    const up   = (e) => { keys.current[e.code] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup',   up)
    }
  }, [])

  useFrame(() => {
    const k = keys.current
    camera.getWorldDirection(_fwd)
    _fwd.y = 0
    _fwd.normalize()
    _right.crossVectors(_fwd, _up).normalize()

    if (k['KeyW']) camera.position.addScaledVector(_fwd,   SPEED)
    if (k['KeyS']) camera.position.addScaledVector(_fwd,  -SPEED)
    if (k['KeyA']) camera.position.addScaledVector(_right, -SPEED)
    if (k['KeyD']) camera.position.addScaledVector(_right,  SPEED)
    if (k['KeyE']) camera.position.y += SPEED
    if (k['KeyQ']) camera.position.y -= SPEED
  })

  return null
}

// Inside Canvas — polls camera + raycasts crosshair center every frame
export function DebugTracker({ onUpdate, onCrosshairUpdate }) {
  const { camera, gl, scene } = useThree()
  const prev = useRef('')
  const prevHit = useRef('')
  const rc = useRef(new Raycaster())

  useFrame(() => {
    camera.getWorldDirection(_dir)

    const snapshot = [
      camera.position.x, camera.position.y, camera.position.z,
      camera.rotation.x, camera.rotation.y, camera.rotation.z,
      _dir.x, _dir.y, _dir.z,
      camera.fov,
      gl.domElement.ownerDocument.pointerLockElement ? 1 : 0,
    ].map(v => r(v, 3)).join('|')

    if (snapshot !== prev.current) {
      prev.current = snapshot
      onUpdate({
        pos:    { x: r(camera.position.x), y: r(camera.position.y), z: r(camera.position.z) },
        rot:    { x: deg(camera.rotation.x), y: deg(camera.rotation.y), z: deg(camera.rotation.z) },
        dir:    { x: r(_dir.x), y: r(_dir.y), z: r(_dir.z) },
        fov:    r(camera.fov, 1),
        locked: !!gl.domElement.ownerDocument.pointerLockElement,
      })
    }

    // Crosshair raycast from screen center
    rc.current.setFromCamera(_center, camera)
    const hits = rc.current.intersectObjects(scene.children, true)
    const hit = hits[0]
    const hitSnap = hit
      ? `${r(hit.point.x)}|${r(hit.point.y)}|${r(hit.point.z)}|${r(hit.distance)}|${hit.object.name}`
      : 'none'

    if (hitSnap !== prevHit.current) {
      prevHit.current = hitSnap
      if (hit) {
        onCrosshairUpdate({
          hit: true,
          point:    { x: r(hit.point.x), y: r(hit.point.y), z: r(hit.point.z) },
          distance: r(hit.distance),
          normal:   hit.face
            ? { x: r(hit.face.normal.x), y: r(hit.face.normal.y), z: r(hit.face.normal.z) }
            : null,
          object: hit.object.name || hit.object.parent?.name || '(unnamed)',
        })
      } else {
        onCrosshairUpdate({ hit: false })
      }
    }
  })

  return null
}

// Always-visible crosshair — outside Canvas, no debug required
export function Crosshair() {
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none', zIndex: 9998,
      width: '20px', height: '20px',
    }}>
      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1.5px', background: 'rgba(255,255,255,0.75)', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1.5px', background: 'rgba(255,255,255,0.75)', transform: 'translateX(-50%)' }} />
    </div>
  )
}

// Outside Canvas — pure DOM overlay
export function DebugOverlay({ info, crosshair }) {
  const s = {
    wrap: {
      position: 'fixed', top: '12px', left: '12px',
      background: 'rgba(0,0,0,0.72)', color: '#e2e2e2',
      fontFamily: 'monospace', fontSize: '12px',
      padding: '12px 16px', borderRadius: '6px',
      pointerEvents: 'none', zIndex: 9999,
      lineHeight: '1.9', minWidth: '280px',
      border: '1px solid rgba(255,255,255,0.08)',
    },
    label:   { color: '#888', display: 'inline-block', width: '90px' },
    value:   { color: '#fff' },
    accent:  { color: '#00ff99' },
    miss:    { color: '#555' },
    section: { color: '#aaa', marginTop: '8px', marginBottom: '2px', borderBottom: '1px solid #333', paddingBottom: '2px' },
    hint:    { color: '#555', marginTop: '8px', fontSize: '11px' },
  }

  return (
    <>
      {/* Debug panel */}
      <div style={s.wrap}>
        <div style={s.section}>CAMERA</div>

        <div>
          <span style={s.label}>position</span>
          <span style={s.accent}>{info.pos.x} &nbsp; {info.pos.y} &nbsp; {info.pos.z}</span>
        </div>
        <div>
          <span style={s.label}>rotation°</span>
          <span style={s.value}>p:{info.rot.x} &nbsp; y:{info.rot.y} &nbsp; r:{info.rot.z}</span>
        </div>
        <div>
          <span style={s.label}>direction</span>
          <span style={s.value}>{info.dir.x} &nbsp; {info.dir.y} &nbsp; {info.dir.z}</span>
        </div>
        <div>
          <span style={s.label}>fov</span>
          <span style={s.value}>{info.fov}°</span>
        </div>

        <div style={s.section}>CROSSHAIR</div>

        {crosshair?.hit ? (
          <>
            <div>
              <span style={s.label}>point</span>
              <span style={s.accent}>{crosshair.point.x} &nbsp; {crosshair.point.y} &nbsp; {crosshair.point.z}</span>
            </div>
            <div>
              <span style={s.label}>distance</span>
              <span style={s.value}>{crosshair.distance}</span>
            </div>
            {crosshair.normal && (
              <div>
                <span style={s.label}>normal</span>
                <span style={s.value}>{crosshair.normal.x} &nbsp; {crosshair.normal.y} &nbsp; {crosshair.normal.z}</span>
              </div>
            )}
            <div>
              <span style={s.label}>object</span>
              <span style={s.value}>{crosshair.object}</span>
            </div>
          </>
        ) : (
          <div><span style={s.miss}>— no hit —</span></div>
        )}

        <div style={s.section}>CONTROLS</div>

        <div>
          <span style={s.label}>pointer lock</span>
          <span style={{ color: info.locked ? '#00ff99' : '#ff6b6b' }}>
            {info.locked ? 'LOCKED' : 'UNLOCKED'}
          </span>
        </div>

        <div style={s.hint}>Ctrl+Alt+N — toggle debug &nbsp;|&nbsp; Esc — unlock cursor</div>
        <div style={s.hint}>WASD — move &nbsp;|&nbsp; Q/E — down/up</div>
      </div>
    </>
  )
}
