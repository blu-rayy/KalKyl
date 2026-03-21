import re

class KalKylLexer:
    def __init__(self):
        self.token_specs = [
            ('BRACKET_OPEN',  r'\['),
            ('BRACKET_CLOSE', r'\]'),
            ('STR_LIT',       r'(?P<str_dim>\d+)\*wort\s+"(?P<str_val>[^"]*)"'),  # must be before TYPE_DIM
            ('TYPE_DIM',      r'\d+\*wort'),                                       # e.g. 6*wort as type annotation
            ('RAW_STR',       r'"[^"]*"'),                                         # TC3: raw string without m* prefix
            ('FLOAT_LIT',     r'\d+\.\d+'),
            ('NUM_LIT',       r'\d+'),
            ('ASSIGN',        r'=>'),
            ('ARROW_THEN',    r'->'),
            ('IDENT_INPUT',   r'V_[a-zA-Z0-9_]+'),
            ('IDENT_INTER',   r'Z_[a-zA-Z0-9_]+'),
            ('IDENT_RESULT',  r'R_[a-zA-Z0-9_]+'),
            ('KEYWORD',       r'wenn|sonst|solange'),
            ('TYPE',          r'zahl|gleitkomma|wort|logik|objekt'),
            ('ACTION',        r'zeige|lese|bau'),
            ('BOOL',          r'wahr|falsch|leer'),
            ('OP_LOGIC',      r'und|oder|nicht'),
            ('OP_MATH',       r'[+\-*/]'),
            ('OP_REL',        r'==|!=|>=|<=|>|<'),
            ('SEP_COMMA',     r','),
            ('SKIP',          r'[ \t\n]+'),
            ('MISMATCH',      r'.'),
        ]

        self.regex = re.compile('|'.join('(?P<%s>%s)' % pair for pair in self.token_specs))

    # Human-readable label for narratives
    def _label(self, kind):
        labels = {
            'BRACKET_OPEN':  'INITIATOR',
            'BRACKET_CLOSE': 'DELIMITER',
            'STR_LIT':       'STRING_LITERAL',
            'RAW_STR':       'STRING_LITERAL',
            'FLOAT_LIT':     'FLOAT_LITERAL',
            'NUM_LIT':       'NUMERIC_LITERAL',
            'ASSIGN':        'ASSIGN_OPERATOR',
            'ARROW_THEN':    'ARROW_THEN',
            'IDENT_INPUT':   'IDENTIFIER_INPUT',
            'IDENT_INTER':   'IDENTIFIER_INTER',
            'IDENT_RESULT':  'IDENTIFIER_RESULT',
            'KEYWORD':       'KEYWORD',
            'TYPE':          'DATATYPE',
            'ACTION':        'ACTION',
            'BOOL':          'BOOLEAN_LITERAL',
            'OP_LOGIC':      'LOGICAL_OPERATOR',
            'OP_MATH':       'MATH_OPERATOR',
            'OP_REL':        'RELATIONAL_OPERATOR',
            'SEP_COMMA':     'SEPARATOR',
            'TYPE_DIM': 'DIMENSIONAL_TYPE'
        }
        return labels.get(kind, kind)

    def tokenize(self, code):
        tokens = []
        narratives = []
        raw_string_warning = None 

        # Guard: empty or blank input
        if not code or not code.strip():
            narratives.append("[LEXER] FATAL ERROR: Empty or blank input provided.")
            return tokens, narratives, "FAIL"

        for mo in self.regex.finditer(code):
            kind = mo.lastgroup
            value = mo.group()

            if kind == 'SKIP':
                continue

            elif kind == 'MISMATCH':
                narratives.append(f"[LEXER] FATAL ERROR: Unknown symbol '{value}' detected. Operation halted at index {mo.start()}.")
                return tokens, narratives, "FAIL"

            elif kind == 'RAW_STR':
                # TC3: warn but continue tokenizing — let semantics issue the FATAL
                raw_string_warning = f"[LEXER] Warning: String literal {value} detected without mandatory 'm*' dimensional prefix."
                tokens.append({'type': kind, 'value': value})
                narratives.append(f"[LEXER] Found '{value}' -> Identified as STRING_LITERAL")
                continue

            elif kind == 'STR_LIT':
                expected_len = int(mo.group('str_dim'))
                actual_str = mo.group('str_val')
                actual_len = len(actual_str)
                narratives.append(f"[LEXER] Found '{value}' -> Identified as STRING_LITERAL")
                if expected_len != actual_len:
                    narratives.append(f"[LEXER] WARNING: Dimensional mismatch. Expected {expected_len}*, found {actual_len}.")

            else:
                narratives.append(f"[LEXER] Found '{value}' -> Identified as {self._label(kind)}")

            tokens.append({'type': kind, 'value': value})

        if not code.endswith(']'):
            narratives.append("[LEXER] FATAL ERROR: Identified missing Delimiter ']'.")
            return tokens, narratives, "FAIL"

        # TC3: append warning AFTER all tokens scanned, matching expected narrative format
        if raw_string_warning:
            narratives.append(f"[LEXER] Successfully scanned {len(tokens)} tokens. {raw_string_warning}")
        else:
            narratives.append(f"[LEXER] Successfully scanned {len(tokens)} tokens.")

        return tokens, narratives, "PASS"