'use client'

import { ReactNode } from 'react'

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
}

export function Button({
  children, onClick,
  type = 'button', variant = 'primary', size = 'md',
  disabled = false, loading = false, fullWidth = false, className = '',
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0F] disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary:   'bg-[#E6007A] hover:bg-[#FF2D9B] text-white focus:ring-[#E6007A] shadow-lg shadow-[#E6007A]/20',
    secondary: 'bg-[#1A1A2E] hover:bg-[#22223A] text-white border border-[#2E2E4E] focus:ring-[#E6007A]',
    danger:    'bg-red-600 hover:bg-red-500 text-white focus:ring-red-500',
    ghost:     'bg-transparent hover:bg-[#1A1A2E] text-gray-400 hover:text-white focus:ring-[#E6007A]',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2',
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {loading && (
        <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}