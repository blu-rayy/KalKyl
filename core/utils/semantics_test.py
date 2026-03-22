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
st_ctrl.bind('R_done', 'logik')

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
st_while.bind('R_done', 'logik')

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

# =============================================================================
# RECOVERY STRATEGIES — full pipeline demonstrations
# =============================================================================

run(
    "Panic Mode — multiple consecutive invalid symbols skipped, valid assignment survives",
    "[ 10 $$ 5 => zahl Z_sum ]",
    "PASS"
)

run(
    "Panic Mode — invalid symbol between int and float, promotion still resolves",
    "[ 10 @ 5.5 => gleitkomma R_result ]",
    "PASS"
)

run(
    "Panic Mode — lone invalid symbol in expression, no operands lost",
    "[ 42 # => zahl Z_val ]",
    "PASS"
)

run(
    "Phrase-Level Recovery — missing '[' with float literal auto-inserted",
    "3.14 => gleitkomma Z_pi ]",
    "PASS"
)

run(
    "Phrase-Level Recovery — missing '[' with dimensional string auto-inserted",
    '5*wort "hello" => 5*wort R_word ]',
    "PASS"
)

run(
    "Phrase-Level Recovery + Panic Mode — missing '[' AND invalid symbol, both recovered",
    "10 @ 5 => zahl Z_sum ]",
    "PASS"
)

# =============================================================================
# CONTROL STRUCTURES — advanced body variants
# =============================================================================

# wenn body is an assignment
st_wenn_assign = KalKylSymbolTable()
st_wenn_assign.bind('Z_x', 'zahl')

run(
    "wenn — body is an assignment (valid)",
    "[ wenn Z_x > 0 -> 99 => zahl R_result ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_wenn_assign
)

# wenn body assignment has type mismatch
st_wenn_fail = KalKylSymbolTable()
st_wenn_fail.bind('Z_x', 'zahl')

run(
    "wenn — body assignment type mismatch (float into zahl slot)",
    "[ wenn Z_x > 0 -> 3.14 => zahl R_result ]",
    "FAIL",
    fresh_table=False,
    symbol_table=st_wenn_fail
)

# solange body is a lese action (numeric literals as condition — no ident lookup needed)
run(
    "solange — body is a lese action binding a new input channel",
    "[ solange 1 < 10 -> lese => zahl V_next ]",
    "PASS"
)

# solange body is an assignment with promotion
run(
    "solange — body assignment promotes int+float to gleitkomma",
    "[ solange 1 < 10 -> 5 + 2.5 => gleitkomma R_val ]",
    "PASS"
)

# wenn body is an assignment, R_ in condition guard
st_wenn_r = KalKylSymbolTable()
st_wenn_r.bind('V_limit', 'zahl')

run(
    "wenn — condition uses V_ identifier (valid operand in condition)",
    "[ wenn V_limit >= 100 -> 0 => zahl R_capped ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_wenn_r
)

# sonst body is an assignment (sonst always passes without body analysis)
run(
    "sonst — body is an assignment (PASS; sonst body is unconditionally accepted)",
    "[ sonst -> 0 => zahl R_default ]",
    "PASS"
)

# =============================================================================
# OBJECT-ORIENTED — bau instantiation chains
# =============================================================================

# Valid bau from a V_ class template
st_bau_chain = KalKylSymbolTable()
st_bau_chain.bind('V_Template', 'objekt')

run(
    "bau — instantiate object from V_ class template into Z_ scratchpad",
    "[ bau V_Template => objekt Z_instance ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_bau_chain
)

# bau — target is a V_ identifier (immutability violation)
st_bau_immut = KalKylSymbolTable()
st_bau_immut.bind('V_Template', 'objekt')
st_bau_immut.bind('V_frozen', 'objekt')   # V_ target is locked

run(
    "bau — target is V_ identifier (immutability violation)",
    "[ bau V_Template => objekt V_frozen ]",
    "FAIL",
    fresh_table=False,
    symbol_table=st_bau_immut
)

# bau — source class not bound
run(
    "bau — source class not in symbol table (unresolved reference)",
    "[ bau V_Ghost => objekt Z_obj ]",
    "FAIL"
)

# Simulated chain: lese → bau (two-step pipeline on shared table)
st_lese_bau = KalKylSymbolTable()
tokens_lese, _, _ = lexer.tokenize("[ lese => objekt V_Blueprint ]")
_, _, rule_lese = parser.parse(tokens_lese)
_, _, st_lese_bau = semantic.analyze(tokens_lese, rule_lese, st_lese_bau)

print(f"\n{'='*60}")
print("bau Chain — after lese binds V_Blueprint, bau instantiates from it")
print("Symbol table after lese step:")
print(st_lese_bau.display())

