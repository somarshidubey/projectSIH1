import { motion } from 'framer-motion'
import { Loader2, MessageSquare, BarChart3, HelpCircle } from 'lucide-react'
import Card from '../ui/Card'
import ProgressBar from '../ui/ProgressBar'
import EmptyState from '../ui/EmptyState'
import { useAgent } from '../../context/AgentContext'

const statusBadge = {
  gap_confirmed: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
  mastered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  assessing: 'bg-indigo-100 text-indigo-700 dark:bg-[#cf492c]/15 dark:text-[#cf492c]',
  pending: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

export default function SessionTab() {
  const { state } = useAgent()
  const assessments = state?.assessments || {}
  const assessmentEntries = Object.values(assessments)

  if (state?.status === 'idle' || state?.status === 'loading') {
    return (
      <Card className="flex h-full flex-col items-center justify-center py-20">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#cf492c]" aria-hidden="true" />
        <p className="text-sm text-slate-500">Preparing session…</p>
      </Card>
    )
  }

  if (!state?.session_id) {
    return (
      <Card className="h-full">
        <EmptyState
          icon="book"
          title="No active session"
          description="A live AI session will start automatically when you open the dashboard. Session details and evidence summaries will appear here."
        />
      </Card>
    )
  }

  const evidenceCount = assessmentEntries.reduce((n, a) => n + (a.evidence?.length || 0), 0)
  const gapCount = Object.keys(state.gaps || {}).length
  const masteredCount = Object.keys(state.strengths || {}).length
  const assessedCount = assessmentEntries.filter((a) => a.status !== 'pending').length

  const stats = [
    { icon: MessageSquare, label: 'Conversation turns', value: state.messages?.length || 0, color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' },
    { icon: HelpCircle, label: 'Questions asked', value: state.interview?.asked || 0, color: 'bg-[#cf492c]/15 text-[#cf492c]' },
    { icon: BarChart3, label: 'Evidence collected', value: evidenceCount, color: 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className={`flex items-center gap-3 ${s.color}`}>
              <s.icon className="h-5 w-5" aria-hidden="true" />
              <div>
                <div className="text-xl font-bold">{s.value}</div>
                <p className="text-[11px] leading-tight opacity-80">{s.label}</p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {state.interview?.asked > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Interview progress: {state.interview.asked} / {state.interview.total} target questions
          </p>
          <ProgressBar value={(state.interview.asked / Math.max(1, state.interview.total)) * 100} color="orange" showValue={false} size="sm" />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {gapCount} gap(s) confirmed • {masteredCount} mastered • {assessedCount} competencies assessed
          </p>
        </Card>
      )}

      {assessmentEntries.length > 0 && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Competency Evidence Log</h3>
          <div className="space-y-3">
            {assessmentEntries.map((a) => {
              const pct = Math.round(a.mastery_probability * 100)
              return (
                <div key={a.competency_id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/60">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{a.competency_name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Required level {a.required_level} • {a.evidence.length} evidence(s)
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge[a.status] || statusBadge.pending}`}>
                      {a.status?.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Mastery</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/60">
                    <motion.div
                      className={`h-1.5 rounded-full ${a.gap > 0 ? 'bg-rose-500' : a.mastery_probability >= 0.75 ? 'bg-emerald-500' : 'bg-[#cf492c]'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  {a.evidence.length > 0 && (
                    <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      Strengths: {a.evidence.map((e) => e.strength).join(', ')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}