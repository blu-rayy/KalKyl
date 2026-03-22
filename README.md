# KalKyl

A Plankalkül-inspired compiler with a 3D retro-room frontend. Written for CS0035 — Programming Languages.

Konrad Zuse designed Plankalkül in 1945 — the world's first high-level programming language — but it was never published until 1972 and never ran on a real machine. KalKyl gives it one.

---

## What It Does

Type a KalKyl statement into the in-world terminal. It travels through a four-stage compiler pipeline and the machine explains every decision out loud:

| Stage | What it does |
|-------|-------------|
| **Lexer** | Tokenizes your statement — brackets, literals, operators, keywords |
| **Parser** | Checks the grammar against KalKyl's rule set |
| **Semantics** | Validates types, enforces Plankalkül's type discipline |
| **Symbol Table** | Records every value with its type, size, and memory offset |

A valid statement also generates a **Plankalkül Grid** — the same two-dimensional V/K/T notation Zuse used in his 1945 manuscript — displayed on the secondary monitor.

---

## Running It

**1. Start the Python compiler server**
```
python server.py
```
Runs on `http://localhost:8080`.

**2. Start the frontend**
```
cd frontend
npm install
npm run dev
```
Opens at `http://localhost:5173`.

Click anywhere in the 3D room to lock the pointer. Walk up to the PC monitor and click to open the terminal.

---

## Official Test Cases

| # | Input | Tests |
|---|-------|-------|
| TC1 | `[ 10 + 5.5 => gleitkomma R_output ]` | Happy path — arithmetic + type promotion |
| TC2 | `100 => zahl Z_1 ]` | Phrase-level recovery — missing `[` auto-inserted |
| TC3 | `[ "Civiq" => zahl Z_1 ]` | Semantic error — raw string without `m*` prefix |
| TC4 | `[ 10 $ 5 => zahl Z_1 ]` | Panic mode recovery — unknown symbol `$` skipped |

---

## Language Syntax

```
[ value => type Name ]
```

- **Types:** `zahl` (integer), `gleitkomma` (float), `wort` (text), `logik` (boolean)
- **Names** must start with a capital letter: `Z_`, `V_`, `R_`
- **Operators:** `+  -  *  /  %  $` (where `$` is Zuse-style integer division)
- **Dimensional strings:** `6*wort "KalKyl"` — exact character-count memory slot

---

## Project Structure

```
server.py               HTTP server (port 8080)
main.py                 Compiler pipeline orchestrator
core/
  lexer.py              Tokenizer
  parser.py             Grammar rule matcher
  semantics.py          Type checker
  symbol_table.py       Symbol registry
  explainability/
    narrator.py         Human-readable output formatter
  utils/
    plankalkul_grid.py  Zuse grid builder
frontend/
  src/
    App.jsx             3D scene + interaction logic
    TerminalOverlay.jsx In-world compiler terminal
    VintageDocOverlay.jsx  Language documentation panel
    ScreenDisplay.jsx   Monitor rendering
    DustParticles.jsx   Ambient particle system
```

---

*Submitted by Kristian David R. Bautista — CS0035, Instructor: Justine Jude C. Pura*
