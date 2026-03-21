import { useRef, useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

function BeamCone({ from, to, angle }) {
  const { euler, mid, height, radius } = useMemo(() => {
    const f = new THREE.Vector3(...from)
    const t = new THREE.Vector3(...to)
    const h = f.distanceTo(t)
    const r = Math.tan(angle) * h
    const center = f.clone().lerp(t, 0.5)
    const dir = f.clone().sub(t).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    return { euler: new THREE.Euler().setFromQuaternion(q), mid: center.toArray(), height: h, radius: r }
  }, [from, to, angle])

  return (
    <mesh position={mid} rotation={euler}>
      <coneGeometry args={[radius, height, 16, 1, true]} />
      <meshBasicMaterial color="#ffe4b5" transparent opacity={0.07} depthWrite={false} side={THREE.BackSide} />
    </mesh>
  )
}

export function StageLight({
  position  = [6.68, 145, -15.55],
  targetPos = [6.68, 80, -15.55],
  intensity = 3000,
  angle     = 0.25,
  penumbra  = 0.4,
  distance  = 150,
  color     = '#ffe4b5',
}) {
  const lightRef = useRef()
  const { scene } = useThree()

  useEffect(() => {
    const light = lightRef.current
    if (!light) return
    // Use the spotlight's own built-in target — avoids custom Object3D swap issues
    light.target.position.set(targetPos[0], targetPos[1], targetPos[2])
    light.target.updateMatrixWorld()
    scene.add(light.target)
    return () => scene.remove(light.target)
  }, [scene])

  return (
    <spotLight
      ref={lightRef}
      position={position}
      intensity={intensity}
      angle={angle}
      penumbra={penumbra}
      distance={distance}
      color={color}
      castShadow={false}
    />
  )
}
