import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

// Lives inside <Canvas> — polls camera each frame and reports upward
export function CameraTracker({ onUpdate }) {
  const { camera } = useThree()
  const prev = useRef('')

  useFrame(() => {
    const x = camera.position.x.toFixed(2)
    const y = camera.position.y.toFixed(2)
    const z = camera.position.z.toFixed(2)
    const fov = camera.fov?.toFixed(1) ?? '—'
    const key = `${x}${y}${z}${fov}`
    if (key !== prev.current) {
      prev.current = key
      onUpdate({ x, y, z, fov })
    }
  })

  return null
}

// Lives outside <Canvas> as a plain DOM overlay
export function CameraOverlay({ info }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      background: 'rgba(0,0,0,0.65)',
      color: '#00ff99',
      fontFamily: 'monospace',
      fontSize: '13px',
      padding: '10px 14px',
      borderRadius: '6px',
      pointerEvents: 'none',
      lineHeight: '2',
      zIndex: 9999,
    }}>
      <div>x &nbsp;&nbsp;{info.x}</div>
      <div>y &nbsp;&nbsp;{info.y}</div>
      <div>z &nbsp;&nbsp;{info.z}</div>
      <div>fov  {info.fov}</div>
    </div>
  )
}
