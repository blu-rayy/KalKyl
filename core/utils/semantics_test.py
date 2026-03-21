# semantics_test.py
# Full test harness for KalKylSemantics
# Mirrors the structure of lexer_test.py and parser_test.py

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from lexer import KalKylLexer
from parser import KalKylParser
from semantics import KalKylSemantics
from symbol_table import KalKylSymbolTable

lexer    = KalKylLexer()
parser   = KalKylParser()
semantic = KalKylSemantics()


def run(label, input_text, expected_status, fresh_table=True, symbol_table=None):
    """
    Run full pipeline: Lexer → Parser → Semantics.
    fresh_table=False allows passing a pre-populated symbol table
    for immutability and persistence tests.
    """
    st = KalKylSymbolTable() if fresh_table else symbol_table

    tokens, lex_narratives, lex_status = lexer.tokenize(input_text)

    print(f"\n{'='*60}")
    print(f"{label}")
    print(f"Input   : {input_text}")
    print(f"Expected: {expected_status}")

    if lex_status == "FAIL":
        print(f"Lex     : FAIL (pipeline stopped)")
        for n in lex_narratives:
            print(f"  {n}")
        result = "FAIL"
    else:
        parse_narratives, parse_status, matched_rule = parser.parse(tokens)

        if parse_status == "FAIL":
            print(f"Lex     : PASS")
            print(f"Parse   : FAIL (pipeline stopped)")
            for n in lex_narratives:
                print(f"  {n}")
            for n in parse_narratives:
                print(f"  {n}")
            result = "FAIL"
        else:
            sem_narratives, sem_status, st = semantic.analyze(tokens, matched_rule, st)
            print(f"Lex     : PASS")
            print(f"Parse   : PASS")
            print(f"Sem     : {sem_status}")
            print("Narratives:")
            for n in lex_narratives:
                print(f"  {n}")
            for n in parse_narratives:
                print(f"  {n}")
            for n in sem_narratives:
                print(f"  {n}")
            print("\nSymbol Table:")
            print(st.display())
            result = sem_status

    match = "PASS" if result == expected_status else "FAIL -- unexpected result"
    print(f"\nResult  : {match}")
    return st


# =============================================================================
# OFFICIAL TEST CASES (TC1–TC4)
# =============================================================================

run(
    "TC1 — Happy Path: Math expression with promotion",
    "[ 10 + 5.5 => gleitkomma R_output ]",
    "PASS"
)

run(
    "TC2 — Phrase-Level Recovery: Missing '[' auto-inserted by parser",
    "100 => zahl Z_1 ]",
    "PASS"
)

run(
    "TC3 — Semantic Error: Raw String Double Violation",
    '[ "Civiq" => zahl Z_1 ]',
    "FAIL"
)

run(
    "TC4 — Panic Mode Recovery: Unknown symbol '$' discarded, scanning resumed",
    "[ 10 $ 5 => zahl Z_1 ]",
    "PASS"
)

# =============================================================================
# ASSIGNMENT — TYPE COMPATIBILITY
# =============================================================================

run(
    "Assignment — Integer to zahl (valid)",
    "[ 100 => zahl V_speed ]",
    "PASS"
)

run(
    "Assignment — Float to gleitkomma (valid)",
    "[ 6.7 => gleitkomma Z_rate ]",
    "PASS"
)

run(
    "Assignment — Integer to gleitkomma (type mismatch)",
    "[ 100 => gleitkomma R_result ]",
    "FAIL"
)

run(
    "Assignment — Float to zahl (type mismatch)",
    "[ 6.7 => zahl R_result ]",
    "FAIL"
)

run(
    "Assignment — Bool to logik (valid)",
    "[ wahr => logik V_flag ]",
    "PASS"
)

run(
    "Assignment — Bool to zahl (type mismatch)",
    "[ wahr => zahl R_result ]",
    "FAIL"
)

# =============================================================================
# PROMOTION RULE
# =============================================================================

run(
    "Promotion — zahl + gleitkomma promotes to gleitkomma (valid)",
    "[ 10 + 5.5 => gleitkomma R_0 ]",
    "PASS"
)

run(
    "Promotion — zahl + gleitkomma assigned to zahl (mismatch after promotion)",
    "[ 10 + 5.5 => zahl R_0 ]",
    "FAIL"
)

# =============================================================================
# DIVISION RULE
# =============================================================================

run(
    "Division — always yields gleitkomma (valid)",
    "[ 10 / 2 => gleitkomma R_result ]",
    "PASS"
)

run(
    "Division — assigned to zahl (type mismatch)",
    "[ 10 / 2 => zahl R_result ]",
    "FAIL"
)

# =============================================================================
# DIMENSIONAL STRING
# =============================================================================

run(
    "STR_LIT — correct dimension (valid)",
    '[ 6*wort "KalKyl" => 6*wort R_name ]',
    "PASS"
)

