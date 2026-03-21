import copy

class KalKylSymbolTable:
    def __init__(self):
        self.table = {}   # name -> entry dict
        self.level = 0    # current scope level

        # Type sizes in bytes — mirrors Plankalkül's physical memory model
        self.TYPE_SIZES = {
            'zahl':       4,   # integer is 4 bytes
            'gleitkomma': 8,   # float is 8 bytes
            'wort':       1,   # character is 1 byte (multiplied by str_dim)
            'logik':      1,
            'objekt':     4,
        }

    # -------------------------------------------------------------------------
    # Core operations
    # -------------------------------------------------------------------------

    def bind(self, name, type_, str_dim=None):
        """
        Bind an identifier into the symbol table.
        Computes offset as running total of all current entries at this level.
        str_dim is required for wort/TYPE_DIM entries.
        Returns existing entry without overwriting if already bound.
        """
        if name in self.table:
            return self.table[name]

        offset = self._compute_offset()
        size = self._compute_size(type_, str_dim)
        locked = name.startswith('V_')

        self.table[name] = {
            'name':    name,
            'type':    type_,
            'level':   self.level,
            'offset':  offset,
            'size':    size,
            'locked':  locked,
        }

        return self.table[name]

    def lookup(self, name):
        """Return entry dict or None."""
        return self.table.get(name, None)

    def exists(self, name):
        """Check if identifier is already bound."""
        return name in self.table

    def is_locked(self, name):
        """Check if identifier is immutable (V_ entries)."""
        entry = self.lookup(name)
        return entry is not None and entry['locked']

    def scope_lock(self):
        """
        Flush all Z_ identifiers from the symbol table.
        Returns list of flushed names for narrative generation.
        Honors Plankalkül's volatile scratchpad memory model.
        Decrements scope level if inside a nested block.
        """
        flushed = [name for name in list(self.table) if name.startswith('Z_')]
        for name in flushed:
            del self.table[name]
        if self.level > 0:
            self.level -= 1
        return flushed

    def enter_scope(self):
        """
        Increment scope level when entering a nested block.
        Hook for future solange/wenn nested block support.
        """
        self.level += 1

    def reset(self):
        """
        Full reset — clears all entries and resets level to 0.
        Called between separate program executions from the frontend.
        """
        self.table = {}
        self.level = 0

    # -------------------------------------------------------------------------
    # Display
    # -------------------------------------------------------------------------

    def display(self):
        """
        Returns formatted symbol table string for explainability layer.
        Mirrors the exact format from the test case doc.
        """
        if not self.table:
            return "[SYMBOL TABLE] Empty."

        lines = []
        lines.append(f"{'Identifier':<20} {'Data Type':<14} {'Level':<8} {'Offset'}")
        lines.append("-" * 55)
        for entry in self.table.values():
            lines.append(
                f"{entry['name']:<20} {entry['type']:<14} {entry['level']:<8} {entry['offset']}"
            )
        lines.append("-" * 55)
        lines.append(f"Total Space of Level {self.level}: {self.total_size()} bytes")
        return "\n".join(lines)

    def total_size(self):
        """Sum of all entry sizes at current level."""
        return sum(e['size'] for e in self.table.values())

    def to_dict(self):
        """
        Return deep copy of table dict — for frontend consumption.
        Deep copy prevents frontend or semantics from mutating live table entries.
        """
        return copy.deepcopy(self.table)

    # -------------------------------------------------------------------------
    # Internal helpers
    # -------------------------------------------------------------------------

    def _compute_offset(self):
        """Offset = sum of sizes of all currently bound entries."""
        return sum(e['size'] for e in self.table.values())

    def _compute_size(self, type_, str_dim=None):
        """
        Compute byte size of a type.
        wort/TYPE_DIM: str_dim slots × 1 byte per character.
        Mirrors Plankalkül's m × n × S0 bit-grid memory model.
        Falls back to 4 bytes if str_dim not provided.
        """
        if type_ in ('wort', 'TYPE_DIM'):
            return str_dim * self.TYPE_SIZES['wort'] if str_dim is not None else 4
        return self.TYPE_SIZES.get(type_, 4)