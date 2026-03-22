import { useState, useEffect } from 'react'

// Each section's content is an array of blocks.
// { type: 'p', text } — justified prose paragraph
// { type: 'code', text } — monospace pre block, no justify
// { type: 'spacer' } — small vertical gap

const SECTIONS = [
  {
    id: 'intro',
    title: 'I.  What Is KalKyl?',
    blocks: [
      { type: 'p', text: `In the early 1940s, a German engineer named Konrad Zuse sat in a bombed-out apartment in Berlin and wrote down the rules for the world's first high-level programming language. He called it Plankalkül — "Plan Calculus." No computer powerful enough to run it yet existed. It was, in every sense, a language written for a machine that had not been invented.` },
      { type: 'p', text: `The manuscript was finished by 1945. It was not published until 1972. By then, FORTRAN, COBOL, and LISP had already shaped the world. Plankalkül was forgotten before it ever had a chance to run.` },
      { type: 'p', text: `KalKyl is an attempt to give it one.` },
      { type: 'p', text: `This compiler does not try to rebuild Plankalkül in full. Instead, it takes its most essential idea: that a program is a precise, readable statement about what you want a machine to do, written in a language closer to mathematics than to circuitry. KalKyl lets you write one such statement at a time, run it through a full four-stage compiler pipeline — Lexer, Parser, Semantics, Symbol Table — and watch the machine reason about it step by step, out loud, in plain language.` },
      { type: 'p', text: `Think of it as Zuse's notebook, finally switched on.` },
    ],
  },
  {
    id: 'writing',
    title: 'II.  Writing a Statement',
    blocks: [
      { type: 'p', text: `Every KalKyl statement is a self-contained declaration wrapped in square brackets. Inside, you describe a value — a number, a calculation, or a piece of text — and tell the machine what to call it and what kind of thing it is. Nothing more is required; nothing less will do.` },
      { type: 'p', text: `The structure always follows this pattern:` },
      { type: 'code', text: `  [ value  =>  type  Name ]` },
      { type: 'p', text: `Three examples, each showing a different use:` },
      { type: 'code', text: `  [ 100 => zahl Z_score ]
    Store the whole number 100. Name it Z_score.

  [ 10 + 5.5 => gleitkomma R_output ]
    Add 10 and 5.5. Store the decimal result as R_output.

  [ "Civiq" => wort W_label ]
    Store the text "Civiq" as W_label.` },
      { type: 'p', text: `Names must begin with a capital letter. Type keywords come from German — as Zuse intended: zahl (number), gleitkomma (floating-point decimal), wort (word / text). Arithmetic operators supported are +  −  *  /  %  and $, where $ performs integer modulo division in the Zuse style.` },
    ],
  },
  {
    id: 'design',
    title: 'III.  Design Choices',
    blocks: [
      { type: 'p', text: `Every rule in KalKyl that might seem unusual is a deliberate echo of how Plankalkül thought about programs — not as commands to a machine, but as formal mathematical objects. The design choices below are not arbitrary; each one traces back to something Zuse actually did.` },
      { type: 'code', text: `GERMAN KEYWORDS` },
      { type: 'p', text: `Zuse wrote Plankalkül entirely in German. The type names zahl, gleitkomma, and wort are taken directly from his original notation. This is not decoration. It is a reminder that the language predates the English-dominated computing world we inherit, and that the history of programming is wider than Silicon Valley.` },
      { type: 'code', text: `SQUARE BRACKETS  [ … ]` },
      { type: 'p', text: `Plankalkül used structured, bounded notation to make programs look more like formulae than commands — a self-contained expression set apart from everything around it. KalKyl's square brackets carry that same intention: the statement is a closed mathematical object, not a line in a script.` },
      { type: 'code', text: `CAPITAL-FIRST IDENTIFIERS` },
      { type: 'p', text: `Zuse's variable notation used structured indices to distinguish classes of variables. KalKyl simplifies this into one visible rule: all names begin with a capital letter. It signals immediately that you are naming something permanent, not calling a procedure.` },
      { type: 'code', text: `STRICT TYPE ENFORCEMENT` },
      { type: 'p', text: `Plankalkül had a full type system at a time when most machines had no concept of types whatsoever. KalKyl enforces the same discipline: a decimal value cannot be stored as a whole number; a word cannot be stored as a number. When types conflict, the compiler refuses and explains precisely why — just as Zuse's formalism would have demanded.` },
      { type: 'code', text: `THE ASSIGNMENT ARROW  =>` },
      { type: 'p', text: `Assignment in Plankalkül was directional — a value flows into a variable, not the other way around. The => arrow makes that directionality explicit and readable at a glance, without requiring any prior knowledge of programming syntax to understand it.` },
    ],
  },
  {
    id: 'pipeline',
    title: 'IV.  How the Compiler Works',
    blocks: [
      { type: 'p', text: `When you submit a statement, it travels through four distinct stages. The terminal to your left shows you the full narrative trace of each one — every decision, every check, every reason a stage passes or fails.` },
      { type: 'code', text: `LEXER — Reading the words` },
      { type: 'p', text: `The compiler first breaks your statement into tokens: brackets, values, operators, type keywords, variable names. Each token is classified and labelled. If the lexer encounters a character or sequence it cannot classify — an illegal symbol, a malformed number — it halts immediately and reports exactly what it found and where.` },
      { type: 'code', text: `PARSER — Checking the grammar` },
      { type: 'p', text: `The token sequence is matched against KalKyl's grammar rules. Is the statement structured correctly? Does it open and close with brackets? Is the arrow in the right place, with a type keyword and an identifier after it? A statement that is grammatically malformed does not proceed. The parser names the rule it expected and where the structure broke down.` },
      { type: 'code', text: `SEMANTICS — Checking the meaning` },
      { type: 'p', text: `Grammar alone does not guarantee sense. A statement can be structured correctly and still be meaningless — for example, declaring a decimal value as a whole number (zahl). The semantic stage catches these conflicts: type mismatches, impossible assignments, values that contradict their declared type. It reports each mismatch precisely, in plain language.` },
      { type: 'code', text: `SYMBOL TABLE — Recording what exists` },
      { type: 'p', text: `Every value in a valid statement is catalogued: the raw literals you wrote are interned as internal variables (V_internal_0, V_internal_1, …), and the named variable you declared is registered with its type and computed value. This table is the machine's persistent memory of what the statement declared. It is also what feeds the Plankalkül grid on the monitor to your right.` },
    ],
  },
  {
    id: 'plankalkul',
    title: 'V.  The Plankalkül Grid',
    blocks: [
      { type: 'code', text: `Origins` },
      { type: 'p', text: `When Konrad Zuse designed Plankalkül, he faced a problem no one had faced before: how do you write a program on paper in a way that is both precise enough for a machine and readable enough for a human? Most contemporaries thought of programs as sequences of switches to flip — low-level, positional, invisible to reason. Zuse thought differently.` },
      { type: 'p', text: `His solution was the grid: a two-dimensional table where each column represents one element of a formula, and three rows stack above each other to capture everything the compiler needs to know about that element simultaneously — its value, its positional index, and its type. You read it left to right like a sentence, but on three levels at once, like a musical score.` },
      { type: 'p', text: `This was genuinely radical. No notation like it existed in 1945. It made programs look like structured mathematics rather than machine instructions — and it did so before any machine was powerful enough to execute them.` },
      { type: 'code', text: `KalKyl's Grid` },
      { type: 'p', text: `Every valid statement you compile produces a Plankalkül grid, displayed on the monitor to the right of this terminal. The three rows are labelled exactly as Zuse labelled them in his 1945 manuscript:` },
      { type: 'code', text: `  V  (Variablen)    the formula — values and operators, left to right
  K  (Komponente)   the index — position or subscript of each part
  T  (Typ)          the type — what kind of value each column holds` },
      { type: 'p', text: `The grid is not merely a visualisation. It is the output format Zuse himself would have recognised. When you compile a statement in KalKyl, you are — briefly — producing the same structured notation he imagined in that Berlin apartment, eighty years ago, waiting for a machine that could finally read it.` },
    ],
  },
]

