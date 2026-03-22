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
    "Edge — missing ']' auto-inserted by lexer Phrase-Level Recovery",
    "[ 10 => zahl R_out",
    "PASS"
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

# =============================================================================
# RECOVERY STRATEGIES — parser-level
# =============================================================================

run(
    "Panic Mode — invalid symbol '$' skipped, assignment survives",
    "[ 10 $ 5 => zahl Z_1 ]",
    "PASS"
)

run(
    "Panic Mode — multiple invalid symbols '$$' skipped",
    "[ 10 $$ 5 => zahl Z_sum ]",
    "PASS"
)

run(
    "Phrase-Level Recovery — missing '[' before integer expression",
    "42 => zahl Z_val ]",
    "PASS"
)

run(
    "Phrase-Level Recovery — missing '[' before float expression",
    "9.81 => gleitkomma Z_gravity ]",
    "PASS"
)

run(
    "Phrase-Level Recovery — missing '[' before dimensional string",
    '6*wort "KalKyl" => 6*wort R_name ]',
    "PASS"
)

run(
    "Phrase-Level Recovery + Panic Mode — missing '[' AND invalid symbol",
    "10 @ 5 => zahl Z_sum ]",
    "PASS"
)

run(
    "Phrase-Level Recovery — missing ']' at end auto-inserted by lexer",
    "[ 10 => zahl Z_val",
    "PASS"
)

# =============================================================================
# CONTROL STRUCTURES — body variants
# =============================================================================

run(
    "Control wenn — body is an assignment expression",
    "[ wenn Z_x > 0 -> 99 => zahl R_result ]",
    "PASS"
)

run(
    "Control wenn — body is a lese action",
    "[ wenn V_ready == 1 -> lese => zahl V_next ]",
    "PASS"
)

run(
    "Control wenn — body is a bau instantiation",
    "[ wenn Z_count > 0 -> bau V_Template => objekt Z_obj ]",
    "PASS"
)

run(
    "Control solange — body is an assignment with promotion",
    "[ solange 1 < 10 -> 5 + 2.5 => gleitkomma R_val ]",
    "PASS"
)

run(
    "Control solange — body is a zeige action",
    "[ solange V_i < 100 -> zeige R_output ]",
    "PASS"
)

run(
    "Control sonst — body is an assignment",
    "[ sonst -> 0 => zahl R_default ]",
    "PASS"
)

run(
    "Control sonst — body is a lese action",
    "[ sonst -> lese => wort V_fallback ]",
    "PASS"
)

# =============================================================================
# OBJECT-ORIENTED — bau variants
# =============================================================================

run(
    "bau — target is R_ identifier (valid parse; semantics enforces routing)",
    "[ bau V_Schema => objekt R_record ]",
    "PASS"
)

run(
    "bau — target is V_ identifier (valid parse; semantics enforces immutability)",
    "[ bau V_Template => objekt V_instance ]",
    "PASS"
)

run(
    "bau — missing objekt keyword replaced with zahl (FAIL)",
    "[ bau V_KrisBan => zahl Z_board ]",
    "FAIL"
)

run(
    "bau — missing source identifier (FAIL)",
    "[ bau => objekt Z_board ]",
    "FAIL"
)

# =============================================================================
# MATHEMATICAL EXPRESSIONS — advanced parser checks
# =============================================================================

run(
    "Math — parenthesised sub-expression parsed as valid expr tokens",
    "[ (10 + 2) * 3 => zahl R_val ]",
    "PASS"
)

run(
    "Math — deep operator chain",
    "[ 1 + 2 + 3 + 4 + 5 => zahl R_total ]",
    "PASS"
)

run(
    "Math — mixed relational and math into logik",
    "[ Z_a + 1 >= Z_b => logik R_check ]",
    "PASS"
)

run(
    "Math — division present yields valid assignment structure",
    "[ 10 / 4 => gleitkomma R_div ]",
    "PASS"
)

run(
    "Math — unary not (nicht) in expression",
    "[ nicht wahr => logik R_inv ]",
    "PASS"
)