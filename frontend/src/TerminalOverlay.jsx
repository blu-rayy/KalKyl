import { useState, useEffect, useRef } from 'react'

// ─── Audio ────────────────────────────────────────────────────────────────────
let _ctx = null
function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}
function playNoise(duration, gain = 0.05) {
  try {
    const ctx = ac()
    const len = Math.floor(ctx.sampleRate * duration)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d   = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len)
    const src = ctx.createBufferSource()
    const g   = ctx.createGain()
    src.buffer = buf; g.gain.value = gain
    src.connect(g); g.connect(ctx.destination); src.start()
  } catch {}
}
function playClick()     { playNoise(0.022, 0.055) }
function playCRTStatic() { playNoise(0.38,  0.07)  }
function playTone(freq, dur, type = 'square', gain = 0.07) {
  try {
    const ctx = ac()
    const osc = ctx.createOscillator()
    const g   = ctx.createGain()
    osc.type = type; osc.frequency.value = freq
    g.gain.setValueAtTime(gain, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur)
    osc.connect(g); g.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + dur)
  } catch {}
}
function playPass() { playTone(660, 0.1); setTimeout(() => playTone(880, 0.18), 110) }
function playFail() { playTone(200, 0.35, 'sawtooth', 0.1) }
function playPrintSFX() {
  try {
    // Dot-matrix rhythmic noise bursts
    for (let i = 0; i < 10; i++) setTimeout(() => playNoise(0.018, 0.038), i * 52)
    // Mechanical thump at end
    setTimeout(() => {
      const ctx = ac()
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = 'triangle'; osc.frequency.value = 95
      g.gain.setValueAtTime(0.08, ctx.currentTime)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.connect(g); g.connect(ctx.destination)
      osc.start(); osc.stop(ctx.currentTime + 0.2)
    }, 560)
  } catch {}
}
function playBootSFX() {
  try {
    const ctx = ac()

    // Power-on capacitor burst
    playNoise(0.18, 0.09)

    // Low hum builds up then fades
    setTimeout(() => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = 'sine'; osc.frequency.setValueAtTime(55, ctx.currentTime)
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 1.2)
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 0.4)
      g.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 1.2)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8)
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.8)
    }, 180)

    // POST beeps — one per [OK] line, spaced to match animation delays
    const okFreqs = [523, 554, 587, 622, 659, 698]
    const okOffsets = [1600, 1920, 2220, 2560, 2840, 3160]
    okOffsets.forEach((ms, i) => {
      setTimeout(() => playTone(okFreqs[i], 0.055, 'square', 0.045), ms)
    })

    // Rising sweep during info section
    setTimeout(() => {
      const osc = ctx.createOscillator(); const g = ctx.createGain()
      osc.type = 'sine'; osc.frequency.setValueAtTime(180, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 1.4)
      g.gain.setValueAtTime(0, ctx.currentTime)
      g.gain.linearRampToValueAtTime(0.035, ctx.currentTime + 0.3)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6)
      osc.connect(g); g.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 1.6)
    }, 3400)

    // Ready chime — three ascending notes
    setTimeout(() => {
      playTone(523, 0.14, 'sine', 0.07)
      setTimeout(() => playTone(659, 0.14, 'sine', 0.07), 130)
      setTimeout(() => playTone(784, 0.28, 'sine', 0.08), 260)
    }, 5200)

  } catch {}
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const G     = '#00ff88'   // bright mint — prompt, active
const G2    = '#00cc6a'   // output text
const DIM   = '#009944'   // dim green
const FAINT = '#005528'   // very dim — separators, hints
const RED   = '#ff3333'   // error
const YEL   = '#ffff33'   // warning

// ─── Official test cases ──────────────────────────────────────────────────────
const TEST_CASES = [
  { label: 'TC1', code: '[ 10 + 5.5 => gleitkomma R_output ]', desc: 'Happy path — type promotion' },
  { label: 'TC2', code: '100 => zahl Z_1 ]',                   desc: 'Missing initiator [ ' },
  { label: 'TC3', code: '[ "Civiq" => zahl Z_1 ]',             desc: 'Type mismatch + missing m*' },
  { label: 'TC4', code: '[ 10 $ 5 => zahl Z_1 ]',             desc: 'Unknown symbol $' },
]

