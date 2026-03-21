import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, ShaderMaterial, SRGBColorSpace } from 'three'
import { useGLTF } from '@react-three/drei'

// Both screens are baked into one mesh. Vertex X: PC≈10, TV≈58.
// Shader masks out the TV half (x > 30) leaving it black.
const VERT = `
  varying vec2 vUv;
  varying float vX;
  void main() {
    vUv = uv;
    vX  = position.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const FRAG = `
  uniform sampler2D map;
  varying vec2 vUv;
  varying float vX;

  // PC screen UV bounds measured from decompressed geometry
  const vec2 UV_MIN = vec2(0.0117, 0.0117);
  const vec2 UV_MAX = vec2(0.9849, 0.5850);

  void main() {
    if (vX > 30.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
      // Normalise UV so the full canvas maps exactly to this screen's UV island
      vec2 uv = (vUv - UV_MIN) / (UV_MAX - UV_MIN);
      gl_FragColor = texture2D(map, uv);
    }
  }
`

const ASCII_LINES = [
  '....:==============-............................................................-==============-....',
  '....=###############:..........................................................:*##############+....',
  '....=##############*:..........................................................:*##############+....',
  '....=##############*:..........................................................:*##############+....',
  '....=#######-..........................................................................:*######+....',
  '....=#######-..........................................................................:*######+....',
  '....=#######-................................................:-........................:*######+....',
  '....=#######-...............................................*##*-......................:*######+....',
  '....=#######-.............................................=#######-....................:*######+....',
  '....=#######-............................................:*########*-..................:*######+....',
  '....=#######-..............................................-#########*:................:*######+....',
  '....=#######-................................................-*########*-..............:*######+....',
  '....=#######-..................................................-#########*:............:*######+....',
  '....=#######-.........*##################+....=############################*:..........:*######+....',
  '....=#######-.........*##################+....=##############################+.........:*######+....',
  '....=#######-.........*##################+....=############################*-..........:*######+....',
  '....=#######-.........:------------------:....:----------------+#########*-............:#######+....',
  '....=#######-................................................:*#########-..............:*######+....',
  '....=#######-..............................................-#########*-................:*######+....',
  '....=#######-.............................................*#########-..................:#######+....',
  '....=#######-.............................................+#######-....................:#######+....',
  '....=#######-...............................................*###-......................:*######+....',
  '....=#######-.................................................-........................:*######+....',
  '....=#######-..........................................................................:*######+....',
  '....=#######-..........................................................................:*######+....',
  '....=###############:..........................................................:*##############+....',
  '....=###############:..........................................................:*##############+....',
  '....=###############:..........................................................:*##############+....',
  '....:---------------............................................................:--------------:....',
  '....................................................................................................',
]

const CW = 1024
const CH = 768
const CX = CW / 2 - 100  // visual center X (shift left to compensate for perspective)

function draw(ctx, tick, booted) {
  // Black background
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, CW, CH)

  if (!booted) {
    const fontSize = 13
    const lineH = fontSize + 3

    ctx.font = `${fontSize}px "Courier New", monospace`

    const totalH = ASCII_LINES.length * lineH
    const startY = (CH - totalH) / 2

    ctx.fillStyle = '#00ff88'
    ctx.textAlign = 'center'
    ASCII_LINES.forEach((line, i) => {
      ctx.fillText(line, CX, startY + i * lineH + fontSize)
    })
    ctx.textAlign = 'left'

    // Blinking "CLICK TO CONTINUE"
    if (Math.floor(tick / 30) % 2 === 0) {
      ctx.font = '16px "Courier New", monospace'
      ctx.fillStyle = '#00ff88'
      ctx.textAlign = 'center'
      ctx.fillText('CLICK ANYWHERE TO CONTINUE', CX, startY + totalH + 28)
    }
  } else {
    // Post-boot idle: minimal terminal prompt
    ctx.font = '18px "Courier New", monospace'
    ctx.fillStyle = '#00ff88'
    ctx.textAlign = 'center'
    ctx.fillText('KalKyl  v1.0', CX, CH / 2 - 22)
    ctx.fillText('Press Ctrl+K to open compiler', CX, CH / 2 + 4)
    ctx.textAlign = 'left'

    // Blinking block cursor
    if (Math.floor(tick / 35) % 2 === 0) {
      ctx.fillStyle = '#00ff88'
      const cw = 12
      const ch = 18
      ctx.fillRect(CX - cw / 2, CH / 2 + 28, cw, ch)
    }
  }

  // CRT scanlines
  for (let y = 0; y < CH; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(0, y, CW, 1)
  }

  // Subtle vignette
  const vignette = ctx.createRadialGradient(CW / 2, CH / 2, CH * 0.3, CW / 2, CH / 2, CH * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, CW, CH)
}

export function ScreenDisplay({ booted }) {
  const { scene } = useGLTF('/retro_room.glb')
  const canvasRef  = useRef(null)
  const textureRef = useRef(null)
  const tickRef    = useRef(0)
  const bootedRef  = useRef(booted)

  useEffect(() => { bootedRef.current = booted }, [booted])

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width  = CW
    canvas.height = CH
    canvasRef.current = canvas

    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    textureRef.current = tex

    scene.traverse((obj) => {
      if (obj.name !== 'screen_glass_glass_0') return

      obj.material = new ShaderMaterial({
        uniforms:       { map: { value: tex } },
        vertexShader:   VERT,
        fragmentShader: FRAG,
        toneMapped:     false,
      })
    })

    return () => tex.dispose()
  }, [scene])

  useFrame(() => {
    if (!canvasRef.current || !textureRef.current) return
    tickRef.current++

    const ctx = canvasRef.current.getContext('2d')
    draw(ctx, tickRef.current, bootedRef.current)
    textureRef.current.needsUpdate = true
  })

  return null
}
