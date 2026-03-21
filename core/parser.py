class KalKylParser:
    def __init__(self):
        # Token types that are valid as expression content before =>
        self.EXPR_TOKENS = {
            'NUM_LIT', 'FLOAT_LIT', 'STR_LIT', 'RAW_STR', 'TYPE_DIM',
            'BOOL', 'IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT',
            'OP_MATH', 'OP_REL', 'OP_LOGIC', 'ACTION',
            'PAREN_OPEN', 'PAREN_CLOSE',
        }

        # Grammar rule labels for narratives
        self.RULES = {
            'assignment':     '[ Expr => Type Ident ]',
            'action_zeige':   '[ zeige Ident ]',
            'action_lese':    '[ lese => Type Ident ]',
            'action_bau':     '[ bau Ident => objekt Ident ]',
            'control_wenn':   '[ wenn Expr RelOp Expr -> ... ]',
            'control_solange':'[ solange Expr RelOp Expr -> ... ]',
            'control_sonst':  '[ sonst -> ... ]',
            'bool_assign':    '[ BoolExpr => logik Ident ]',
        }

    def _types(self, tokens):
        """Extract just the token types as a list for pattern matching."""
        return [t['type'] for t in tokens]

    def _values(self, tokens):
        """Extract just the token values as a list."""
        return [t['value'] for t in tokens]

    def _find(self, tokens, type_=None, value=None, start=0):
        """Find first token index matching type and/or value from start."""
        for i in range(start, len(tokens)):
            t = tokens[i]
            if type_ and t['type'] != type_:
                continue
            if value and t['value'] != value:
                continue
            return i
        return -1

    def _has_nested_bracket(self, tokens):
        """Check for nested BRACKET_OPEN after the first token."""
        for t in tokens[1:]:
            if t['type'] == 'BRACKET_OPEN':
                return True
        return False

    def _strip_bounds(self, tokens):
        """Remove BRACKET_OPEN and BRACKET_CLOSE from token list."""
        return [t for t in tokens
                if t['type'] not in ('BRACKET_OPEN', 'BRACKET_CLOSE')]

    def parse(self, tokens):
        """
        Returns (narratives, status, matched_rule).
        matched_rule is a key into self.RULES, or None on FAIL.
        """
        narratives = []

        # --- Structural pre-checks + Phrase-Level Recovery ---
        types = self._types(tokens)

        if not tokens or types[0] != 'BRACKET_OPEN':
            narratives.append(
                "[PARSER] WARNING: Missing Initiator '[' detected. "
                "[RECOVERY] Phrase-Level Recovery: Inserting '[' to establish memory isolation boundary."
            )
            tokens = [{'type': 'BRACKET_OPEN', 'value': '['}] + list(tokens)
            types = self._types(tokens)

        if types[-1] != 'BRACKET_CLOSE':
            narratives.append("[PARSER] FATAL ERROR: Expected Delimiter ']' at end of statement.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        # Nested bracket check
        if self._has_nested_bracket(tokens):
            narratives.append("[PARSER] Nested block detected. Inner scope treated as sub-statement.")

        inner = self._strip_bounds(tokens)
        inner_values = self._values(inner)

        narratives.append("[PARSER] Checking statement structure...")

        # --- Rule matching ---

        # Rule: [ sonst -> ... ]
        if inner_values and inner_values[0] == 'sonst':
            return self._match_sonst(inner, narratives)

        # Rule: [ wenn ... -> ... ]
        if inner_values and inner_values[0] == 'wenn':
            return self._match_control(inner, 'control_wenn', narratives)

        # Rule: [ solange ... -> ... ]
        if inner_values and inner_values[0] == 'solange':
            return self._match_control(inner, 'control_solange', narratives)

        # Rule: [ zeige Ident ]
        if inner_values and inner_values[0] == 'zeige':
            return self._match_zeige(inner, narratives)

        # Rule: [ lese => Type Ident ]
        if inner_values and inner_values[0] == 'lese':
            return self._match_lese(inner, narratives)

        # Rule: [ bau Ident => objekt Ident ]
        if inner_values and inner_values[0] == 'bau':
            return self._match_bau(inner, narratives)

        # Rule: [ Expr => Type/TypeDim Ident ] (core assignment)
        return self._match_assignment(inner, narratives)

    # -------------------------------------------------------------------------
    # Rule matchers
    # -------------------------------------------------------------------------

    def _match_assignment(self, inner, narratives):
        """[ Expr => Type/TypeDim Ident ]"""
        rule = self.RULES['assignment']
        narratives.append(f"[PARSER] Expected rule: {rule}")

        assign_idx = self._find(inner, type_='ASSIGN')

        # No => found
        if assign_idx == -1:
            narratives.append("[PARSER] FATAL ERROR: Missing Assignment Operator '=>'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        # Nothing before =>
        if assign_idx == 0:
            narratives.append("[PARSER] FATAL ERROR: No expression found before '=>'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        expr_tokens = inner[:assign_idx]
        rest = inner[assign_idx + 1:]  # [Type, Ident]

        # Validate expression tokens are legal
        for t in expr_tokens:
            if t['type'] not in self.EXPR_TOKENS:
                narratives.append(f"[PARSER] FATAL ERROR: Unexpected token '{t['value']}' in expression.")
                narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
                return narratives, "FAIL", None

        # Validate right side: Type/TypeDim + Ident
        if len(rest) < 2:
            narratives.append("[PARSER] FATAL ERROR: Incomplete assignment target. Expected Type and Identifier.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        type_token = rest[0]
        ident_token = rest[1]

        if type_token['type'] not in ('TYPE', 'TYPE_DIM'):
            narratives.append(f"[PARSER] FATAL ERROR: Expected Type after '=>', found '{type_token['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        if ident_token['type'] not in ('IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT'):
            narratives.append(f"[PARSER] FATAL ERROR: Expected Identifier after Type, found '{ident_token['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        narratives.append(f"[PARSER] Sentence structure {rule} is valid. Proceeding to the Semantic Analyzer for architectural validation.")
        return narratives, "PASS", 'assignment'

    def _match_zeige(self, inner, narratives):
        """[ zeige Ident ]"""
        rule = self.RULES['action_zeige']
        narratives.append(f"[PARSER] Expected rule: {rule}")

        if len(inner) < 2:
            narratives.append("[PARSER] FATAL ERROR: 'zeige' requires an Identifier.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        ident = inner[1]
        if ident['type'] not in ('IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT'):
            narratives.append(f"[PARSER] FATAL ERROR: Expected Identifier after 'zeige', found '{ident['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        narratives.append(f"[PARSER] Sentence structure {rule} is valid. Proceeding to the Semantic Analyzer for architectural validation.")
        return narratives, "PASS", 'action_zeige'

    def _match_lese(self, inner, narratives):
        """[ lese => Type Ident ]"""
        rule = self.RULES['action_lese']
        narratives.append(f"[PARSER] Expected rule: {rule}")

        # Expect: lese => Type Ident
        if len(inner) < 4:
            narratives.append("[PARSER] FATAL ERROR: Incomplete 'lese' statement. Expected: lese => Type Ident.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        if inner[1]['type'] != 'ASSIGN':
            narratives.append(f"[PARSER] FATAL ERROR: Expected '=>' after 'lese', found '{inner[1]['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        if inner[2]['type'] not in ('TYPE', 'TYPE_DIM'):
            narratives.append(f"[PARSER] FATAL ERROR: Expected Type after '=>', found '{inner[2]['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        if inner[3]['type'] not in ('IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT'):
            narratives.append(f"[PARSER] FATAL ERROR: Expected Identifier, found '{inner[3]['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        narratives.append(f"[PARSER] Sentence structure {rule} is valid. Proceeding to the Semantic Analyzer for architectural validation.")
        return narratives, "PASS", 'action_lese'

    def _match_bau(self, inner, narratives):
        """[ bau Ident => objekt Ident ]"""
        rule = self.RULES['action_bau']
        narratives.append(f"[PARSER] Expected rule: {rule}")

        # Expect: bau Ident => objekt Ident
        if len(inner) < 5:
            narratives.append("[PARSER] FATAL ERROR: Incomplete 'bau' statement. Expected: bau Ident => objekt Ident.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        if inner[2]['type'] != 'ASSIGN':
            narratives.append(f"[PARSER] FATAL ERROR: Expected '=>' in 'bau' statement, found '{inner[2]['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        if inner[3]['value'] != 'objekt':
            narratives.append(f"[PARSER] FATAL ERROR: Expected 'objekt' type in 'bau' statement, found '{inner[3]['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        if inner[4]['type'] not in ('IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT'):
            narratives.append(f"[PARSER] FATAL ERROR: Expected Identifier after 'objekt', found '{inner[4]['value']}'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        narratives.append(f"[PARSER] Sentence structure {rule} is valid. Proceeding to the Semantic Analyzer for architectural validation.")
        return narratives, "PASS", 'action_bau'

    def _match_control(self, inner, rule_key, narratives):
        """[ wenn/solange Expr RelOp Expr -> ... ]"""
        rule = self.RULES[rule_key]
        narratives.append(f"[PARSER] Expected rule: {rule}")

        arrow_idx = self._find(inner, type_='ARROW_THEN')

        if arrow_idx == -1:
            narratives.append(f"[PARSER] FATAL ERROR: Missing '->' in control flow statement.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        # Condition is tokens between keyword and ->
        condition = inner[1:arrow_idx]

        if not condition:
            narratives.append(f"[PARSER] FATAL ERROR: Missing condition before '->'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        # Confirm at least one relational operator exists in condition
        has_rel = any(t['type'] == 'OP_REL' for t in condition)
        if not has_rel:
            narratives.append(f"[PARSER] FATAL ERROR: Missing Relational Operator in condition.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        # Confirm something exists after ->
        body = inner[arrow_idx + 1:]
        if not body:
            narratives.append(f"[PARSER] FATAL ERROR: Missing body after '->'.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        narratives.append(f"[PARSER] Sentence structure {rule} is valid. Proceeding to the Semantic Analyzer for architectural validation.")
        return narratives, "PASS", rule_key

    def _match_sonst(self, inner, narratives):
        """[ sonst -> ... ]"""
        rule = self.RULES['control_sonst']
        narratives.append(f"[PARSER] Expected rule: {rule}")

        arrow_idx = self._find(inner, type_='ARROW_THEN')

        if arrow_idx == -1:
            narratives.append("[PARSER] FATAL ERROR: Missing '->' in 'sonst' statement.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        body = inner[arrow_idx + 1:]
        if not body:
            narratives.append("[PARSER] FATAL ERROR: Missing body after '->' in 'sonst' statement.")
            narratives.append("[SYSTEM] Operation aborted; memory isolation could not be established.")
            return narratives, "FAIL", None

        narratives.append(f"[PARSER] Sentence structure {rule} is valid. Proceeding to the Semantic Analyzer for architectural validation.")
        return narratives, "PASS", 'control_sonst'
