"""
Plankalkül 2D Grid Builder
--------------------------
Converts a compiled KalKyl token stream + symbol table into the historically
accurate 3-row tabular structure Konrad Zuse used in Plankalkül (1945):

  V  | formula row  — the expression operands and operators
  K  | index row    — component subscript (0 for scalars)
  T  | type row     — data type abbreviation per operand

Type abbreviations (Zuse's originals, adapted to KalKyl types):
  S    = Standard integer  (zahl)
  GZ   = Gleitkommazahl    (gleitkomma / float)
  f N  = Folge of N chars  (N*wort / string, N = byte length)
  J/N  = Ja/Nein boolean   (logik)
  Obj  = Objekt            (objekt)
  —    = null / leer
"""


# Maps KalKyl declared types → Plankalkül abbreviations
_TYPE_ABBREV = {
    'zahl':       'S',
    'gleitkomma': 'GZ',
    'wort':       'f',    # subscript carries the length
    'logik':      'J/N',
    'objekt':     'Obj',
    'leer':       '\u2014',  # em-dash
}

# Maps grammar rule keys → German rule names (historically accurate)
_RULE_NAMES = {
    'assignment':      'ZUWEISUNG',
    'action_zeige':    'AUSGABE',
    'action_lese':     'EINGABE',
    'action_bau':      'KONSTRUKTION',
    'control_wenn':    'BEDINGUNG',
    'control_solange': 'SCHLEIFE',
    'control_sonst':   'ALTERNATIV',
}

# Operators that carry no type/index annotation
_OP_KINDS = {'OP_MATH', 'OP_REL', 'OP_LOGIC', 'KEYWORD', 'ACTION'}

# Prettier operator glyphs
_OP_GLYPH = {
    '*':  '\u00d7',  # ×
    '/':  '\u00f7',  # ÷
    '=>': '\u2192',  # →
    '->': '\u2192',  # →
    '!=': '\u2260',  # ≠
    '>=': '\u2265',  # ≥
    '<=': '\u2264',  # ≤
}


def _resolve_type(tok, symbol_table):
    """Return the Plankalkül type abbreviation for a single token."""
    kind = tok['type']

    if kind == 'NUM_LIT':
        return 'S'

    if kind == 'FLOAT_LIT':
        return 'GZ'

    if kind == 'STR_LIT':
        # value looks like  6*wort "KalKyl"
        dim = tok['value'].split('*')[0]
        return f'f {dim}'

    if kind == 'BOOL':
        return '\u2014' if tok['value'] == 'leer' else 'J/N'

    if kind in ('IDENT_INPUT', 'IDENT_INTER', 'IDENT_RESULT'):
        if symbol_table:
            entry = symbol_table.lookup(tok['value'])
            if entry:
                base = _TYPE_ABBREV.get(entry['type'], entry['type'])
                # for strings, append the byte-length as subscript
                if entry['type'] == 'wort' and entry.get('str_dim'):
                    return f'f {entry["str_dim"]}'
                return base
        return '?'

    return ''


def _make_col(formula, index='', typ=''):
    return {'formula': formula, 'index': index, 'type': typ}


def _operand_col(tok, symbol_table):
    """Column for a value-bearing token (literal or identifier)."""
    return _make_col(
        _OP_GLYPH.get(tok['value'], tok['value']),
        '0',
        _resolve_type(tok, symbol_table),
    )


def _operator_col(tok):
    """Column for an operator / keyword — no index or type."""
    return _make_col(_OP_GLYPH.get(tok['value'], tok['value']))


def build_grid(tokens, rule, symbol_table):
    """
    Build the Plankalkül 2D grid for a successfully compiled statement.

    Returns:
        {
          'rule':      str  — internal rule key
          'rule_name': str  — German rule name for display
          'columns':   list of {'formula': str, 'index': str, 'type': str}
        }
    """
    inner = [t for t in tokens
             if t['type'] not in ('BRACKET_OPEN', 'BRACKET_CLOSE')]
    cols = []

    # ── ZUWEISUNG  [ Expr => Type Ident ] ────────────────────────────────
    if rule == 'assignment':
        assign_idx = next(
            (i for i, t in enumerate(inner) if t['type'] == 'ASSIGN'), -1)

        expr      = inner[:assign_idx] if assign_idx >= 0 else inner
        type_tok  = inner[assign_idx + 1] if assign_idx >= 0 and assign_idx + 1 < len(inner) else None
        ident_tok = inner[assign_idx + 2] if assign_idx >= 0 and assign_idx + 2 < len(inner) else None

        for tok in expr:
            if tok['type'] in _OP_KINDS:
                cols.append(_operator_col(tok))
            else:
                cols.append(_operand_col(tok, symbol_table))

        cols.append(_make_col('\u2192'))  # →

        if ident_tok and type_tok:
            if type_tok['type'] == 'TYPE_DIM':
                dim = type_tok['value'].split('*')[0]
                abbrev = f'f {dim}'
            else:
                abbrev = _TYPE_ABBREV.get(type_tok['value'], type_tok['value'])
            cols.append(_make_col(ident_tok['value'], '0', abbrev))

    # ── AUSGABE  [ zeige Ident ] ──────────────────────────────────────────
    elif rule == 'action_zeige':
        cols.append(_make_col('zeige'))
        if len(inner) > 1:
            cols.append(_operand_col(inner[1], symbol_table))

    # ── EINGABE  [ lese => Type Ident ] ──────────────────────────────────
    elif rule == 'action_lese':
        cols.append(_make_col('lese'))
        cols.append(_make_col('\u2192'))
        if len(inner) >= 4:
            type_tok  = inner[2]
            ident_tok = inner[3]
            if type_tok['type'] == 'TYPE_DIM':
                dim    = type_tok['value'].split('*')[0]
                abbrev = f'f {dim}'
            else:
                abbrev = _TYPE_ABBREV.get(type_tok['value'], type_tok['value'])
            cols.append(_make_col(ident_tok['value'], '0', abbrev))

    # ── KONSTRUKTION  [ bau Ident => objekt Ident ] ───────────────────────
    elif rule == 'action_bau':
        cols.append(_make_col('bau'))
        if len(inner) > 1:
            cols.append(_operand_col(inner[1], symbol_table))
        cols.append(_make_col('\u2192'))
        if len(inner) > 4:
            cols.append(_make_col(inner[4]['value'], '0', 'Obj'))

    # ── BEDINGUNG / SCHLEIFE  [ wenn/solange Cond -> ... ] ───────────────
    elif rule in ('control_wenn', 'control_solange'):
        for tok in inner:
            if tok['type'] == 'ARROW_THEN':
                cols.append(_make_col('\u2192'))
            elif tok['type'] == 'KEYWORD':
                cols.append(_make_col(tok['value']))
            elif tok['type'] in _OP_KINDS:
                cols.append(_operator_col(tok))
            else:
                cols.append(_operand_col(tok, symbol_table))

    # ── ALTERNATIV  [ sonst -> ... ] ─────────────────────────────────────
    elif rule == 'control_sonst':
        cols.append(_make_col('sonst'))
        cols.append(_make_col('\u2192'))

    return {
        'rule':      rule or 'unknown',
        'rule_name': _RULE_NAMES.get(rule, (rule or 'UNBEKANNT').upper()),
        'columns':   cols,
    }
