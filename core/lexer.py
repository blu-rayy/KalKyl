import re

class KalKylLexer:
    def __init__(self):
        # The Master Regex Table: Prioritized for Lookahead
        self.token_specs = [
            ('BRACKET_OPEN',  r'\['),                     # Initiator [cite: 17, 109]
            ('BRACKET_CLOSE', r'\]'),                     # Delimiter [cite: 17, 109]
            ('STR_LIT',       r'(\d+)\*wort\s+"([^"]*)"'), # Dim. String 
            ('FLOAT_LIT',     r'\d+\.\d+'),                # Gleitkomma [cite: 65, 66]
            ('NUM_LIT',       r'\d+'),                     # Zahl [cite: 63, 64]
            ('ASSIGN',        r'=\>'),                     # Zuweisung [cite: 19, 82]
            ('ARROW_THEN',    r'\-\>'),                    # Folgepfeil 
            ('IDENT_INPUT',   r'V_[a-zA-Z0-9_]+'),         # Variablen [cite: 43, 48]
            ('IDENT_INTER',   r'Z_[a-zA-Z0-9_]+'),         # Zwischenwerte [cite: 43, 46]
            ('IDENT_RESULT',  r'R_[a-zA-Z0-9_]+'),         # Resultate [cite: 43, 51]
            ('TYPE',          r'zahl|gleitkomma|wort|logik|objekt'), # Types [cite: 27]
            ('ACTION',        r'zeige|lese|bau'),          # Actions [cite: 31]
            ('BOOL',          r'wahr|falsch|leer'),        # Built-ins [cite: 29, 73]
            ('OP_LOGIC',      r'und|oder|nicht'),          # Logical [cite: 35, 102]
            ('OP_MATH',       r'[\+\-\*/]'),               # Arithmetik [cite: 88]
            ('OP_REL',        r'==|!=|>=|<=|>|<'),         # Vergleich [cite: 95, 100]
            ('SKIP',          r'[ \t\n]+'),                # Whitespace [cite: 15]
            ('MISMATCH',      r'.'),                       # Catch-all for TC4
        ]
        
        # Compile master regex
        self.regex = re.compile('|'.join('(?P<%s>%s)' % pair for pair in self.token_specs))

    def tokenize(self, code):
        tokens = []
        narratives = []
        
        # Initial Spatial Check 
        if not code.startswith('['):
            narratives.append("[LEXER] FATAL ERROR: Identified missing Initiator '['.")
        
        for mo in self.regex.finditer(code):
            kind = mo.lastgroup
            value = mo.group()
            
            if kind == 'SKIP':
                continue
            elif kind == 'MISMATCH':
                if value == '"':
                    narratives.append('[LEXER] FATAL ERROR: Identified raw string "\"". Strings must be prefixed with m*wort (e.g., 5*wort).')
                else:
                    narratives.append(f"[LEXER] FATAL ERROR: Unknown symbol '{value}' detected.")
                return tokens, narratives, "FAIL"
            
            # Special Handling: Dimensional String Validation 
            if kind == 'STR_LIT':
                expected_len = int(mo.group(4)) # Group index based on regex structure
                actual_str = mo.group(5)
                actual_len = len(actual_str)
                
                narratives.append(f"[LEXER] Scanned wort literal '{actual_str}'.")
                if expected_len != actual_len:
                    narratives.append(f"[LEXER] WARNING: Dimensional mismatch. Expected {expected_len}*, found {actual_len}.")
            
            tokens.append({'type': kind, 'value': value})
            
        if not code.endswith(']'):
            narratives.append("[LEXER] FATAL ERROR: Identified missing Delimiter ']'.")
            return tokens, narratives, "FAIL"

        narratives.append(f"[LEXER] Successfully identified {len(tokens)} tokens.")
        return tokens, narratives, "PASS"