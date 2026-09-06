import { forwardRef } from 'react'
import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
  danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-sm',
  success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm',
  ghost:
    'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const Button = forwardRef(
  ({ variant = 'primary', size = 'md', loading = false, disabled = false, className = '', children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={`
          inline-flex items-center justify-center gap-2 font-medium rounded-lg
          transition-colors duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50
          dark:focus-visible:ring-offset-slate-950
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variants[variant] || variants.primary} ${sizes[size]} ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'
export default Button