run(
    "bau Chain — V_Blueprint bound by lese, now bau instantiates Z_obj",
    "[ bau V_Blueprint => objekt Z_obj ]",
    "PASS",
    fresh_table=False,
    symbol_table=st_lese_bau
)

# =============================================================================
# MATHEMATICAL EXPRESSIONS — advanced
# =============================================================================

run(
    "Math — subtraction chain of integers stays zahl",
    "[ 100 - 50 - 25 => zahl R_remain ]",
    "PASS"
)

run(
    "Math — multiplication of integers stays zahl",
    "[ 6 * 7 => zahl R_product ]",
    "PASS"
)

run(
    "Math — integer multiplication result forced into gleitkomma (mismatch)",
    "[ 6 * 7 => gleitkomma R_wrong ]",
    "FAIL"
)

run(
    "Math — three-term promotion: 1 + 2 + 3.0 promotes all to gleitkomma",
    "[ 1 + 2 + 3.0 => gleitkomma R_sum ]",
    "PASS"
)

run(
    "Math — No-Loss Division Rule: int / int still yields gleitkomma",
    "[ 8 / 2 => gleitkomma R_div ]",
    "PASS"
)

run(
    "Math — No-Loss Division Rule violation: division result forced into zahl",
    "[ 8 / 2 => zahl R_div ]",
    "FAIL"
)

run(
    "Math — complex multi-operator (*, +, /) with mixed types",
    "[ 10 * 2 + 5.0 / 2.5 => gleitkomma R_calc ]",
    "PASS"
)

run(
    "Math — negative-adjacent subtraction stays zahl",
    "[ 1000 - 999 => zahl R_one ]",
    "PASS"
)

# =============================================================================
# UNIQUE KALKYL RULES — showcase
# =============================================================================

# Promotion Rule
run(
    "Promotion Rule — float * int promotes to gleitkomma",
    "[ 3.0 * 4 => gleitkomma R_mul ]",
    "PASS"
)

run(
    "Promotion Rule — float alone assigned to gleitkomma",
    "[ 9.99 => gleitkomma R_price ]",
    "PASS"
)

# No-Loss Division Rule
run(
    "No-Loss Division Rule — 100 / 4 is gleitkomma not zahl",
    "[ 100 / 4 => gleitkomma R_quarter ]",
    "PASS"
)

# Dimensional String — exact match
run(
    "Dimensional String — exact 10-char match",
    '[ 10*wort "HelloWorld" => 10*wort R_banner ]',
    "PASS"
)

run(
    "Dimensional String — declared 10, actual 5 chars (mismatch)",
    '[ 10*wort "Hello" => 10*wort R_banner ]',
    "FAIL"
)

run(
    "Dimensional String — declared 1, actual 0 chars (empty string edge case)",
    '[ 1*wort "" => 1*wort R_empty ]',
    "FAIL"
)

# leer null compatibility
run(
    "leer — compatible with gleitkomma slot (null initializer)",
    "[ leer => gleitkomma Z_uninit ]",
    "PASS"
)

run(
    "leer — compatible with objekt slot (null class reference)",
    "[ leer => objekt Z_obj ]",
    "PASS"
)

# R_ Result Routing Violation
run(
    "R_ Routing Violation — R_ identifier used as left-side expression operand",
    "[ R_out * 2 => zahl Z_double ]",
    "FAIL"
)

# V_ Immutability — first bind (allowed), then re-bind (blocked)
run(
    "V_ Immutability — first binding of V_ identifier is allowed",
    "[ 42 => zahl V_const ]",
    "PASS"
)

st_v_immut2 = KalKylSymbolTable()
st_v_immut2.bind('V_const', 'zahl')

run(
    "V_ Immutability — re-assignment to already-bound V_ is blocked",
    "[ 99 => zahl V_const ]",
    "FAIL",
    fresh_table=False,
    symbol_table=st_v_immut2
)

# Raw string without m* prefix — double violation
run(
    "Double Violation — raw string into wort (missing m* prefix AND type mismatch)",
    '[ "hello" => wort R_msg ]',
    "FAIL"
)

run(
    "Double Violation — raw string into gleitkomma (missing m* + wrong type)",
    '[ "3.14" => gleitkomma R_pi ]',
    "FAIL"
)

# Logic type inference
run(
    "Logic — boolean expression yields logik",
    "[ wahr und falsch => logik R_gate ]",
    "PASS"
)

run(
    "Logic — boolean literal alone into logik",
    "[ falsch => logik V_flag ]",
    "PASS"
)

run(
    "Logic — boolean literal forced into zahl (type mismatch)",
    "[ wahr => zahl R_bad ]",
    "FAIL"
)