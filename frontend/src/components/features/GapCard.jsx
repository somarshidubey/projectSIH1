import { motion } from 'framer-motion'
import { AlertTriangle, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react'
import Badge from '../ui/Badge'

export default function GapCard({ gap, index = 0 }) {
  const icons = {
    high: <AlertTriangle className="h-5 w-5 text-rose-500" aria-hidden="true" />,
    medium: <TrendingUp className="h-5 w-5 text-amber-500" aria-hidden="true" />,
    none: <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />,
  }

  const priorityStyles = {
    high: 'bg-rose-50 border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30',
    medium: 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30',
    none: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30',
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex items-center justify-between rounded-lg border p-4 transition-colors ${priorityStyles[gap.priority] || priorityStyles.none}`}
    >
      <div className="flex items-center gap-3">
        {icons[gap.priority] || icons.none}
        <div>
          <h4 className="font-medium text-slate-900 dark:text-slate-100">{gap.name}</h4>
          <p className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            Level {gap.current_level}
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
            Level {gap.required_level} needed
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {gap.gap > 0 ? `-${gap.gap}` : '✓'}
        </span>
        <Badge variant={gap.priority}>{gap.priority}</Badge>
      </div>
    </motion.div>
  )
}