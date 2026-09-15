import { motion } from 'framer-motion'
import { AlertTriangle, TrendingUp, CheckCircle2, ArrowRight, ScanSearch, Loader2 } from 'lucide-react'
import Card from '../ui/Card'
import ProgressBar from '../ui/ProgressBar'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import { useAgent } from '../../context/AgentContext'

const priorityTone = {
  high: 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10',
  medium: 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10',
  none: 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10',
}

const priorityIcon = {
  high: <AlertTriangle className="h-5 w-5 text-rose-500" aria-hidden="true" />,
  medium: <TrendingUp className="h-5 w-5 text-amber-500" aria-hidden="true" />,
  none: <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />,
}

function GapFinding({ gap, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`rounded-lg border p-4 ${priorityTone[gap.priority] || priorityTone.none}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {priorityIcon[gap.priority] || priorityIcon.none}
          <div>
            <h4 className="font-medium text-slate-900 dark:text-slate-100">{gap.name}</h4>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Level {gap.current_level}
              <ArrowRight className="mx-1 inline h-3 w-3" aria-hidden="true" />
              Level {gap.required_level} needed • {Math.round(gap.mastery_probability * 100)}% mastery
              {gap.status === 'assessing' && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-[#cf492c]">
                  <ScanSearch className="h-3 w-3" aria-hidden="true" /> assessing…
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {gap.gap > 0 ? (
            <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">-{gap.gap}</span>
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          )}
          <Badge variant={gap.priority}>{gap.priority}</Badge>
        </div>
      </div>

      {gap.reasoning && (
        <p className="mt-3 border-t border-slate-200/80 pt-2.5 text-xs leading-relaxed text-slate-600 dark:border-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-700 dark:text-slate-200">Why the mentor flagged this: </span>
          {gap.reasoning}
        </p>
      )}

      {gap.evidence_count > 0 && (
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {gap.evidence_count} question(s) answered in the live interview • confidence{' '}
          {Math.round((gap.evidence_count / 2) * 100)}%
        </p>
      )}
    </motion.div>
  )
}

export default function GapAnalysisTab() {
  const { state } = useAgent()
  const gaps = state?.gaps || {}
  const strengths = state?.strengths || {}

  if (state?.status === 'idle' || state?.status === 'loading') {
    return (
      <Card className="flex h-full flex-col items-center justify-center py-20">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#cf492c]" aria-hidden="true" />
        <p className="text-sm text-slate-500">Waiting for the AI mentor to start…</p>
      </Card>
    )
  }

  if (!state?.session_id) {
    return (
      <Card className="h-full">
        <EmptyState
          icon="search"
          title="No interview yet"
          description="Answer the Karmayogi AI Mentor's questions on the left — your competency gaps will appear here live as the interview progresses."
        />
      </Card>
    )
  }

  const gapList = Object.values(gaps)
  const strengthList = Object.values(strengths)
  const totalComps = Object.keys(state.assessments || {}).length

  return (
    <div className="space-y-5">
      {/* Readiness summary */}
      <Card className="border-[#cf492c]/25">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Overall Role Readiness</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {gapList.length} gap(s) • {strengthList.length} mastered • {totalComps} competencies assessed for your role
            </p>
          </div>
          <div className="text-right">
            <span className="text-4xl font-bold text-[#cf492c]">
              {Math.round((state?.overall_readiness ?? 1) * 100)}%
            </span>
          </div>
        </div>
        <ProgressBar value={(state?.overall_readiness ?? 1) * 100} color="orange" showValue={false} size="md" />
        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
          Updates live after every answer the mentor evaluates.
        </p>
      </Card>

      {/* Gaps */}
      {gapList.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-rose-700 dark:text-rose-400">
            <ScanSearch className="h-5 w-5" aria-hidden="true" />
            Competency Gaps ({gapList.length})
          </h3>
          <div className="space-y-3">
            {gapList.map((gap, i) => (
              <GapFinding key={gap.competency_id} gap={gap} index={i} />
            ))}
          </div>
        </div>
      )}

      {gapList.length === 0 && state?.interview?.asked > 0 && (
        <Card>
          <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            No gaps flagged so far — keep answering so the mentor can finish assessing each competency.
          </p>
        </Card>
      )}

      {gapList.length === 0 && state?.next?.type === 'complete' && (
        <Card>
          <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Great news — no competency gaps identified for your current role!
          </p>
        </Card>
      )}

      {/* Strengths */}
      {strengthList.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            Confirmed Strengths ({strengthList.length})
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {strengthList.map((s) => (
              <div
                key={s.competency_id}
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10"
              >
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{s.competency_name}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Level {s.current_level} • {Math.round(s.mastery_probability * 100)}% mastery
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}