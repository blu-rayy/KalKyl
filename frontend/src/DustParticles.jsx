import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, CanvasTexture } from 'three'

const COUNT = 160
const W = 340, H = 130, D = 340

// Soft Gaussian-like circle — gives the "blurry dust mote" look
function makeSoftDotTexture() {
  const size = 64
  const half = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(half, half, 0, half, half, half)
  g.addColorStop(0,    'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.85)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.35)')
  g.addColorStop(0.75, 'rgba(255,255,255,0.07)')
  g.addColorStop(1,    'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

export function DustParticles({ position = [0, 0, 0] }) {
  const ref = useRef()

  const texture = useMemo(() => makeSoftDotTexture(), [])

  const { positions, speeds, offsets } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    const speeds    = new Float32Array(COUNT)
    const offsets   = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * W
      positions[i * 3 + 1] = (Math.random() - 0.5) * H
      positions[i * 3 + 2] = (Math.random() - 0.5) * D
      speeds[i]  = 0.06 + Math.random() * 0.16
      offsets[i] = Math.random() * Math.PI * 2
    }
    return { positions, speeds, offsets }
  }, [])

  const baseY = useMemo(() => {
    const arr = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) arr[i] = positions[i * 3 + 1]
    return arr
  }, [positions])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t   = clock.elapsedTime
    const pos = ref.current.geometry.attributes.position.array
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     += Math.sin(t * speeds[i] * 0.4 + offsets[i]) * 0.003
      pos[i * 3 + 1]  = baseY[i] + Math.sin(t * speeds[i] + offsets[i]) * 1.4
      pos[i * 3 + 2] += Math.cos(t * speeds[i] * 0.3 + offsets[i]) * 0.002
    }
    ref.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <group position={position}>
      <points ref={ref}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={2.2}
          map={texture}
          color="#ffe8c0"
          transparent
          opacity={0.055}
          alphaTest={0.004}
          sizeAttenuation
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </points>
    </group>
  )
}
