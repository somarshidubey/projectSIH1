import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

export default function LearningPathStep({ step, index = 0 }) {
  const isHighPriority = step.action === 'Complete'

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-center gap-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60"
    >
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${
          isHighPriority ? 'bg-rose-500' : 'bg-amber-500'
        }`}
      >
        {step.step}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900 dark:text-slate-100">{step.course}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {step.competency} • {step.duration_hours}hrs
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isHighPriority
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400'
          }`}
        >
          {step.action}
        </span>
        <a
          href={step.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 transition-colors hover:text-indigo-600 dark:hover:text-indigo-400"
          aria-label={`Open ${step.course} on iGOT`}
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </motion.div>
  )
}