import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'

const _dir = new Vector3()

function r(n, d = 2) { return Number(n).toFixed(d) }
function deg(rad) { return r((rad * 180) / Math.PI, 1) }

// Inside Canvas — polls every frame, reports up via callback
export function DebugTracker({ onUpdate }) {
  const { camera, gl } = useThree()
  const prev = useRef('')

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
        pos:  { x: r(camera.position.x), y: r(camera.position.y), z: r(camera.position.z) },
        rot:  { x: deg(camera.rotation.x), y: deg(camera.rotation.y), z: deg(camera.rotation.z) },
        dir:  { x: r(_dir.x), y: r(_dir.y), z: r(_dir.z) },
        fov:  r(camera.fov, 1),
        locked: !!gl.domElement.ownerDocument.pointerLockElement,
      })
    }
  })

  return null
}

// Outside Canvas — pure DOM overlay
export function DebugOverlay({ info }) {
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
    label:  { color: '#888', display: 'inline-block', width: '90px' },
    value:  { color: '#fff' },
    accent: { color: '#00ff99' },
    section:{ color: '#aaa', marginTop: '8px', marginBottom: '2px', borderBottom: '1px solid #333', paddingBottom: '2px' },
    hint:   { color: '#555', marginTop: '8px', fontSize: '11px' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.section}>CAMERA</div>

      <div>
        <span style={s.label}>position</span>
        <span style={s.accent}>
          {info.pos.x} &nbsp; {info.pos.y} &nbsp; {info.pos.z}
        </span>
      </div>

      <div>
        <span style={s.label}>rotation°</span>
        <span style={s.value}>
          p:{info.rot.x} &nbsp; y:{info.rot.y} &nbsp; r:{info.rot.z}
        </span>
      </div>

      <div>
        <span style={s.label}>direction</span>
        <span style={s.value}>
          {info.dir.x} &nbsp; {info.dir.y} &nbsp; {info.dir.z}
        </span>
      </div>

      <div>
        <span style={s.label}>fov</span>
        <span style={s.value}>{info.fov}°</span>
      </div>

      <div style={s.section}>CONTROLS</div>

      <div>
        <span style={s.label}>pointer lock</span>
        <span style={{ color: info.locked ? '#00ff99' : '#ff6b6b' }}>
          {info.locked ? 'LOCKED' : 'UNLOCKED'}
        </span>
      </div>

      <div style={s.hint}>Ctrl+Alt+N — toggle debug &nbsp;|&nbsp; Esc — unlock cursor</div>
    </div>
  )
}