// ─── Extended example cases ────────────────────────────────────────────────────
const EXAMPLE_CASES = [
  {
    label: 'RCV',
    code:  '10 $$ 5.5 => gleitkomma R_calc ]',
    desc:  'Recovery — missing [ (phrase-level) + $$ symbols (panic mode), promotion survives',
  },
  {
    label: 'CTL',
    code:  '[ 10 => zahl R_result ] [ wenn 5 > 3 -> zeige R_result ]',
    desc:  'Control — multi-statement: assign then wenn condition checks and outputs R_result',
  },
  {
    label: 'OBJ',
    code:  '[ lese => objekt V_Template ] [ bau V_Template => objekt Z_obj ]',
    desc:  'OOP — lese opens input channel, bau instantiates object from V_ class template',
  },
  {
    label: 'MTH',
    code:  '[ 10 * 2 + 5.0 / 2.5 => gleitkomma R_calc ]',
    desc:  'Math — complex expression: No-Loss division + int/float promotion in one statement',
  },
  {
    label: 'DIM',
    code:  '[ 10*wort "HelloWorld" => 10*wort R_banner ]',
    desc:  'Dimensional string — m*wort prefix enforces exact character-count memory slot',
  },
]

function TCButton({ label, code, desc, onLoad }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => { onLoad(code); playClick() }}
      title={`${desc}\n${code}`}
      style={{
        color: hover ? G : DIM,
        textShadow: hover ? `0 0 10px ${G}, 0 0 22px ${G}` : 'none',
        cursor: 'pointer',
        marginRight: '18px',
        userSelect: 'none',
        fontWeight: hover ? 'bold' : 'normal',
        transition: 'color 0.1s, text-shadow 0.1s',
        letterSpacing: '0.06em',
      }}
    >
      {label}
    </span>
  )
}

// ─── Line classifier ──────────────────────────────────────────────────────────
function lineColor(line) {
  if (/FATAL|halted/i.test(line)) return RED
  if (/\bFAIL\b/.test(line))     return RED
  if (/\bPASS\b/.test(line))     return G
  if (/warning/i.test(line))     return YEL
  if (/^={3,}/.test(line.trim())) return FAINT
  if (/^\+[-+]+\+/.test(line))   return DIM   // table borders
  if (/^\|/.test(line))           return G2    // table rows
  return G2
}

function isFatal(line) { return /FATAL|halted/i.test(line) }

