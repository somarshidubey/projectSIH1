import { useState } from 'react'
import { motion } from 'framer-motion'
import { Target, TrendingUp, CheckCircle2, BarChart3, Pencil, X, Check } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Cell, ReferenceLine } from 'recharts'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import ProgressBar from '../components/ui/ProgressBar'
import GapCard from '../components/features/GapCard'
import PageWrapper from '../components/layout/PageWrapper'
import { useTheme } from '../context/ThemeContext'
import { sampleHistory, roleOptions } from '../data/sampleData'
import { apiPost } from '../lib/api'
import toast from 'react-hot-toast'

const getBarColor = (mastery, required) => {
  const gap = required - mastery
  if (gap <= 0) return '#10b981'
  if (gap <= 0.2) return '#f59e0b'
  return '#ef4444'
}

const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{d.name}</p>
      <div className="mb-1 flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ background: '#6366f1' }} />
        <span className="text-slate-600 dark:text-slate-400">
          Current: <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(d.mastery * 100)}%</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-sm" style={{ background: '#e2e8f0' }} />
        <span className="text-slate-600 dark:text-slate-400">
          Required: <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(d.required * 100)}%</span>
        </span>
      </div>
      {d.mastery < d.required && (
        <p className="mt-1.5 font-medium text-rose-600 dark:text-rose-400">Gap: {Math.round((d.required - d.mastery) * 100)}%</p>
      )}
    </div>
  )
}

const CustomRadarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{payload[0]?.payload?.subject}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600 dark:text-slate-400">
            {p.name}: <span className="font-semibold text-slate-900 dark:text-slate-100">{Math.round(p.value * 100)}%</span>
          </span>
        </div>
      ))}
    </div>
  )
}

export default function GapAnalysis() {
  const { dark } = useTheme()
  const [form, setForm] = useState({
    officer_id: 'MOFSI-001',
    name: 'Rajesh Kumar',
    role: 'deputy_director',
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const roleLabel = roleOptions.find((r) => r.value === form.role)?.label || form.role

  const tickFill = dark ? '#94a3b8' : '#475569'
  const gridStroke = dark ? '#334155' : '#e2e8f0'
  const referenceStroke = dark ? '#475569' : '#cbd5e1'

  const startEditing = () => {
    setEditForm({ ...form })
    setEditing(true)
  }

  const cancelEditing = () => {
    setEditForm(null)
    setEditing(false)
  }

  const saveEditing = () => {
    if (!editForm?.officer_id || !editForm?.name) {
      toast.error('Officer ID and Name are required')
      return
    }
    setForm({ ...editForm })
    setEditing(false)
    setEditForm(null)
    toast.success('Profile updated')
  }

  const analyze = async () => {
    setLoading(true)
    try {
      const data = await apiPost('/analyze-gaps', { ...form, competency_history: sampleHistory })
      setResult(data)
      toast.success(`Analysis complete for ${data.officer_name}`)
    } catch (err) {
      toast.error(err.message || 'Failed to analyze gaps')
    }
    setLoading(false)
  }

  const chartData = result
    ? [...result.gaps, ...result.mastered].map((item) => {
        const required = (item.required_level || 1) / 4
        return {
          name: item.name.length > 20 ? item.name.slice(0, 18) + '...' : item.name,
          fullName: item.name,
          mastery: item.mastery_probability,
          required,
          gap: required - item.mastery_probability,
          competency_id: item.competency_id,
        }
      })
    : []

  const radarData = result
    ? [...result.gaps, ...result.mastered].map((item) => ({
        subject: item.name.length > 18 ? item.name.slice(0, 16) + '...' : item.name,
        Current: item.mastery_probability,
        Required: (item.required_level || 1) / 4,
      }))
    : []

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
            <Target className="h-8 w-8 text-indigo-600" aria-hidden="true" />
            Competency Gap Analysis
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">BKT-powered skill estimation from quiz results</p>
        </div>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Officer Profile</h2>
            {!editing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={cancelEditing}
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
                <button
                  onClick={saveEditing}
                  className="flex items-center gap-1 text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 dark:text-indigo-400"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Save
                </button>
              </div>
            )}
          </div>

          {editing && editForm ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Officer ID"
                value={editForm.officer_id}
                onChange={(e) => setEditForm({ ...editForm, officer_id: e.target.value })}
                required
              />
              <Input
                label="Name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
              <Select
                label="Role"
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                options={roleOptions}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Officer ID</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{form.officer_id}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Name</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{form.name}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Role</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{roleLabel}</p>
              </div>
            </div>
          )}

          <div className="mt-4">
            <Button onClick={analyze} loading={loading}>
              <Target className="h-4 w-4" aria-hidden="true" />
              Analyze Gaps
            </Button>
          </div>
        </Card>

        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Readiness Score */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Results for {result.officer_name}</h2>
                <div className="text-right">
                  <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {Math.round(result.overall_readiness * 100)}%
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Readiness Score</div>
                </div>
              </div>
              <ProgressBar value={result.overall_readiness * 100} color="indigo" showValue={false} />
            </Card>

            {/* Charts Row */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Bar Chart */}
                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Mastery vs Required</h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barGap={2}>
                        <XAxis type="number" domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 12, fill: tickFill }} />
                        <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: tickFill }} />
                        <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }} />
                        <ReferenceLine x={0.7} stroke={referenceStroke} strokeDasharray="4 4" label={{ value: 'Required', position: 'top', fontSize: 10, fill: '#94a3b8' }} />
                        <Bar dataKey="mastery" radius={[0, 6, 6, 0]} maxBarSize={28}>
                          {chartData.map((entry, i) => (
                            <Cell key={i} fill={getBarColor(entry.mastery, entry.required)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> Mastered</span>
                    <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-500" /> Close (within 20%)</span>
                    <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-rose-500" /> Gap</span>
                  </div>
                </Card>

                {/* Radar Chart */}
                <Card>
                  <div className="mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-indigo-600" aria-hidden="true" />
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Competency Profile</h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="70%">
                        <PolarGrid stroke={gridStroke} />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: tickFill }} />
                        <PolarRadiusAxis angle={30} domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Radar name="Required" dataKey="Required" stroke="#cbd5e1" fill="#cbd5e1" fillOpacity={0.3} strokeWidth={1.5} strokeDasharray="4 4" />
                        <Radar name="Current" dataKey="Current" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} strokeWidth={2} />
                        <Tooltip content={<CustomRadarTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}

            {/* Gaps */}
            {result.gaps.length > 0 && (
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-rose-700 dark:text-rose-400">
                  <TrendingUp className="h-5 w-5" aria-hidden="true" />
                  Gaps Found ({result.gaps.length})
                </h2>
                <div className="space-y-3">
                  {result.gaps.map((gap, i) => (
                    <GapCard key={gap.competency_id} gap={gap} index={i} />
                  ))}
                </div>
              </Card>
            )}

            {/* Mastered */}
            {result.mastered.length > 0 && (
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  Mastered ({result.mastered.length})
                </h2>
                <div className="space-y-3">
                  {result.mastered.map((item) => (
                    <div key={item.competency_id} className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">{item.name}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Mastery: {Math.round(item.mastery_probability * 100)}%</p>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </PageWrapper>
  )
}