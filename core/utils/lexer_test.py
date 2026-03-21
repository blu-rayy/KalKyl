# Simple test harness for lexer.py
from lexer import KalKylLexer

def run_lexer_test(input_text):
    lexer = KalKylLexer()
    tokens, narratives, status = lexer.tokenize(input_text)
    print("Tokens:")
    for token in tokens:
        print(token)
    print("\nNarratives:")
    for n in narratives:
        print(n)
    print(f"\nStatus: {status}")

if __name__ == "__main__":
    lexer = KalKylLexer()
    test_cases = [
        # TC1: Happy Path
        "[ 10 + 5.5 => gleitkomma R_0 ]",
        # TC2: Missing Initiator
        "100 => zahl Z_1 ]",
        # TC3: Semantic/Dimensional Error
        "[ \"Civiq\" => zahl Z_1 ]",
        # TC4: Unknown Symbol
        "[ 10 $ 5 => zahl Z_1 ]",
        # Edge: Correct Dimensional String
        "[ 6*wort \"KalKyl\" => 6*wort R_name ]",
        # Edge: Logic and Control Flow
        "[ wenn Z_count > 10 -> zeige R_done ]",
        # TC5: Empty Input
        "",
        # TC6: Only Whitespace
        "    \t\n  ",
        # TC7: Nested Brackets (should not be valid)
        "[ [ 10 + 2 ] => zahl R_nested ]",
        # TC8: Multiple Assignments
        "[ V_x => zahl Z_1 V_y => gleitkomma Z_2 ]",
        # TC9: Boolean Literals
        "[ wahr und falsch oder leer => logik R_bool ]",
        # TC10: Invalid Identifier
        "[ 10 + 2 => zahl X_invalid ]",
        # TC11: Valid Assignment with Action
        "[ lese V_input => wort R_result ]",
        # TC12: Relational Operators
        "[ Z_a >= Z_b == Z_c < Z_d => logik R_rel ]",
        # TC13: Complex Expression
        "[ (10 + 2) * 3.5 / 2 - 1 => gleitkomma R_complex ]",
    ]

    for i, tc in enumerate(test_cases, 1):
        print(f"\n--- Running Test Case {i} ---")
        print(f"Input: {tc}")
        tokens, narratives, status = lexer.tokenize(tc)
        print(f"Status: {status}")
        print("Narratives:")
        for n in narratives:
            print(f"  {n}")
        print("Tokens:")
        for t in tokens:
            print(f"  {t}")