// Render a section's blocks — prose gets justified, code stays monospace/pre
function SectionContent({ blocks }) {
  return (
    <div>
      {blocks.map((block, i) => {
        if (block.type === 'p') {
          return (
            <p key={i} style={{
              margin: '0 0 14px 0',
              fontSize: '12px',
              lineHeight: '172%',
              color: '#2c1a08',
              textAlign: 'justify',
              fontFamily: '"Courier New", Courier, monospace',
            }}>
              {block.text}
            </p>
          )
        }
        if (block.type === 'code') {
          return (
            <pre key={i} style={{
              margin: '4px 0 12px 0',
              fontSize: '11.5px',
              lineHeight: '160%',
              color: '#5a3010',
              fontFamily: '"Courier New", Courier, monospace',
              whiteSpace: 'pre-wrap',
              background: 'rgba(120,80,20,0.07)',
              borderLeft: '2px solid #c8aa72',
              padding: '6px 10px',
              borderRadius: '1px',
            }}>
              {block.text}
            </pre>
          )
        }
        return <div key={i} style={{ height: '8px' }} />
      })}
    </div>
  )
}

export function VintageDocOverlay({ onClose }) {
  const [visible, setVisible] = useState(false)
  const [activeSection, setActiveSection] = useState('intro')

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' || (e.ctrlKey && e.key === 'x')) {
        e.preventDefault()
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  const section = SECTIONS.find(s => s.id === activeSection) ?? SECTIONS[0]

  return (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        background: 'rgba(10, 6, 2, 0.72)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.35s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '780px',
          height: '580px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxSizing: 'border-box',
          background: 'linear-gradient(160deg, #f2e6c8 0%, #ede0b8 40%, #e8d8a8 100%)',
          boxShadow: `
            0 0 0 1px #b89a60,
            0 0 0 3px #c8aa72,
            0 4px 40px rgba(0,0,0,0.6),
            inset 0 0 80px rgba(120,80,20,0.08)
          `,
          borderRadius: '2px',
          overflow: 'hidden',
          fontFamily: '"Courier New", Courier, monospace',
        }}
      >
        {/* Paper grain overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.6,
        }} />

        {/* Header band */}
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'linear-gradient(90deg, #3d2408 0%, #5c3510 50%, #3d2408 100%)',
          padding: '10px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '2px solid #b89a60',
        }}>
          <div>
            <div style={{ color: '#f2d98a', fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: '2px' }}>
              Zuse Computational Institute  ·  Ref. KK-1945
            </div>
            <div style={{ color: '#f7e8b0', fontSize: '17px', letterSpacing: '0.06em', fontWeight: 'bold' }}>
              KalKyl Language Reference
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#c8aa72', fontSize: '10px', letterSpacing: '0.12em' }}>INTERNAL DOCUMENT</div>
            <div
              onClick={close}
              style={{ color: '#c8aa72', fontSize: '12px', cursor: 'pointer', marginTop: '4px',
                letterSpacing: '0.08em', userSelect: 'none' }}
            >
              [ close ]
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left nav — table of contents */}
          <div style={{
            width: '200px', flexShrink: 0,
            background: 'rgba(120,80,20,0.06)',
            borderRight: '1px solid #c8aa72',
            padding: '16px 0',
            overflowY: 'auto', scrollbarWidth: 'none',
          }}>
            <div style={{ color: '#8b6028', fontSize: '9px', letterSpacing: '0.2em',
              textTransform: 'uppercase', padding: '0 16px 8px', borderBottom: '1px solid #d4b87a' }}>
              Contents
            </div>
            {SECTIONS.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  color: activeSection === s.id ? '#3d2408' : '#7a5520',
                  background: activeSection === s.id ? 'rgba(180,130,50,0.18)' : 'transparent',
                  borderLeft: activeSection === s.id ? '3px solid #8b5e1a' : '3px solid transparent',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  lineHeight: '150%',
                  transition: 'background 0.15s',
                }}
              >
                {s.title}
              </div>
            ))}
          </div>

          {/* Right content */}
          <div style={{
            flex: 1, padding: '24px 28px',
            overflowY: 'auto', scrollbarWidth: 'none',
          }}>
            {/* Section heading rule */}
            <div style={{ color: '#b89a60', fontSize: '11px', marginBottom: '14px',
              letterSpacing: '0.06em', borderBottom: '1px solid #d4b87a', paddingBottom: '8px' }}>
              {section.title}
            </div>

            <SectionContent blocks={section.blocks} />

            {/* Footer */}
            <div style={{
              marginTop: '24px',
              color: '#c8aa72',
              fontSize: '10px',
              letterSpacing: '0.14em',
              borderTop: '1px solid #d4b87a',
              paddingTop: '8px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>KalKyl v1.0</span>
              <span>Ctrl+X to close</span>
            </div>
          </div>
        </div>

        {/* Corner watermark */}
        <div style={{
          position: 'absolute', bottom: 12, left: 16, zIndex: 2,
          color: 'rgba(139,94,26,0.25)', fontSize: '9px', letterSpacing: '0.18em',
          textTransform: 'uppercase', pointerEvents: 'none',
        }}>
          Classified — For Compiler Use Only
        </div>
      </div>
    </div>
  )
}