// ─── Compiler terminal ────────────────────────────────────────────────────────
function CompilerTerminal({ transcript, setTranscript, onGridReady }) {
  const PROMPT = '[kalkyl@localhost ~]$'
  const [revealTo, setRevealTo]   = useState(() => transcript.length)
  const [src, setSrc]             = useState('')
  const [loading, setLoading]     = useState(false)
  const [shaking, setShaking]     = useState(false)
  const [gridPrompt, setGridPrompt] = useState(false)
  const [gridLoading, setGridLoading] = useState(false)
  const lastSrcRef = useRef(null)

  const inputRef  = useRef()
  const scrollRef = useRef()
  const timer     = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  // Typewriter: reveal one line at a time
  useEffect(() => {
    if (revealTo >= transcript.length) return
    timer.current = setTimeout(() => setRevealTo(r => r + 1), 45)
    return () => clearTimeout(timer.current)
  }, [revealTo, transcript.length])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [revealTo])

  async function sendToGrid() {
    if (!lastSrcRef.current || gridLoading) return
    setGridPrompt(false)
    setGridLoading(true)
    playPrintSFX()
    try {
      const res  = await fetch('http://localhost:8080/grid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: lastSrcRef.current }),
      })
      const data = await res.json()
      if (data.grid) {
        onGridReady(data.grid)
        setTranscript(prev => [...prev,
          { text: '  [GRID] Plankalkül grid sent to secondary display.', color: DIM },
          { text: '', color: FAINT },
        ])
      } else {
        setTranscript(prev => [...prev,
          { text: '  [GRID] Grid unavailable — statement must fully PASS all stages.', color: RED },
          { text: '', color: FAINT },
        ])
      }
    } catch {
      setTranscript(prev => [...prev,
        { text: '  [GRID] Error: could not reach server.', color: RED },
        { text: '', color: FAINT },
      ])
    } finally {
      setGridLoading(false)
      inputRef.current?.focus()
    }
  }

  async function compile() {
    if (!src.trim() || loading) return
    const cmd = src.trim()
    setSrc('')
    setGridPrompt(false)

    // Handle built-in commands
    if (cmd === 'clear') {
      const empty = []
      setTranscript(empty)
      setRevealTo(0)
      return
    }

    // Append prompt + command to transcript immediately
    const cmdLine = { text: `${PROMPT} ${cmd}`, color: G, cmd: true }
    setTranscript(prev => {
      const next = [...prev, cmdLine]
      setRevealTo(next.length) // show cmd instantly
      return next
    })

    setLoading(true)
    try {
      const res  = await fetch('http://localhost:8080/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: cmd }),
      })
      const data = await res.json()
      const raw  = data.output
      const fail = /FATAL|halted|FAIL/i.test(raw)

      const newLines = raw.split('\n').flatMap(line => {
        // Split [RECOVERY] onto its own line
        const parts = line.split(/(?=\[RECOVERY\])/)
        return parts.map(part => ({
          text: part.trimEnd(),
          color: lineColor(part),
          fatal: isFatal(part),
        }))
      })
      newLines.push({ text: '', color: FAINT })

      setTranscript(prev => [...prev, ...newLines])
      // revealTo stays, typewriter will catch up

      if (fail) {
        playFail()
        setShaking(true); setTimeout(() => setShaking(false), 550)
      } else {
        playPass()
        lastSrcRef.current = cmd
        setGridPrompt(true)
      }
    } catch {
      const errLines = [
        { text: 'bash: connect: Connection refused', color: RED },
        { text: 'ERROR: KalKyl server not reachable. Run: python server.py', color: RED },
        { text: '', color: FAINT },
      ]
      setTranscript(prev => [...prev, ...errLines])
      playFail()
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function onKeyDown(e) {
    if (e.ctrlKey && e.key === 'x') return  // let Ctrl+X bubble to overlay close handler
    if ((e.key === 'g' || e.key === 'G') && gridPrompt && !e.ctrlKey && !e.altKey && !src) {
      e.preventDefault(); sendToGrid(); return
    }
    playClick()
    if (e.key === 'Enter') { e.preventDefault(); compile() }
    e.stopPropagation()
  }


  const visible = transcript.slice(0, revealTo)

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', fontFamily: '"Courier New", monospace', fontSize: '12px' }}
    >
      {/* ── System bar ───────────────────────────────────────────────────────── */}
      <div style={{ color: FAINT, marginBottom: '4px', letterSpacing: '0.04em' }}>
        ─── KalKyl OS  v1.0 ─────────────────────────────────────────── Ctrl+X to exit ───
      </div>

      {/* ── Test case bar ────────────────────────────────────────────────────── */}
      <div style={{ color: FAINT, marginBottom: '2px' }}>
        LOAD:&nbsp;&nbsp;
        {TEST_CASES.map(tc => (
          <TCButton
            key={tc.label}
            {...tc}
            onLoad={code => { setSrc(code); setTimeout(() => inputRef.current?.focus(), 0) }}
          />
        ))}
      </div>
      <div style={{ color: FAINT, marginBottom: '2px' }}>
        {'  EX:  '}
        {EXAMPLE_CASES.map(ex => (
          <TCButton
            key={ex.label}
            {...ex}
            onLoad={code => { setSrc(code); setTimeout(() => inputRef.current?.focus(), 0) }}
          />
        ))}
      </div>
      <div style={{ color: FAINT, marginBottom: '10px' }}>
        {'─'.repeat(64)}
      </div>

      {/* ── Scrolling transcript ─────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: 'scroll',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          position: 'relative',
          animation: shaking ? 'kk-shake 0.5s ease' : 'none',
        }}
      >
        {visible.map((entry, i) => {
          const tagMatch = (entry.text || '').match(/^(\[\w+\] )/)
          const indent = tagMatch ? `${tagMatch[1].length}ch` : '0'
          return (
          <div
            key={i}
            style={{
              color: entry.color || G2,
              lineHeight: 1.55,
              textShadow: entry.fatal ? `0 0 6px ${RED}` : undefined,
              animation: entry.fatal ? 'kk-flicker 0.12s ease 3' : undefined,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              paddingLeft: indent,
              textIndent: indent === '0' ? '0' : `-${indent}`,
            }}
          >
            {entry.text || '\u00a0'}
          </div>
          )
        })}

        {/* Typewriter cursor while revealing */}
        {revealTo < transcript.length && (
          <span style={{
            display: 'inline-block', width: '8px', height: '13px',
            background: G, verticalAlign: 'text-bottom',
            animation: 'kk-blink 0.5s step-start infinite',
          }} />
        )}
      </div>

      {/* ── Grid export prompt ───────────────────────────────────────────────── */}
      {(gridPrompt || gridLoading) && (
        <div style={{
          color: FAINT, fontSize: '11px', paddingBottom: '4px',
          flexShrink: 0, letterSpacing: '0.04em',
        }}>
          {'  ► '}
          <span
            onClick={gridPrompt && !gridLoading ? sendToGrid : undefined}
            style={{
              color: gridLoading ? FAINT : G,
              cursor: gridLoading ? 'default' : 'pointer',
              textDecoration: gridLoading ? 'none' : 'underline',
              animation: gridLoading ? 'kk-blink 0.45s step-start infinite' : 'none',
            }}
          >
            {gridLoading ? 'EXPORTING...' : '[G] Export to Plankalkül Grid'}
          </span>
          {!gridLoading && (
            <span style={{ color: FAINT }}>{' — send to secondary display'}</span>
          )}
        </div>
      )}

      {/* ── Input prompt ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        borderTop: `1px solid ${FAINT}`,
        paddingTop: '8px',
        flexShrink: 0,
        marginTop: '4px',
      }}>
        <span style={{ color: G, whiteSpace: 'nowrap', marginRight: '8px', textShadow: `0 0 6px ${G}` }}>
          {PROMPT}
        </span>
        <input
          ref={inputRef}
          value={src}
          onChange={e => setSrc(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={loading ? 'processing...' : ''}
          disabled={loading}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: G,
            fontFamily: '"Courier New", monospace',
            fontSize: '12px',
            caretColor: G,
            letterSpacing: '0.02em',
          }}
        />
        <span style={{
          color: FAINT, fontSize: '10px', whiteSpace: 'nowrap',
          marginLeft: '12px', letterSpacing: '0.06em',
          animation: loading ? 'kk-blink 0.45s step-start infinite' : 'none',
        }}>
          {loading ? 'PROCESSING...' : '[ENTER]'}
        </span>
      </div>
    </div>
  )
}

// ─── Boot sequence ────────────────────────────────────────────────────────────
const BOOT_LINES = [
  { text: '',                                                                         ms: 0    },
  { text: 'KalKyl Compiler  —  System Bootstrap',                                    ms: 160, color: G    },
  { text: '─'.repeat(54),                                                             ms: 60,  color: FAINT},
  { text: '',                                                                         ms: 40   },
  { text: '  BIOS v1.0  |  RAM: 64 KB  |  Arch: Plankalkül-Z3',                     ms: 220, color: DIM  },
  { text: '',                                                                         ms: 80   },
  { text: '  POST sequence...',                                                       ms: 240, color: DIM  },
  { text: '  Initializing memory subsystem ........... [  OK  ]',                    ms: 360, color: G2   },
  { text: '  Loading lexical analysis engine ......... [  OK  ]',                    ms: 300, color: G2   },
  { text: '  Mounting grammar rule table ............. [  OK  ]',                    ms: 280, color: G2   },
  { text: '  Binding semantic type checker ........... [  OK  ]',                    ms: 320, color: G2   },
  { text: '  Registering symbol table ................ [  OK  ]',                    ms: 260, color: G2   },
  { text: '  Explainability layer online ............. [  OK  ]',                    ms: 290, color: G2   },
  { text: '',                                                                         ms: 80   },
  { text: '─'.repeat(54),                                                             ms: 60,  color: FAINT},
  { text: '',                                                                         ms: 220  },
  { text: '                    KalKyl  v1.0',                                         ms: 120, color: G    },
  { text: '        A Plankalkül-inspired expression language',                        ms: 90,  color: G2   },
  { text: '            Structured · Type-safe · Explainable',                        ms: 80,  color: G2   },
  { text: '',                                                                         ms: 80   },
  { text: '        ─────────────────────────────────────────',                       ms: 60,  color: FAINT},
  { text: '',                                                                         ms: 80   },
  { text: '        In Compliance with   CS0035',                                      ms: 110, color: DIM  },
  { text: '        Submitted by         Kristian David R. Bautista',                 ms: 90,  color: DIM  },
  { text: '        Instructor           Justine Jude C. Pura',                       ms: 90,  color: DIM  },
  { text: '',                                                                         ms: 100  },
  { text: '─'.repeat(54),                                                             ms: 60,  color: FAINT},
  { text: '',                                                                         ms: 200  },
  { text: '  >> All systems nominal. Terminal ready.',                                ms: 140, color: G    },
]

function BootSequence({ onDone }) {
  const [shown, setShown] = useState(0)
  const scrollRef = useRef()

  useEffect(() => {
    if (shown >= BOOT_LINES.length) { onDone(); return }
    const t = setTimeout(() => setShown(s => s + 1), BOOT_LINES[shown]?.ms ?? 100)
    return () => clearTimeout(t)
  }, [shown])

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [shown])

  const done = shown >= BOOT_LINES.length

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'scroll',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        fontFamily: '"Courier New", monospace',
        fontSize: '12px',
      }}
    >
      {BOOT_LINES.slice(0, shown).map((line, i) => (
        <div key={i} style={{ color: line.color || G2, lineHeight: 1.6 }}>
          {line.text || '\u00a0'}
        </div>
      ))}
      {!done && (
        <span style={{
          display: 'inline-block', width: '8px', height: '13px',
          background: G, verticalAlign: 'text-bottom',
          animation: 'kk-blink 0.5s step-start infinite',
        }} />
      )}
      {done && (
        <p style={{
          margin: '14px 0 0 0',
          textAlign: 'center',
          fontSize: '13px',
          color: G,
          letterSpacing: '0.2em',
          animation: 'kk-blink 1.1s step-start infinite',
          textShadow: `0 0 6px rgba(0,255,136,0.5)`,
        }}>
          PRESS ANY KEY TO CONTINUE
        </p>
      )}
    </div>
  )
}

// ─── ASCII boot art ───────────────────────────────────────────────────────────
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

// ─── Main overlay ─────────────────────────────────────────────────────────────
export function TerminalOverlay({ booted, onBoot, onClose, transcript, setTranscript, onGridReady }) {
  const [visible, setVisible] = useState(false)
  const [stage, setStage]     = useState(booted ? 'terminal' : 'logo')

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    playCRTStatic()
    return () => cancelAnimationFrame(id)
  }, [])

  const bootDoneRef = useRef(false)

  function startBoot()     { playClick(); playBootSFX(); setStage('boot') }
  function finishBoot()    { bootDoneRef.current = true }
  function startTerminal() { playClick(); playCRTStatic(); setStage('terminal'); onBoot() }
  function close()         { setVisible(false); setTimeout(onClose, 400) }

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.key === 'x') { e.preventDefault(); close(); return }
      if (stage === 'logo') { startBoot(); return }
      if (stage === 'boot' && bootDoneRef.current) startTerminal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stage])

  return (
    <div
      onClick={stage === 'logo' ? startBoot : (stage === 'boot' && bootDoneRef.current) ? startTerminal : undefined}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        background: 'rgba(0,0,0,0.55)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease',
      }}
    >
      <div
        onClick={stage === 'terminal' ? e => e.stopPropagation() : undefined}
        style={{
          position: 'relative',
          background: '#000',
          border: '1px solid #004422',
          borderRadius: '0',
          padding: '28px 32px',
          width: '740px',
          height: '560px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          boxShadow: '0 0 0 1px #001a0d, 0 0 40px rgba(0,255,136,0.07)',
        }}
      >
        {/* CRT scanlines */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
          background: `repeating-linear-gradient(
            0deg, transparent, transparent 2px,
            rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px
          )`,
        }} />
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
        }} />

        {/* Content */}
        {stage === 'logo' && (
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            flex: 1, position: 'relative', zIndex: 0,
          }}>
            <pre style={{
              fontFamily: '"Courier New", monospace',
              fontSize: '11px',
              color: '#00ff88',
              lineHeight: 1.3,
              margin: 0,
              textShadow: '0 0 8px rgba(0,255,136,0.4)',
              whiteSpace: 'pre',
            }}>
              {ASCII_LINES.join('\n')}
            </pre>
            <p style={{
              textAlign: 'center',
              marginTop: '24px', marginBottom: 0,
              fontFamily: '"Courier New", monospace',
              fontSize: '13px',
              color: '#00ff88',
              letterSpacing: '0.2em',
              animation: 'kk-blink 1.1s step-start infinite',
              textShadow: '0 0 6px rgba(0,255,136,0.5)',
            }}>
              PRESS ANY KEY TO CONTINUE
            </p>
          </div>
        )}

        {stage === 'boot' && <BootSequence onDone={finishBoot} />}

        {stage === 'terminal' && (
          <CompilerTerminal transcript={transcript} setTranscript={setTranscript} onGridReady={onGridReady} />
        )}
      </div>
    </div>
  )
}
