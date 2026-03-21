# parser_test.py
# Full test harness for KalKylParser
# Mirrors the structure of lexer_test.py

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from lexer import KalKylLexer
from parser import KalKylParser

lexer = KalKylLexer()
parser = KalKylParser()


def run(label, input_text, expected_status):
    tokens, lex_narratives, lex_status = lexer.tokenize(input_text)

    print(f"\n{'='*60}")
    print(f"{label}")
    print(f"Input   : {input_text}")
    print(f"Expected: {expected_status}")

    # If lexer already failed, parser does not run
    if lex_status == "FAIL":
        print(f"Lex     : FAIL (parser skipped)")
        for n in lex_narratives:
            print(f"  {n}")
        result = "FAIL"
    else:
        parse_narratives, parse_status, _ = parser.parse(tokens)
        print(f"Lex     : {lex_status}")
        print(f"Parse   : {parse_status}")
        print("Narratives:")
        for n in lex_narratives:
            print(f"  {n}")
        for n in parse_narratives:
            print(f"  {n}")
        result = parse_status

    match = "PASS" if result == expected_status else "FAIL -- unexpected result"
    print(f"Result  : {match}")


# =============================================================================
# OFFICIAL TEST CASES (TC1–TC4)
# =============================================================================

run(
    "TC1 — Happy Path",
    "[ 10 + 5.5 => gleitkomma R_output ]",
    "PASS"
)

run(
    "TC2 — Phrase-Level Recovery: Missing '[' auto-inserted by parser",
    "100 => zahl Z_1 ]",
    "PASS"
)

run(
    "TC3 — Semantic Error: Raw String (parser must PASS, semantics catches it)",
    '[ "Civiq" => zahl Z_1 ]',
    "PASS"
)

run(
    "TC4 — Panic Mode Recovery: Unknown symbol '$' discarded, scanning resumed",
    "[ 10 $ 5 => zahl Z_1 ]",
    "PASS"
)

# =============================================================================
# ASSIGNMENT RULE VARIANTS
# =============================================================================

run(
    "Assignment — Integer literal",
    "[ 100 => zahl V_speed ]",
    "PASS"
)

run(
    "Assignment — Float literal",
    "[ 6.7 => gleitkomma Z_rate ]",
    "PASS"
)

run(
    "Assignment — Boolean literal",
    "[ wahr => logik V_flag ]",
    "PASS"
)

run(
    "Assignment — Dimensional string literal",
    '[ 6*wort "KalKyl" => 6*wort R_name ]',
    "PASS"
)

run(
    "Assignment — Math expression",
    "[ 10 + 5.5 => gleitkomma R_0 ]",
    "PASS"
)

run(
    "Assignment — Identifier expression",
    "[ V_x => zahl Z_result ]",
    "PASS"
)

run(
    "Assignment — Missing => operator",
    "[ 10 zahl R_out ]",
    "FAIL"
)

run(
    "Assignment — Nothing before =>",
    "[ => zahl R_out ]",
    "FAIL"
)

run(
    "Assignment — Missing identifier after type",
    "[ 10 => zahl ]",
    "FAIL"
)

run(
    "Assignment — Invalid type token",
    "[ 10 => 999 R_out ]",
    "FAIL"
)

run(
    "Assignment — Invalid identifier prefix",
    "[ 10 => zahl X_invalid ]",
    "FAIL"  # lexer catches X_ as MISMATCH
)

# =============================================================================
# ACTION RULES
# =============================================================================

run(
    "Action — zeige valid",
    "[ zeige R_dashboard ]",
    "PASS"
)

run(
    "Action — zeige missing identifier",
    "[ zeige ]",
    "FAIL"
)

run(
    "Action — zeige non-identifier token",
    "[ zeige zahl ]",
    "FAIL"
)

run(
    "Action — lese valid",
    "[ lese => wort V_input ]",
    "PASS"
)

run(
    "Action — lese missing =>",
    "[ lese wort V_input ]",
    "FAIL"
)

run(
    "Action — bau valid",
    "[ bau V_KrisBan => objekt Z_board ]",
    "PASS"
)

run(
    "Action — bau missing objekt keyword",
    "[ bau V_KrisBan => zahl Z_board ]",
    "FAIL"
)

# =============================================================================
# CONTROL FLOW RULES
# =============================================================================

run(
    "Control — wenn valid",
    "[ wenn Z_count > 10 -> zeige R_done ]",
    "PASS"
)

run(
    "Control — wenn missing ->",
    "[ wenn Z_count > 10 zeige R_done ]",
    "FAIL"
)

run(
    "Control — wenn missing relational operator",
    "[ wenn Z_count -> zeige R_done ]",
    "FAIL"
)

run(
    "Control — wenn missing body after ->",
    "[ wenn Z_count > 10 -> ]",
    "FAIL"
)

run(
    "Control — solange valid",
    "[ solange V_count < 10 -> zeige R_done ]",
    "PASS"
)

run(
    "Control — solange missing ->",
    "[ solange V_count < 10 zeige R_done ]",
    "FAIL"
)

run(
    "Control — sonst valid",
    "[ sonst -> zeige R_fallback ]",
    "PASS"
)

run(
    "Control — sonst missing ->",
    "[ sonst zeige R_fallback ]",
    "FAIL"
)

run(
    "Control — sonst missing body",
    "[ sonst -> ]",
    "FAIL"
)

# =============================================================================
# NESTED BRACKETS (Plankalkül sub-block)
# =============================================================================

run(
    "Nested — inner block flagged with narrative",
    "[ [ 10 + 2 ] => zahl R_nested ]",
    "PASS"
)

# =============================================================================
# EDGE CASES
# =============================================================================

run(
    "Edge — empty token list (empty input caught by lexer)",
    "",
    "FAIL"
)

run(
    "Edge — missing delimiter (caught by lexer)",
    "[ 10 => zahl R_out",
    "FAIL"
)

run(
    "Edge — logic expression assignment",
    "[ wahr und falsch => logik R_bool ]",
    "PASS"
)

run(
    "Edge — relational chain",
    "[ Z_a >= Z_b => logik R_rel ]",
    "PASS"
)

run(
    "Edge — multiple math operators in expression",
    "[ 10 + 2 * 3.5 / 2 - 1 => gleitkomma R_complex ]",
    "PASS"
)