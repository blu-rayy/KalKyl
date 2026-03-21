import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Raycaster, Vector2, Vector3 } from 'three'

const _center = new Vector2(0, 0)

export function HoverLight({
  hitCenter,              // [x, y, z] world position of the target surface
  hitRadius   = 15,       // max distance from hitCenter to count as a hit
  position    = [0, 120, 0],
  targetPos   = [0, 100, 0],
  maxIntensity = 8000,
  angle       = 0.3,
  penumbra    = 0.8,
  distance    = 150,
  color       = '#ffe8c0',
}) {
  const lightRef = useRef()
  const { camera, scene } = useThree()
  // Each instance gets its own raycaster and hitCenter vector — no shared singletons
  const rc = useMemo(() => new Raycaster(), [])
  const center = useMemo(() => new Vector3(...hitCenter), [])

  useEffect(() => {
    const light = lightRef.current
    if (!light) return
    light.target.position.set(targetPos[0], targetPos[1], targetPos[2])
    light.target.updateMatrixWorld()
    scene.add(light.target)
    return () => scene.remove(light.target)
  }, [scene])

  useFrame((_, delta) => {
    if (!lightRef.current) return
    rc.setFromCamera(_center, camera)
    const hits = rc.intersectObjects(scene.children, true)
    const hit = hits[0]
    const looking = hit && hit.point.distanceTo(center) < hitRadius
    const target = looking ? maxIntensity : 0
    lightRef.current.intensity += (target - lightRef.current.intensity) * Math.min(delta * 4, 1)
  })

  return (
    <spotLight
      ref={lightRef}
      position={position}
      intensity={0}
      angle={angle}
      penumbra={penumbra}
      distance={distance}
      color={color}
      castShadow={false}
    />
  )
}
