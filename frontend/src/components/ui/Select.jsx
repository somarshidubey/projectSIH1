import { forwardRef, useId } from 'react'
import { ChevronDown } from 'lucide-react'

const Select = forwardRef(({ label, error, options = [], className = '', ...props }, ref) => {
  const selectId = useId()

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          className={`
            w-full appearance-none rounded-lg border px-3 py-2 pr-10 text-sm
            bg-white text-slate-900
            dark:bg-slate-950 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            transition-colors duration-200
            ${error ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'}
            ${className}
          `}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
      {error && (
        <p className="text-sm text-rose-500" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

Select.displayName = 'Select'
export default Select