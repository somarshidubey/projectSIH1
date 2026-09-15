import { useState } from 'react'
import { motion } from 'framer-motion'
import { ScanSearch, GraduationCap, Building2, Activity } from 'lucide-react'
import GapAnalysisTab from './GapAnalysisTab'
import RecommendedCoursesTab from './RecommendedCoursesTab'
import IGOTProfileTab from './IGOTProfileTab'
import SessionTab from './SessionTab'
import { useAgent } from '../../context/AgentContext'

const tabs = [
  { id: 'gaps', label: 'Gap Analysis', icon: ScanSearch, getCount: (s) => Object.keys(s?.gaps || {}).length },
  { id: 'courses', label: 'Recommended Courses', icon: GraduationCap, getCount: (s) => s?.recommendations?.summary?.total_recommendations },
  { id: 'igot', label: 'iGOT Profile', icon: Building2, getCount: null },
  { id: 'session', label: 'Session', icon: Activity, getCount: (s) => s?.interview?.asked },
]

export default function CapabilityTabs() {
  const [active, setActive] = useState('gaps')
  const { state } = useAgent()

  return (
    <div className="flex h-full flex-col overflow-hidden border border-[#2b211c] bg-[#141210] shadow-[4px_4px_0_#000]">
      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto border-b-2 border-[#8b2a1a] bg-[#0f0d0c] px-2 pt-2">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = active === tab.id
          const count = tab.getCount?.(state)
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-shrink-0 items-center gap-1.5 rounded-sm px-3.5 py-2.5 font-mono text-sm font-medium transition-colors ${
                isActive
                  ? 'text-[#cf492c]'
                  : 'text-[#a3a3a3] hover:text-[#e5e5e5]'
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span
                  className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold ${
                    tab.id === 'gaps'
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-[#cf492c]/20 text-[#ffd9cc]'
                  }`}
                >
                  {count}
                </span>
              )}
              {isActive && (
                <motion.span
                  layoutId="capability-tab-underline"
                  className="absolute inset-x-2 bottom-0 h-0.5 bg-[#cf492c] shadow-[0_0_8px_rgba(207,73,44,0.8)]"
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="terminal-scroll flex-1 overflow-y-auto p-4 sm:p-5" style={{ minHeight: 320 }}>
        <motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {active === 'gaps' && <GapAnalysisTab />}
          {active === 'courses' && <RecommendedCoursesTab />}
          {active === 'igot' && <IGOTProfileTab />}
          {active === 'session' && <SessionTab />}
        </motion.div>
      </div>
    </div>
  )
}