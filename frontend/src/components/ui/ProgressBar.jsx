import { motion } from 'framer-motion'

export default function ProgressBar({ value = 0, max = 100, color = 'indigo', label, showValue = true, size = 'md' }) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colors = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    orange: 'bg-[#cf492c]',
  }

  const heights = {
    sm: 'h-1.5',
    md: 'h-3',
    lg: 'h-4',
  }

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="mb-1.5 flex items-center justify-between">
          {label && <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>}
          {showValue && (
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full rounded-full bg-slate-200 dark:bg-slate-700/60 ${heights[size]}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`${heights[size]} ${colors[color]} rounded-full`}
        />
      </div>
    </div>
  )
}