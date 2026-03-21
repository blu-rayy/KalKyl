import sys
import os
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'core'))

from lexer import KalKylLexer
from parser import KalKylParser
from semantics import KalKylSemantics
from symbol_table import KalKylSymbolTable
from explainability.narrator import KalKylNarrator


def run(source: str) -> str:
    lexer    = KalKylLexer()
    parser   = KalKylParser()
    semantic = KalKylSemantics()
    narrator = KalKylNarrator()
    st       = KalKylSymbolTable()

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
