import { useState } from 'react'

export function KalKylPanel({ onClose }) {
  const [source, setSource] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  async function compile() {
    if (!source.trim()) return
    setLoading(true)
    setOutput('')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ''}/api/compile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const data = await res.json()
      setOutput(data.output)
    } catch {
      setOutput('Error: Could not reach KalKyl server.\nMake sure server.py is running:\n  python server.py')
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      compile()
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: '8%',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '640px',
      background: '#0e0e0e',
      color: '#e0e0e0',
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '18px 20px',
      fontFamily: '"Courier New", Courier, monospace',
      zIndex: 9999,
      boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ color: '#7aa2f7', fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
          KalKyl Compiler
        </span>
        <span style={{ color: '#555', fontSize: '11px' }}>Ctrl+K to toggle &nbsp;|&nbsp; Ctrl+Enter to compile</span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
        >
          ×
        </button>
      </div>

      {/* Input */}
      <textarea
        value={source}
        onChange={e => setSource(e.target.value)}
        onKeyDown={handleKey}
        placeholder="[ 10 + 5.5 => gleitkomma R_output ]"
        rows={2}
        style={{
          width: '100%',
          background: '#1a1a1a',
          color: '#c0caf5',
          border: '1px solid #2a2a2a',
          borderRadius: '4px',
          padding: '8px 10px',
          fontFamily: 'inherit',
          fontSize: '13px',
          resize: 'vertical',
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {/* Compile button */}
      <button
        onClick={compile}
        disabled={loading}
        style={{
          marginTop: '8px',
          padding: '6px 20px',
          background: loading ? '#1e3a6e' : '#2a5298',
          color: loading ? '#888' : '#fff',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontFamily: 'inherit',
        }}
      >
        {loading ? 'Compiling...' : 'Compile'}
      </button>

      {/* Output */}
      {output && (
        <pre style={{
          marginTop: '14px',
          background: '#050505',
          border: '1px solid #1f1f1f',
          borderRadius: '4px',
          padding: '12px',
          fontSize: '11px',
          maxHeight: '340px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: output.includes('FATAL') || output.includes('halted') ? '#f7768e' : '#9ece6a',
          lineHeight: '1.5',
        }}>
          {output}
        </pre>
      )}
    </div>
  )
}
