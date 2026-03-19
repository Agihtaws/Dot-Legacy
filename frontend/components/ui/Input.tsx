interface InputProps {
  label?:       string
  placeholder?: string
  value:        string
  onChange:     (v: string) => void
  error?:       string
  hint?:        string
  type?:        string
  disabled?:    boolean
  className?:   string
}
 
export function Input({
  label, placeholder, value, onChange,
  error, hint, type = 'text', disabled = false, className = '',
}: InputProps) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {label && (
        <label style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          fontSize:   '12px',
          color:      '#D1D5DB',
          letterSpacing: '0.01em',
        }}>
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width:        '100%',
          padding:      '10px 14px',
          borderRadius: '10px',
          fontSize:     '13px',
          fontFamily:   'var(--font-body)',
          fontWeight:   400,
          color:        '#FFFFFF',
          background:   'rgba(15,15,26,0.95)',
          border:       error ? '1px solid rgba(239,68,68,0.6)' : '1px solid #252538',
          transition:   'border-color 0.15s ease, box-shadow 0.15s ease',
          opacity:      disabled ? 0.5 : 1,
          cursor:       disabled ? 'not-allowed' : 'text',
          outline:      'none',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.8)' : 'rgba(230,0,122,0.6)'
          e.currentTarget.style.boxShadow   = error
            ? '0 0 0 3px rgba(239,68,68,0.12)'
            : '0 0 0 3px rgba(230,0,122,0.12)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.6)' : '#252538'
          e.currentTarget.style.boxShadow   = 'none'
        }}
      />
      {error && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          fontSize:   '11px',
          color:      '#F87171',
        }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          fontSize:   '11px',
          color:      '#4B5563',
        }}>
          {hint}
        </p>
      )}
    </div>
  )
}