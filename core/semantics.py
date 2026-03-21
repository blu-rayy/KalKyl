class KalKylSemantics:
    def __init__(self):
        self.internal_counter = 0  # persistent across statements for V_lit_ naming

    # -------------------------------------------------------------------------
    # Public interface
    # -------------------------------------------------------------------------

    def analyze(self, tokens, rule, symbol_table):
        narratives = []
        narratives.append("[SEMANTICS] Checking Type Compatibility...")

        # Strip brackets
        inner = [t for t in tokens if t['type'] not in ('BRACKET_OPEN', 'BRACKET_CLOSE')]

        # Route to rule-specific handler
        if rule == 'assignment':
            return self._analyze_assignment(inner, symbol_table, narratives)
        elif rule == 'action_zeige':
            return self._analyze_zeige(inner, symbol_table, narratives)
        elif rule == 'action_lese':
            return self._analyze_lese(inner, symbol_table, narratives)
        elif rule == 'action_bau':
            return self._analyze_bau(inner, symbol_table, narratives)
        elif rule in ('control_wenn', 'control_solange'):
            return self._analyze_control(inner, symbol_table, narratives)
        elif rule == 'control_sonst':
            narratives.append("[SEMANTICS] 'sonst' branch acknowledged. No type validation required.")
            return narratives, "PASS", symbol_table
        else:
            narratives.append(f"[SEMANTICS] Unknown rule '{rule}'. Cannot validate.")
            return narratives, "FAIL", symbol_table

    # -------------------------------------------------------------------------
    # Rule handlers
    # -------------------------------------------------------------------------

    def _analyze_assignment(self, inner, symbol_table, narratives):
        """
        Full pipeline for: [ Expr => Type/TypeDim Ident ]
        """
        # Find => index
        assign_idx = next((i for i, t in enumerate(inner) if t['type'] == 'ASSIGN'), -1)

        expr_tokens = inner[:assign_idx]
        type_token  = inner[assign_idx + 1]
        ident_token = inner[assign_idx + 2]

        declared_type = type_token['value']   # e.g. 'gleitkomma', 'zahl'
        ident_name    = ident_token['value']  # e.g. 'R_output'

        # Extract str_dim from TYPE_DIM token e.g. '6*wort' -> 6
        str_dim = None
        if type_token['type'] == 'TYPE_DIM':
            str_dim = int(type_token['value'].split('*')[0])
            declared_type = 'wort'

        # -----------------------------------------------------------------
        # Check 1: RAW_STR → TC3 Double Violation
        # -----------------------------------------------------------------
        raw_str_token = next((t for t in expr_tokens if t['type'] == 'RAW_STR'), None)
        if raw_str_token:
            raw_val = raw_str_token['value'].strip('"')
            dim_needed = len(raw_val)
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Double Violation Detected. "
                f"(1) Dimensional Requirement Missing: String literal \"{raw_val}\" requires an "
                f"'m*wort' prefix (e.g., {dim_needed}*wort). "
                f"(2) Type Mismatch: Cannot flow a 'wort' into a '{declared_type}' memory slot. "
                f"Assignment Blocked."
            )
            return narratives, "FAIL", symbol_table

        # -----------------------------------------------------------------
        # Check 2: STR_LIT dimensional mismatch
        # -----------------------------------------------------------------
        str_lit_token = next((t for t in expr_tokens if t['type'] == 'STR_LIT'), None)
        if str_lit_token:
            declared_dim = int(str_lit_token['value'].split('*')[0])
            actual_str   = str_lit_token['value'].split('"')[1]
            actual_dim   = len(actual_str)
            if declared_dim != actual_dim:
                narratives.append(
                    f"[SEMANTICS] FATAL ERROR: Dimensional Mismatch. "
                    f"Declared {declared_dim}*, actual character count is {actual_dim}. "
                    f"Memory slot cannot be initialized."
                )
                return narratives, "FAIL", symbol_table

        # -----------------------------------------------------------------
        # Check 3: R_ on left-side guard
        # -----------------------------------------------------------------
        for t in expr_tokens:
            if t['type'] == 'IDENT_RESULT':
                narratives.append(
                    f"[SEMANTICS] FATAL ERROR: Result Routing Violation. "
                    f"R_ identifier '{t['value']}' cannot appear as an expression operand."
                )
                return narratives, "FAIL", symbol_table

        # -----------------------------------------------------------------
        # Check 4: V_ immutability
        # -----------------------------------------------------------------
        if symbol_table.is_locked(ident_name):
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Immutability Violation. "
                f"V_ identifier '{ident_name}' is locked. "
                f"Input values cannot be overwritten."
            )
            return narratives, "FAIL", symbol_table

        # -----------------------------------------------------------------
        # Check 5: Expression type inference + Promotion Rule
        # -----------------------------------------------------------------
        inferred_type, promoted, promotion_narrative = self._infer_type(
            expr_tokens, symbol_table, narratives
        )

        if inferred_type is None:
            # _infer_type already appended the FATAL narrative
            return narratives, "FAIL", symbol_table

        if promoted:
            narratives.append(promotion_narrative)

        # -----------------------------------------------------------------
        # Check 6: Type compatibility
        # -----------------------------------------------------------------
        # leer is compatible with any type
        if inferred_type != 'leer' and inferred_type != declared_type:
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Type Mismatch. "
                f"Cannot flow '{inferred_type}' into '{declared_type}' memory slot. "
                f"Assignment Blocked."
            )
            return narratives, "FAIL", symbol_table

        # -----------------------------------------------------------------
        # Check 7: Register literal operands as V_lit_ entries
        # -----------------------------------------------------------------
        self._register_literals(expr_tokens, symbol_table, narratives)

        # -----------------------------------------------------------------
        # Check 8: Bind target identifier
        # -----------------------------------------------------------------
        entry = symbol_table.bind(ident_name, declared_type, str_dim)
        narratives.append(
            f"[SEMANTICS] Binding {ident_name} to Symbol Table "
            f"as {declared_type} at offset {entry['offset']}."
        )
        narratives.append(
            f"[SEMANTICS] Data flowed to {ident_name}."
        )

        # -----------------------------------------------------------------
        # Check 9: Scope Lock
        # -----------------------------------------------------------------
        flushed = symbol_table.scope_lock()
        if flushed:
            narratives.append(
                f"[SYSTEM] Scope Lock engaged; flushing temporary math registers."
            )
        else:
            narratives.append(
                f"[SYSTEM] Scope Lock engaged; no intermediate registers to flush."
            )

        return narratives, "PASS", symbol_table

    def _analyze_zeige(self, inner, symbol_table, narratives):
        """[ zeige Ident ]"""
        ident_token = inner[1]
        ident_name  = ident_token['value']

        if not symbol_table.exists(ident_name):
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Unresolved Reference. "
                f"'{ident_name}' has not been bound to the Symbol Table."
            )
            return narratives, "FAIL", symbol_table

        if not ident_name.startswith('R_'):
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Result Routing Violation. "
                f"'zeige' can only output R_ identifiers. '{ident_name}' is not an output variable."
            )
            return narratives, "FAIL", symbol_table

        entry = symbol_table.lookup(ident_name)
        narratives.append(
            f"[SEMANTICS] Outputting '{ident_name}' of type '{entry['type']}' "
            f"from offset {entry['offset']}."
        )

        flushed = symbol_table.scope_lock()
        if flushed:
            narratives.append("[SYSTEM] Scope Lock engaged; flushing temporary math registers.")

        return narratives, "PASS", symbol_table

    def _analyze_lese(self, inner, symbol_table, narratives):
        """[ lese => Type Ident ]"""
        type_token  = inner[2]
        ident_token = inner[3]

        declared_type = type_token['value']
        ident_name    = ident_token['value']

        str_dim = None
        if type_token['type'] == 'TYPE_DIM':
            str_dim = int(type_token['value'].split('*')[0])
            declared_type = 'wort'

        # V_ immutability check
        if symbol_table.is_locked(ident_name):
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Immutability Violation. "
                f"V_ identifier '{ident_name}' is locked. Input values cannot be overwritten."
            )
            return narratives, "FAIL", symbol_table

        entry = symbol_table.bind(ident_name, declared_type, str_dim)
        narratives.append(
            f"[SEMANTICS] Input channel opened. Binding '{ident_name}' "
            f"as {declared_type} at offset {entry['offset']}."
        )

        flushed = symbol_table.scope_lock()
        if flushed:
            narratives.append("[SYSTEM] Scope Lock engaged; flushing temporary math registers.")

        return narratives, "PASS", symbol_table

    def _analyze_bau(self, inner, symbol_table, narratives):
        """[ bau Ident => objekt Ident ]"""
        source_token = inner[1]
        ident_token  = inner[4]

        source_name = source_token['value']
        ident_name  = ident_token['value']

        # Source must exist in symbol table
        if not symbol_table.exists(source_name):
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Unresolved Reference. "
                f"'{source_name}' has not been bound to the Symbol Table."
            )
            return narratives, "FAIL", symbol_table

        # V_ immutability on target
        if symbol_table.is_locked(ident_name):
            narratives.append(
                f"[SEMANTICS] FATAL ERROR: Immutability Violation. "
                f"V_ identifier '{ident_name}' is locked. Input values cannot be overwritten."
            )
            return narratives, "FAIL", symbol_table

        entry = symbol_table.bind(ident_name, 'objekt')
        narratives.append(
            f"[SEMANTICS] Instantiating object from '{source_name}'. "
            f"Binding '{ident_name}' as objekt at offset {entry['offset']}."
        )

        flushed = symbol_table.scope_lock()
        if flushed:
            narratives.append("[SYSTEM] Scope Lock engaged; flushing temporary math registers.")

        return narratives, "PASS", symbol_table

    def _analyze_control(self, inner, symbol_table, narratives):
        """[ wenn/solange Expr RelOp Expr -> ... ]"""
        keyword = inner[0]['value']

        # Find -> index
        arrow_idx = next((i for i, t in enumerate(inner) if t['type'] == 'ARROW_THEN'), -1)
        condition = inner[1:arrow_idx]

        # Check all identifiers in condition exist in symbol table
        for t in condition:
            if t['type'] in ('IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT'):
                if not symbol_table.exists(t['value']):
                    narratives.append(
                        f"[SEMANTICS] FATAL ERROR: Unresolved Reference. "
                        f"'{t['value']}' has not been bound to the Symbol Table."
                    )
                    return narratives, "FAIL", symbol_table

        narratives.append(
            f"[SEMANTICS] '{keyword}' condition validated. "
            f"All operands resolved. Passing control to body."
        )

        flushed = symbol_table.scope_lock()
        if flushed:
            narratives.append("[SYSTEM] Scope Lock engaged; flushing temporary math registers.")

        return narratives, "PASS", symbol_table

    # -------------------------------------------------------------------------
    # Type inference
    # -------------------------------------------------------------------------

    def _infer_type(self, expr_tokens, symbol_table, narratives):
        """
        Infer the result type of an expression.
        Returns (inferred_type, promoted, promotion_narrative).
        Handles: Promotion Rule, division rule, unary nicht, leer compatibility.
        """
        has_float   = any(t['type'] == 'FLOAT_LIT' for t in expr_tokens)
        has_int     = any(t['type'] == 'NUM_LIT' for t in expr_tokens)
        has_bool    = any(t['type'] == 'BOOL' for t in expr_tokens)
        has_str     = any(t['type'] in ('STR_LIT', 'TYPE_DIM') for t in expr_tokens)
        has_div     = any(t['type'] == 'OP_MATH' and t['value'] == '/' for t in expr_tokens)
        has_logic   = any(t['type'] == 'OP_LOGIC' for t in expr_tokens)
        has_leer    = any(t['type'] == 'BOOL' and t['value'] == 'leer' for t in expr_tokens)

        promoted = False
        promotion_narrative = ""

        # leer — compatible with any type
        if has_leer and not has_float and not has_int and not has_str and not has_bool:
            return 'leer', False, ""

        # String
        if has_str:
            return 'wort', False, ""

        # Boolean / logical expression
        if has_bool and not has_int and not has_float:
            return 'logik', False, ""

        if has_logic:
            return 'logik', False, ""

        # Division always yields gleitkomma (No-Loss Rule)
        if has_div:
            return 'gleitkomma', False, ""

        # Promotion Rule: zahl + gleitkomma → gleitkomma
        if has_float and has_int:
            int_tokens = [t['value'] for t in expr_tokens if t['type'] == 'NUM_LIT']
            promoted = True
            promotion_narrative = (
                f"[SEMANTICS] Successfully promoted "
                f"{', '.join(int_tokens)} to gleitkomma."
            )
            return 'gleitkomma', True, promotion_narrative

        if has_float:
            return 'gleitkomma', False, ""

        if has_int:
            return 'zahl', False, ""

        # Identifier — lookup from symbol table
        ident_token = next(
            (t for t in expr_tokens
             if t['type'] in ('IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT')),
            None
        )
        if ident_token:
            entry = symbol_table.lookup(ident_token['value'])
            if entry is None:
                narratives.append(
                    f"[SEMANTICS] FATAL ERROR: Unresolved Reference. "
                    f"'{ident_token['value']}' has not been bound to the Symbol Table."
                )
                return None, False, ""
            return entry['type'], False, ""

        narratives.append("[SEMANTICS] FATAL ERROR: Cannot infer type from expression.")
        return None, False, ""

    # -------------------------------------------------------------------------
    # Literal registration
    # -------------------------------------------------------------------------

    def _register_literals(self, expr_tokens, symbol_table, narratives):
        """
        Register numeric literals as anonymous V_lit_ entries.
        Mirrors Plankalkül's physical memory model — every value occupies a slot.
        Counter is persistent across statements.
        """
        for t in expr_tokens:
            if t['type'] == 'NUM_LIT':
                lit_name = f"V_lit_{t['value']}"
                if not symbol_table.exists(lit_name):
                    entry = symbol_table.bind(lit_name, 'zahl')
                    narratives.append(
                        f"[SEMANTICS] Registered literal {t['value']} "
                        f"as {lit_name} (zahl) at offset {entry['offset']}."
                    )

            elif t['type'] == 'FLOAT_LIT':
                lit_name = f"V_lit_{t['value'].replace('.', '_')}"
                if not symbol_table.exists(lit_name):
                    entry = symbol_table.bind(lit_name, 'gleitkomma')
                    narratives.append(
                        f"[SEMANTICS] Registered literal {t['value']} "
                        f"as {lit_name} (gleitkomma) at offset {entry['offset']}."
                    )