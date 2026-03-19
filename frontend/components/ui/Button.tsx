'use client'

import { ReactNode, CSSProperties } from 'react'

interface ButtonProps {
  children:   ReactNode
  onClick?:   () => void
  type?:      'button' | 'submit'
  variant?:   'primary' | 'secondary' | 'danger' | 'ghost'
  size?:      'sm' | 'md' | 'lg'
  disabled?:  boolean
  loading?:   boolean
  fullWidth?: boolean
  className?: string
  style?:     CSSProperties
}

const VARIANT_STYLES: Record<string, CSSProperties> = {
  primary: {
    background: 'linear-gradient(135deg, #E6007A 0%, #C4006A 100%)',
    color:      '#FFFFFF',
    border:     'none',
    boxShadow:  '0 4px 16px rgba(230,0,122,0.28)',
  },
  secondary: {
    background: 'rgba(17,17,24,0.9)',
    color:      '#D1D5DB',
    border:     '1px solid #252538',
    boxShadow:  'none',
  },
  danger: {
    background: 'rgba(127,29,29,0.5)',
    color:      '#FCA5A5',
    border:     '1px solid rgba(239,68,68,0.4)',
    boxShadow:  'none',
  },
  ghost: {
    background: 'transparent',
    color:      '#9CA3AF',
    border:     '1px solid transparent',
    boxShadow:  'none',
  },
}

const SIZE_STYLES: Record<string, CSSProperties> = {
  sm: { padding: '7px 14px',  fontSize: '12px', gap: '6px',  borderRadius: '8px'  },
  md: { padding: '10px 22px', fontSize: '13px', gap: '7px',  borderRadius: '10px' },
  lg: { padding: '13px 28px', fontSize: '14px', gap: '8px',  borderRadius: '12px' },
}

function Spinner() {
  return (
    <span style={{
      width:         '14px',
      height:        '14px',
      borderRadius:  '50%',
      border:        '2px solid rgba(255,255,255,0.15)',
      borderTopColor:'currentColor',
      display:       'inline-block',
      flexShrink:    0,
      animation:     'spin 0.7s linear infinite',
    }} />
  )
}

export function Button({
  children, onClick,
  type = 'button', variant = 'primary', size = 'md',
  disabled = false, loading = false, fullWidth = false,
  className = '', style = {},
}: ButtonProps) {
  const isDisabled = disabled || loading

  const base: CSSProperties = {
    display:       'inline-flex',
    alignItems:    'center',
    justifyContent:'center',
    fontFamily:    'var(--font-body)',
    fontWeight:    600,
    letterSpacing: '0.01em',
    cursor:        isDisabled ? 'not-allowed' : 'pointer',
    opacity:       isDisabled ? 0.45 : 1,
    transition:    'transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
    width:         fullWidth ? '100%' : undefined,
    whiteSpace:    'nowrap',
    userSelect:    'none',
    WebkitUserSelect: 'none',
    textDecoration:'none',
    position:      'relative',
    overflow:      'hidden',
    ...VARIANT_STYLES[variant],
    ...SIZE_STYLES[size],
    ...style,
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
    if (isDisabled) return
    const el = e.currentTarget
    el.style.transform = 'translateY(-1px)'
    if (variant === 'primary')    { el.style.boxShadow = '0 6px 24px rgba(230,0,122,0.38)' }
    if (variant === 'secondary')  { el.style.borderColor = 'rgba(230,0,122,0.4)'; el.style.color = '#fff' }
    if (variant === 'danger')     { el.style.background = 'rgba(127,29,29,0.75)' }
    if (variant === 'ghost')      { el.style.background = 'rgba(255,255,255,0.05)'; el.style.color = '#fff' }
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
    const el = e.currentTarget
    el.style.transform = 'translateY(0)'
    if (variant === 'primary')    { el.style.boxShadow = '0 4px 16px rgba(230,0,122,0.28)' }
    if (variant === 'secondary')  { el.style.borderColor = '#252538'; el.style.color = '#D1D5DB' }
    if (variant === 'danger')     { el.style.background = 'rgba(127,29,29,0.5)' }
    if (variant === 'ghost')      { el.style.background = 'transparent'; el.style.color = '#9CA3AF' }
  }

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isDisabled) e.currentTarget.style.transform = 'translateY(0) scale(0.98)'
  }

  function handleMouseUp(e: React.MouseEvent<HTMLButtonElement>) {
    if (!isDisabled) e.currentTarget.style.transform = 'translateY(-1px) scale(1)'
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={base}
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}