run(
    "STR_LIT — dimension mismatch (7 declared, 6 actual)",
    '[ 7*wort "KalKyl" => 7*wort R_name ]',
    "FAIL"
)

run(
    "RAW_STR — missing m* prefix into wort (Double Violation)",
    '[ "KalKyl" => wort R_name ]',
    "FAIL"
)

run(
    "RAW_STR — missing m* prefix into zahl (Double Violation)",
    '[ "Civiq" => zahl Z_1 ]',
    "FAIL"
)

# =============================================================================
# LEER (NULL) COMPATIBILITY
# =============================================================================

run(
    "leer — assigned to wort (compatible)",
    "[ leer => wort Z_temp ]",
    "PASS"
)

run(
    "leer — assigned to zahl (compatible)",
    "[ leer => zahl Z_count ]",
    "PASS"
)

run(
    "leer — assigned to logik (compatible)",
    "[ leer => logik Z_flag ]",
    "PASS"
)

# =============================================================================
# R_ RESULT ROUTING VIOLATION
# =============================================================================

run(
    "R_ on left side — result routing violation",
    "[ R_out + 10 => zahl Z_temp ]",
    "FAIL"
)

# =============================================================================
# V_ IMMUTABILITY
# =============================================================================

# Pre-populate symbol table with V_speed then try to overwrite it
st = KalKylSymbolTable()
st.bind('V_speed', 'zahl')

run(
    "V_ immutability — attempt to overwrite locked V_ identifier",
    "[ 200 => zahl V_speed ]",
    "FAIL",
    fresh_table=False,
    symbol_table=st
)

# =============================================================================
# ACTION — zeige
# =============================================================================

# Pre-populate with R_dashboard for zeige test
st_zeige = KalKylSymbolTable()
st_zeige.bind('R_dashboard', 'gleitkomma')

run(
    "zeige — valid R_ identifier in symbol table",
    "[ zeige R_dashboard ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_zeige
)

run(
    "zeige — identifier not in symbol table",
    "[ zeige R_unknown ]",
    "FAIL"
)

run(
    "zeige — non R_ identifier",
    "[ zeige Z_temp ]",
    "FAIL"
)

# =============================================================================
# ACTION — lese
# =============================================================================

run(
    "lese — valid input binding",
    "[ lese => wort V_input ]",
    "PASS"
)

run(
    "lese — dimensional type binding",
    "[ lese => 10*wort V_name ]",
    "PASS"
)

# =============================================================================
# ACTION — bau
# =============================================================================

st_bau = KalKylSymbolTable()
st_bau.bind('V_KrisBan', 'objekt')

run(
    "bau — valid object instantiation",
    "[ bau V_KrisBan => objekt Z_board ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_bau
)

run(
    "bau — source not in symbol table",
    "[ bau V_Unknown => objekt Z_board ]",
    "FAIL"
)

# =============================================================================
# CONTROL FLOW — wenn / solange
# =============================================================================

st_ctrl = KalKylSymbolTable()
st_ctrl.bind('Z_count', 'zahl')

run(
    "wenn — valid condition, operands in symbol table",
    "[ wenn Z_count > 10 -> zeige R_done ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_ctrl
)

run(
    "wenn — identifier not in symbol table",
    "[ wenn Z_unknown > 10 -> zeige R_done ]",
    "FAIL"
)

st_while = KalKylSymbolTable()
st_while.bind('V_count', 'zahl')

run(
    "solange — valid condition",
    "[ solange V_count < 10 -> zeige R_done ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_while
)

# =============================================================================
# CONTROL FLOW — sonst
# =============================================================================

run(
    "sonst — no semantic checks needed (always PASS)",
    "[ sonst -> zeige R_fallback ]",
    "PASS"
)

# =============================================================================
# SCOPE LOCK — Z_ flush
# =============================================================================

run(
    "Scope Lock — Z_ flushed after assignment",
    "[ 10 => zahl Z_temp ]",
    "PASS"
)

# =============================================================================
# V_lit_ PERSISTENCE — same literal across two statements
# =============================================================================

st_persist = KalKylSymbolTable()
semantic_persist = KalKylSemantics()

tokens1, _, _ = lexer.tokenize("[ 10 + 5.5 => gleitkomma R_output ]")
_, _, rule1 = parser.parse(tokens1)
_, _, st_persist = semantic_persist.analyze(tokens1, rule1, st_persist)

print(f"\n{'='*60}")
print("V_lit_ Persistence — same literal '10' appears in second statement")
print("Symbol table after first statement:")
print(st_persist.display())

tokens2, _, _ = lexer.tokenize("[ 10 + 3.0 => gleitkomma R_second ]")
_, _, rule2 = parser.parse(tokens2)
_, status2, st_persist = semantic_persist.analyze(tokens2, rule2, st_persist)
print(f"\nSecond statement status: {status2}")
print("Symbol table after second statement:")
print(st_persist.display())
print(f"\nResult  : {'PASS' if status2 == 'PASS' else 'FAIL -- unexpected result'}")