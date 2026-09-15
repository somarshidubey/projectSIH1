import { Building2, MapPin, Mail, Globe2, BadgeCheck, Fingerprint, Loader2 } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import { useAgent } from '../../context/AgentContext'

export default function IGOTProfileTab() {
  const { state } = useAgent()
  const officer = state?.officer

  if (state?.status === 'idle' || state?.status === 'loading') {
    return (
      <Card className="flex h-full flex-col items-center justify-center py-20">
        <Loader2 className="mb-3 h-8 w-8 animate-spin text-[#cf492c]" aria-hidden="true" />
        <p className="text-sm text-slate-500">Pulling officer profile from iGOT Karmayogi…</p>
      </Card>
    )
  }

  if (!officer) {
    return (
      <Card className="h-full">
        <EmptyState
          icon="search"
          title="Officer profile"
          description="Your iGOT Karmayogi officer profile (department, role, location) is shown here once the mentor session starts."
        />
      </Card>
    )
  }

  const fields = [
    { label: 'Work ID (WID)', value: officer.wid || '—', icon: Fingerprint },
    { label: 'Email', value: officer.email || '—', icon: Mail },
    { label: 'Sub-Department', value: officer.sub_department || '—', icon: Building2 },
    { label: 'Unit', value: officer.unit || '—', icon: Building2 },
    { label: 'Location', value: officer.location || '—', icon: MapPin },
    { label: 'Preferred Language', value: officer.language || '—', icon: Globe2 },
  ]

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-r from-[#8b2a1a] to-[#cf492c] p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-sm bg-white/20 text-2xl font-bold">
              {officer.name?.slice(0, 2).toUpperCase() || officer.avatar || 'MO'}
            </div>
            <div className="min-w-0">
              <h3 className="text-xl font-bold">{officer.name}</h3>
              <p className="text-sm text-orange-100">{officer.role_title}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-orange-200">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Profile synced from {officer.source}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">Department</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{officer.department}</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.label} className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/60">
                <f.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#cf492c]" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{f.label}</p>
                  <p className="truncate text-sm text-slate-900 dark:text-slate-100">{f.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {officer.department_competencies?.length > 0 && (
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <Building2 className="h-5 w-5 text-[#cf492c]" aria-hidden="true" />
            Department-Relevant Competencies
          </h3>
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Mapped from your {officer.department} profile. The mentor prioritises these during your interview.
          </p>
          <div className="flex flex-wrap gap-2">
            {officer.department_competencies.map((cid) => (
              <Badge key={cid} variant="info">
                {cid}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}