# Formats the [LEXER], [PARSER], [SEMANTICS] stories

class KalKylNarrator:
    """
    Aggregates narratives from each pipeline stage and formats them
    into a single human-readable story for the explainability layer.
    """

    STAGE_HEADERS = {
        'lexer':     '[ LEXER     ]',
        'parser':    '[ PARSER    ]',
        'semantics': '[ SEMANTICS ]',
        'system':    '[ SYSTEM    ]',
    }

    def format(self, lex_narratives, parse_narratives, sem_narratives,
               lex_status, parse_status, sem_status, symbol_table=None):
        """
        Build the full pipeline story string.

        Parameters
        ----------
        lex_narratives   : list[str] from KalKylLexer.tokenize()
        parse_narratives : list[str] from KalKylParser.parse()  ([] if skipped)
        sem_narratives   : list[str] from KalKylSemantics.analyze() ([] if skipped)
        lex_status       : "PASS" | "FAIL"
        parse_status     : "PASS" | "FAIL" | None
        sem_status       : "PASS" | "FAIL" | None
        symbol_table     : KalKylSymbolTable instance (optional, for display)

        Returns
        -------
        str  — the formatted story
        """
        lines = []

        lines.append("=" * 60)
        lines.append("  KalKyl — Pipeline Narrative")
        lines.append("=" * 60)

        # --- Lexer section ---
        lines.append("")
        lines.append("─── LEXICAL ANALYSIS ───────────────────────────────────")
        for n in lex_narratives:
            lines.append(f"  {n}")
        lines.append(f"  Status: {lex_status}")

        if lex_status == "FAIL":
            lines.append("")
            lines.append("  Pipeline halted at LEXER stage.")
            lines.append("=" * 60)
            return "\n".join(lines)

        # --- Parser section ---
        lines.append("")
        lines.append("─── SYNTAX ANALYSIS ────────────────────────────────────")
        for n in parse_narratives:
            lines.append(f"  {n}")
        lines.append(f"  Status: {parse_status}")

        if parse_status == "FAIL":
            lines.append("")
            lines.append("  Pipeline halted at PARSER stage.")
            lines.append("=" * 60)
            return "\n".join(lines)

        # --- Semantics section ---
        lines.append("")
        lines.append("─── SEMANTIC ANALYSIS ──────────────────────────────────")
        for n in sem_narratives:
            lines.append(f"  {n}")
        lines.append(f"  Status: {sem_status}")

        # --- Symbol table section ---
        if symbol_table is not None:
            lines.append("")
            lines.append("─── SYMBOL TABLE ───────────────────────────────────────")
            lines.append(symbol_table.display())

        lines.append("")
        overall = sem_status if sem_status else "FAIL"
        lines.append(f"  Overall Result: {overall}")
        lines.append("=" * 60)

        return "\n".join(lines)

    def format_error(self, stage, message):
        """Format a standalone error message outside the normal pipeline."""
        return (
            f"{'=' * 60}\n"
            f"  KalKyl — {stage.upper()} Error\n"
            f"{'=' * 60}\n"
            f"  {message}\n"
            f"{'=' * 60}"
        )
