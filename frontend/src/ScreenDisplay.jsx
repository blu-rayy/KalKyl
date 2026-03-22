import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CanvasTexture, ShaderMaterial, SRGBColorSpace } from 'three'
import { useGLTF } from '@react-three/drei'

// Both screens baked into one mesh. Vertex X: PC≈10, TV≈58.
// PC side uses UV coords (measured). TV side uses local Y/Z position directly —
// avoids needing to know the TV UV island layout in the atlas.
// TV screen local-space extents (from HoverLight targetPos + estimated size):
//   Y: 97 → 111   (height ≈ 14 units, centred on 103.6)
//   Z: -22 → -6   (width  ≈ 16 units, centred on -13.8)
// Adjust TV_Y_MIN/MAX and TV_Z_MIN/MAX if the image is cropped or off-centre.
const VERT = `
  varying vec2 vUv;
  varying float vX;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vX  = position.x;
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const FRAG = `
  uniform sampler2D map;
  uniform sampler2D map2;
  varying vec2 vUv;
  varying float vX;
  varying vec3 vPos;

  const vec2 PC_UV_MIN = vec2(0.0117, 0.0117);
  const vec2 PC_UV_MAX = vec2(0.9849, 0.5850);

  // TV screen local-space extents — tune if image is misaligned
  const float TV_Y_MIN = 97.0;
  const float TV_Y_MAX = 111.0;
  const float TV_Z_MIN = -22.0;
  const float TV_Z_MAX = -6.0;

  void main() {
    if (vX > 30.0) {
      float u = 1.0 - clamp((vPos.z - TV_Z_MIN) / (TV_Z_MAX - TV_Z_MIN), 0.0, 1.0);
      float v = clamp((vPos.y - TV_Y_MIN) / (TV_Y_MAX - TV_Y_MIN), 0.0, 1.0);
      gl_FragColor = texture2D(map2, vec2(u, v));
    } else {
      vec2 uv = (vUv - PC_UV_MIN) / (PC_UV_MAX - PC_UV_MIN);
      gl_FragColor = texture2D(map, uv);
    }
  }
