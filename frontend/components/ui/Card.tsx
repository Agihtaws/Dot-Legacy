import { ReactNode, CSSProperties } from 'react'
 
interface CardProps {
  children:   ReactNode
  className?: string
  padding?:   'sm' | 'md' | 'lg'
  style?:     CSSProperties
}
 
const PADDING = { sm: '16px', md: '24px', lg: '32px' }
 
export function Card({ children, className = '', padding = 'md', style = {} }: CardProps) {
  return (
    <div
      className={className}
      style={{
        position:    'relative',
        background:  'rgba(17,17,24,0.85)',
        border:      '1px solid #1E1E2E',
        borderRadius:'18px',
        padding:     PADDING[padding],
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        overflow:    'hidden',
        ...style,
      }}
    >
      {/* top accent line */}
      <div aria-hidden style={{
        position:   'absolute',
        top:        0, left: 0, right: 0,
        height:     '1px',
        background: 'linear-gradient(90deg, transparent, rgba(230,0,122,0.3), transparent)',
        pointerEvents: 'none',
      }} />
      {children}
    </div>
  )
}
 
export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={className} style={{ marginBottom: '20px' }}>
      {children}
    </div>
  )
}