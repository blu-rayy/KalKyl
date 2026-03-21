import { useEffect } from 'react'
import { useGLTF } from '@react-three/drei'
import { FrontSide } from 'three'

useGLTF.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')

export function Model({ path = '/model.glb' }) {
  const { scene } = useGLTF(path)

  useEffect(() => {
    scene.traverse((obj) => {
      if (!obj.isMesh) return

      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((mat) => {
        // Halves GPU work — backfaces are never visible in a fixed scene
        mat.side = FrontSide

        // Transmission requires a full extra render pass — kill it
        if (mat.transmission > 0) {
          mat.transmission = 0
          mat.transparent = false
          mat.opacity = 1
        }

        mat.needsUpdate = true
      })
    })
  }, [scene])

  return <primitive object={scene} />
}
