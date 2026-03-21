# symbol_table_test.py
# Full test harness for KalKylSymbolTable

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from symbol_table import KalKylSymbolTable

passed = 0
failed = 0


def check(label, actual, expected):
    global passed, failed
    ok = actual == expected
    mark = "PASS" if ok else "FAIL"
    if not ok:
        print(f"  {mark} — {label}")
        print(f"         expected: {expected!r}")
        print(f"         actual  : {actual!r}")
        failed += 1
    else:
        print(f"  {mark} — {label}")
        passed += 1


def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


# =============================================================================
# BIND & LOOKUP
# =============================================================================
section("BIND — basic binding and lookup")

st = KalKylSymbolTable()
entry = st.bind('Z_result', 'zahl')

check("bind returns entry dict",        isinstance(entry, dict),         True)
check("entry name",                     entry['name'],                   'Z_result')
check("entry type",                     entry['type'],                   'zahl')
check("entry level",                    entry['level'],                  0)
check("entry offset starts at 0",       entry['offset'],                 0)
check("entry size for zahl",            entry['size'],                   4)
check("entry locked=False for Z_",      entry['locked'],                 False)
check("exists() after bind",            st.exists('Z_result'),           True)
check("lookup() returns same entry",    st.lookup('Z_result')['type'],   'zahl')

# =============================================================================
# TYPE SIZES
# =============================================================================
section("BIND — type sizes")

st2 = KalKylSymbolTable()
st2.bind('V_a', 'zahl')
st2.bind('V_b', 'gleitkomma')
st2.bind('V_c', 'logik')
st2.bind('V_d', 'objekt')
st2.bind('V_e', 'wort', str_dim=6)

check("zahl size = 4",       st2.lookup('V_a')['size'],  4)
check("gleitkomma size = 8", st2.lookup('V_b')['size'],  8)
check("logik size = 1",      st2.lookup('V_c')['size'],  1)
check("objekt size = 4",     st2.lookup('V_d')['size'],  4)
check("wort(6) size = 6",    st2.lookup('V_e')['size'],  6)

# =============================================================================
# OFFSET ACCUMULATION
# =============================================================================
section("BIND — offset accumulation")

st3 = KalKylSymbolTable()
e1 = st3.bind('V_x', 'zahl')        # size 4, offset 0
e2 = st3.bind('V_y', 'gleitkomma')  # size 8, offset 4
e3 = st3.bind('V_z', 'logik')       # size 1, offset 12

check("first entry offset = 0",   e1['offset'],  0)
check("second entry offset = 4",  e2['offset'],  4)
check("third entry offset = 12",  e3['offset'],  12)
check("total_size = 13",          st3.total_size(), 13)

# =============================================================================
# V_ IMMUTABILITY (LOCK)
# =============================================================================
section("LOCK — V_ identifiers are locked")

st4 = KalKylSymbolTable()
st4.bind('V_speed', 'zahl')
st4.bind('Z_temp', 'zahl')

check("V_ is locked",    st4.is_locked('V_speed'),  True)
check("Z_ is not locked", st4.is_locked('Z_temp'),  False)
check("unbound is not locked", st4.is_locked('V_ghost'), False)

# =============================================================================
# RE-BIND (silent no-op)
# =============================================================================
section("BIND — re-binding returns existing entry without overwrite")

st5 = KalKylSymbolTable()
st5.bind('R_output', 'zahl')
e_original = st5.lookup('R_output')
e_rebind   = st5.bind('R_output', 'gleitkomma')  # should not overwrite

check("re-bind returns existing type",   e_rebind['type'],  'zahl')
check("table entry unchanged",           st5.lookup('R_output')['type'], 'zahl')

# =============================================================================
# SCOPE LOCK — Z_ flush
# =============================================================================
section("SCOPE LOCK — Z_ flush")

st6 = KalKylSymbolTable()
st6.bind('V_x', 'zahl')
st6.bind('Z_temp1', 'zahl')
st6.bind('Z_temp2', 'gleitkomma')

flushed = st6.scope_lock()

check("flushed list contains Z_temp1",  'Z_temp1' in flushed,       True)
check("flushed list contains Z_temp2",  'Z_temp2' in flushed,       True)
check("Z_temp1 removed from table",     st6.exists('Z_temp1'),      False)
check("Z_temp2 removed from table",     st6.exists('Z_temp2'),      False)
check("V_x survives scope lock",        st6.exists('V_x'),          True)
check("flushed count = 2",              len(flushed),                2)

# =============================================================================
# SCOPE LOCK — nothing to flush
# =============================================================================
section("SCOPE LOCK — no Z_ identifiers")

st7 = KalKylSymbolTable()
st7.bind('V_count', 'zahl')
flushed_none = st7.scope_lock()

check("empty flush returns []",  flushed_none, [])

# =============================================================================
# ENTER SCOPE — level tracking
# =============================================================================
section("ENTER SCOPE — level increment")

st8 = KalKylSymbolTable()
check("initial level = 0",   st8.level,  0)
st8.enter_scope()
check("after enter = 1",     st8.level,  1)
st8.scope_lock()
check("after lock = 0",      st8.level,  0)

# =============================================================================
# RESET
# =============================================================================
section("RESET — full clear")

st9 = KalKylSymbolTable()
st9.bind('V_a', 'zahl')
st9.bind('Z_b', 'gleitkomma')
st9.enter_scope()
st9.reset()

check("table empty after reset",  len(st9.table),  0)
check("level reset to 0",         st9.level,       0)

# =============================================================================
# DISPLAY
# =============================================================================
section("DISPLAY — empty table")

st10 = KalKylSymbolTable()
check("empty display text", st10.display(), "[SYMBOL TABLE] Empty.")

section("DISPLAY — populated table")

st11 = KalKylSymbolTable()
st11.bind('V_speed', 'zahl')
st11.bind('R_output', 'gleitkomma')
display = st11.display()

check("display contains header",      'Identifier' in display,   True)
check("display contains V_speed",     'V_speed'    in display,   True)
check("display contains R_output",    'R_output'   in display,   True)
check("display contains total size",  'Total Space' in display,  True)

# =============================================================================
# TO_DICT — deep copy isolation
# =============================================================================
section("TO_DICT — mutation isolation")

st12 = KalKylSymbolTable()
st12.bind('V_x', 'zahl')
d = st12.to_dict()
d['V_x']['type'] = 'gleitkomma'   # mutate the copy

check("original entry not mutated", st12.lookup('V_x')['type'],  'zahl')

# =============================================================================
# WORT / TYPE_DIM SIZE
# =============================================================================
section("BIND — wort without str_dim falls back to 4")

st13 = KalKylSymbolTable()
e = st13.bind('Z_word', 'wort')  # no str_dim provided
check("wort fallback size = 4", e['size'], 4)

st14 = KalKylSymbolTable()
e2 = st14.bind('R_name', 'wort', str_dim=10)
check("wort(10) size = 10", e2['size'], 10)

# =============================================================================
# SUMMARY
# =============================================================================
print(f"\n{'='*60}")
print(f"  Results: {passed} passed, {failed} failed")
print(f"{'='*60}")