`

// ── PC screen constants ───────────────────────────────────────────────────────
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
const CX = CW / 2 - 100

// ── TV screen constants ───────────────────────────────────────────────────────
const TW = 1024
const TH = 768
const G_TV    = '#00ff88'
const G2_TV   = '#00cc6a'
const DIM_TV  = '#009944'
const FAINT_TV = '#005528'

// ── Shared drawing helpers ────────────────────────────────────────────────────
function drawScanlines(ctx, w, h) {
  for (let y = 0; y < h; y += 4) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    ctx.fillRect(0, y, w, 1)
  }
}
function drawVignette(ctx, w, h) {
  const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(0,0,0,0.45)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, w, h)
}

// ── PC screen draw ────────────────────────────────────────────────────────────
function drawPC(ctx, tick, booted, transcript) {
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
    if (Math.floor(tick / 30) % 2 === 0) {
      ctx.font = '16px "Courier New", monospace'
      ctx.fillStyle = '#00ff88'
      ctx.textAlign = 'center'
      ctx.fillText('CLICK ANYWHERE TO CONTINUE', CX, startY + totalH + 28)
    }
  } else {
    const fontSize = 11
    const lineH    = fontSize + 5
    const padX     = 18
    const padY     = 16
    const maxLines = Math.floor((CH - padY * 2) / lineH)
    ctx.font      = `${fontSize}px "Courier New", monospace`
    ctx.textAlign = 'left'
    const visible = transcript.slice(-maxLines)
    visible.forEach((entry, i) => {
      ctx.fillStyle = entry.color || '#00cc00'
      ctx.fillText(entry.text || '', padX, padY + i * lineH + fontSize)
    })
    if (Math.floor(tick / 25) % 2 === 0) {
      ctx.fillStyle = '#00ff00'
      const curY = padY + visible.length * lineH
      ctx.fillRect(padX, curY, 7, fontSize + 2)
    }
  }

  drawScanlines(ctx, CW, CH)
  drawVignette(ctx, CW, CH)
}

// ── TV grid draw ──────────────────────────────────────────────────────────────
function drawGridOnCanvas(ctx, grid) {
  const { rule_name, columns } = grid
  const padX   = 48
  const padY   = 60
  const rowH   = 58
  const cellW  = Math.max(64, Math.min(120, Math.floor((TW - padX * 2 - 36) / columns.length)))
  const labelW = 36

  // Rule name
  ctx.font      = 'bold 22px "Courier New", monospace'
  ctx.fillStyle = G_TV
  ctx.textAlign = 'left'
  ctx.shadowColor = G_TV
  ctx.shadowBlur  = 8
  ctx.fillText(rule_name, padX, padY)
  ctx.shadowBlur = 0

  // Separator
  ctx.fillStyle = FAINT_TV
  ctx.fillRect(padX, padY + 10, TW - padX * 2, 1)

  const rowLabels = ['V', 'K', 'T']
  const rowColors = [G2_TV, DIM_TV, G_TV]
  const startY = padY + 32

  rowLabels.forEach((label, ri) => {
    const y = startY + ri * rowH

    // Row label
    ctx.font      = `bold 16px "Courier New", monospace`
    ctx.fillStyle = G_TV
    ctx.textAlign = 'center'
    ctx.fillText(label, padX + labelW / 2, y + 20)

    // Vertical separator after label
    ctx.fillStyle = FAINT_TV
    ctx.fillRect(padX + labelW, y - 4, 1, rowH - 4)

    // Cells
    columns.forEach((col, ci) => {
      const cellX = padX + labelW + ci * cellW
      const value = ri === 0 ? col.formula : ri === 1 ? col.index : col.type

      ctx.font      = `14px "Courier New", monospace`
      ctx.fillStyle = rowColors[ri]
      ctx.textAlign = 'center'
      ctx.fillText(value || (ri === 1 ? '' : '·'), cellX + cellW / 2, y + 20)

      // Vertical cell separator
      if (ci < columns.length - 1) {
        ctx.fillStyle = FAINT_TV
        ctx.fillRect(cellX + cellW, y - 4, 1, rowH - 4)
      }
    })

    // Horizontal separator between rows
    if (ri < rowLabels.length - 1) {
      ctx.fillStyle = FAINT_TV
      ctx.fillRect(padX, y + rowH - 8, TW - padX * 2, 1)
    }
  })

  // Column index numbers at bottom
  const noteY = startY + rowLabels.length * rowH + 8
  ctx.font      = '11px "Courier New", monospace'
  ctx.fillStyle = FAINT_TV
  ctx.textAlign = 'left'
  ctx.fillText(`${columns.length} operand${columns.length !== 1 ? 's' : ''}  ·  Konrad Zuse notation  ·  KalKyl v1.0`, padX, noteY)
}

// ── TV screen draw ────────────────────────────────────────────────────────────
// `time` is clock.elapsedTime in seconds — used so the PointLight can sync via the same formula
function drawTV(ctx, time, tvMode, gridData) {
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, TW, TH)

  if (tvMode === 'alert') {
    // Blink at 1.5 Hz: on for 333 ms, off for 333 ms
    const on = Math.floor(time * 3) % 2 === 0
    const cx = TW * 0.5    // centred
    if (on) {
      ctx.font         = 'bold 160px Impact, Arial Black, sans-serif'
      ctx.fillStyle    = G_TV
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.shadowColor  = G_TV
      ctx.shadowBlur   = 50
      ctx.fillText('!!', cx, TH / 2 + 60)
      ctx.shadowBlur   = 0
      ctx.textBaseline = 'alphabetic'
    }
    ctx.font      = '13px "Courier New", monospace'
    ctx.fillStyle = on ? DIM_TV : FAINT_TV
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText('PLANKALKÜL GRID READY', cx, TH / 2 + 90)
    ctx.font      = '11px "Courier New", monospace'
    ctx.fillStyle = FAINT_TV
    ctx.fillText('[ click to view ]', cx, TH / 2 + 114)
  } else if (tvMode === 'grid' && gridData) {
    drawGridOnCanvas(ctx, gridData)
  }

  drawScanlines(ctx, TW, TH)
  drawVignette(ctx, TW, TH)
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ScreenDisplay({ booted, transcript, gridData, tvMode }) {
  const { scene } = useGLTF('/retro_room.glb')

  const pcCanvasRef   = useRef(null)
  const tvCanvasRef   = useRef(null)
  const pcTexRef      = useRef(null)
  const tvTexRef      = useRef(null)
  const tickRef       = useRef(0)
  const bootedRef     = useRef(booted)
  const transcriptRef = useRef(transcript)
  const gridDataRef   = useRef(gridData)
  const tvModeRef     = useRef(tvMode)

  useEffect(() => { bootedRef.current     = booted    }, [booted])
  useEffect(() => { transcriptRef.current = transcript }, [transcript])
  useEffect(() => { gridDataRef.current   = gridData   }, [gridData])
  useEffect(() => { tvModeRef.current     = tvMode     }, [tvMode])

  useEffect(() => {
    const pcCanvas = document.createElement('canvas')
    pcCanvas.width  = CW
    pcCanvas.height = CH
    pcCanvasRef.current = pcCanvas

    const tvCanvas = document.createElement('canvas')
    tvCanvas.width  = TW
    tvCanvas.height = TH
    tvCanvasRef.current = tvCanvas

    const pcTex = new CanvasTexture(pcCanvas)
    const tvTex = new CanvasTexture(tvCanvas)
    pcTex.colorSpace = SRGBColorSpace
    tvTex.colorSpace = SRGBColorSpace
    pcTexRef.current = pcTex
    tvTexRef.current = tvTex

    scene.traverse((obj) => {
      if (obj.name !== 'screen_glass_glass_0') return
      obj.material = new ShaderMaterial({
        uniforms: {
          map:  { value: pcTex },
          map2: { value: tvTex },
        },
        vertexShader:   VERT,
        fragmentShader: FRAG,
        toneMapped:     false,
      })
    })

    return () => { pcTex.dispose(); tvTex.dispose() }
  }, [scene])

  useFrame((state) => {
    if (!pcCanvasRef.current || !tvCanvasRef.current) return
    tickRef.current++
    const tick = tickRef.current
    const time = state.clock.elapsedTime

    const pcCtx = pcCanvasRef.current.getContext('2d')
    drawPC(pcCtx, tick, bootedRef.current, transcriptRef.current)
    pcTexRef.current.needsUpdate = true

    const tvCtx = tvCanvasRef.current.getContext('2d')
    drawTV(tvCtx, time, tvModeRef.current || 'blank', gridDataRef.current)
    tvTexRef.current.needsUpdate = true
  })

  return null
}
