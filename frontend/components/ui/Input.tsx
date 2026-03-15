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

export function Input({ label, placeholder, value, onChange, error, hint, type = 'text', disabled = false, className = '' }: InputProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <label className="text-sm font-medium text-gray-300">{label}</label>}
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} disabled={disabled}
        className={`w-full px-4 py-2.5 rounded-xl text-sm bg-[#0F0F1A] text-white placeholder-gray-600
          border transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-400 focus:ring-1 focus:ring-red-500'
                  : 'border-[#2E2E4E] focus:border-[#E6007A] focus:ring-1 focus:ring-[#E6007A]/50'}`}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  )
}