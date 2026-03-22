import sys
import os
import re
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

from lexer import KalKylLexer
from parser import KalKylParser
from semantics import KalKylSemantics
from symbol_table import KalKylSymbolTable
from explainability.narrator import KalKylNarrator
from utils.plankalkul_grid import build_grid


def _extract_statements(source):
    """Split source into individual [ ... ] blocks. Falls back to full source if none found."""
    stmts = re.findall(r'\[[^\[\]]*\]', source.strip())
    return stmts if stmts else [source.strip()]


def _run_one(source, lexer, parser, semantic, narrator, st):
    tokens, lex_narr, lex_status = lexer.tokenize(source)

    if lex_status == "FAIL":
        return narrator.format(lex_narr, [], [], lex_status, None, None)

    parse_narr, parse_status, matched_rule = parser.parse(tokens)

    if parse_status == "FAIL":
        return narrator.format(lex_narr, parse_narr, [], lex_status, parse_status, None)

    sem_narr, sem_status, st = semantic.analyze(tokens, matched_rule, st)

    return narrator.format(
        lex_narr, parse_narr, sem_narr,
        lex_status, parse_status, sem_status,
        symbol_table=st
    )


def run(source: str) -> str:
    lexer    = KalKylLexer()
    parser   = KalKylParser()
    semantic = KalKylSemantics()
    narrator = KalKylNarrator()
    st       = KalKylSymbolTable()

    stmts = _extract_statements(source)

    if len(stmts) == 1:
        return _run_one(stmts[0], lexer, parser, semantic, narrator, st)

    outputs = []
    for i, stmt in enumerate(stmts, 1):
        out = _run_one(stmt, lexer, parser, semantic, narrator, st)
        outputs.append(f"── Statement {i} ──────────────────────────────────────\n{out}")

    return '\n\n'.join(outputs)


def compile_for_grid(source: str):
    """Run pipeline and return (output_text, last_pass_grid_or_None).
    For multi-statement input, returns the grid of the last PASS statement.
    Statements are run in sequence with a shared symbol table so later
    statements see bindings from earlier ones (matching run() semantics)."""
    text = run(source)   # canonical output (handles all edge cases)

    lexer    = KalKylLexer()
    parser   = KalKylParser()
    semantic = KalKylSemantics()
    st       = KalKylSymbolTable()

    last_grid = None
    for stmt in _extract_statements(source):
        try:
            toks, _, lex_status = lexer.tokenize(stmt)
            if lex_status == 'FAIL':
                continue
            _, parse_status, matched_rule = parser.parse(toks)
            if parse_status == 'FAIL':
                continue
            _, sem_status, st = semantic.analyze(toks, matched_rule, st)
            if sem_status == 'PASS':
                last_grid = build_grid(toks, matched_rule, st)
        except Exception:
            pass   # don't let grid errors break the text output

    return text, last_grid


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python main.py \"[ source code here ]\"")
        print()
        print("Examples:")
        print("  python main.py \"[ 10 + 5.5 => gleitkomma R_output ]\"")
        print("  python main.py \"100 => zahl Z_1 ]\"")
        print("  python main.py '[ \"Civiq\" => zahl Z_1 ]'")
        print("  python main.py \"[ 10 $ 5 => zahl Z_1 ]\"")
        sys.exit(1)
    source = ' '.join(sys.argv[1:])
    print(run(source))
