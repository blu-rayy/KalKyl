import { Sparkles } from '@react-three/drei'

export function DustParticles({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <Sparkles
        count={60}
        scale={[30, 20, 30]}
        size={0.6}
        speed={0.15}
        opacity={0.35}
        color="#ffe8c0"
        noise={0.4}
      />
    </group>
  )
}
