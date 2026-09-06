import { forwardRef, useId } from 'react'

const Input = forwardRef(({ label, error, hint, className = '', ...props }, ref) => {
  const inputId = useId()

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`
          w-full rounded-lg border px-3 py-2 text-sm
          bg-white text-slate-900
          placeholder-slate-400
          dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
          transition-colors duration-200
          ${error ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-300 dark:border-slate-700'}
          ${className}
        `}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-rose-500" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  )
})

Input.displayName = 'Input'
export default Input