import { motion } from 'framer-motion'
import { Cpu, Signal, Circle } from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import LiveAgentPanel from '../components/features/LiveAgentPanel'
import CapabilityTabs from '../components/features/CapabilityTabs'
import { useAuth } from '../context/AuthContext'
import { useAgent } from '../context/AgentContext'

const STATUS = {
  complete: { label: 'saksham --status=complete', color: 'text-emerald-400' },
  thinking: { label: 'saksham --status=thinking', color: 'text-[#cf492c]' },
  live: { label: 'saksham --status=live', color: 'text-[#cf492c]' },
}

function SakshamBox() {
  return (
    <div className="relative overflow-hidden border-2 border-[#cf492c] bg-[#111] px-4 py-3.5 shadow-[0_0_18px_rgba(207,73,44,0.35),4px_4px_0_#000]">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-10 rounded-full bg-[#cf492c]/20 blur-2xl" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-pixel text-base text-[#cf492c] text-glow sm:text-lg">saksham v0.3</p>
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#8b2a1a]">
          <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
          ai layer · live
        </span>
      </div>
      <p className="mt-1.5 font-mono text-[11px] text-[#a3a3a3]">
        $ saksham --agent=karmayogi-mentor --officer=mosphi <span className="blink-cursor" />
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { state, responding } = useAgent()

  const status = responding
    ? STATUS.thinking
    : state?.status === 'completed'
      ? STATUS.complete
      : STATUS.live

  return (
    <PageWrapper>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Console header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#8b2a1a]">// saksham::console</span>
              <span className="h-px flex-1 max-w-40 bg-[#3a2a22]" />
            </div>
            <h1 className="font-pixel text-xl leading-relaxed text-[#e5e5e5] sm:text-2xl">
              AI <span className="text-[#cf492c] text-glow">LEARNING</span> CONSOLE
            </h1>
            <p className="mt-2 font-mono text-xs text-[#a3a3a3]">
              &gt; live competency interview for <span className="text-[#e5e5e5]">{user?.name || 'officer'}</span> · iGOT Karmayogi officer profile loaded
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span className={`flex items-center gap-2 border border-[#2b211c] bg-[#141210] px-3 py-2 shadow-[2px_2px_0_#000] ${status.color}`}>
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${responding ? 'bg-[#cf492c]' : 'bg-emerald-400'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${responding ? 'bg-[#cf492c]' : 'bg-emerald-400'}`} />
              </span>
              <Signal className="h-3.5 w-3.5" aria-hidden="true" />
              {status.label}
            </span>
            <span className="flex items-center gap-1.5 border border-[#2b211c] bg-[#141210] px-3 py-2 text-[#a3a3a3] shadow-[2px_2px_0_#000]">
              <Circle className="h-3 w-3" aria-hidden="true" />
              {state?.interview?.asked ?? 0}/{state?.interview?.total ?? 0} questions
            </span>
          </div>
        </div>

        {/* Two-pane brutalist console: saksham v0.3 + AI agent left, live tabs right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(460px,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-6 lg:h-[calc(100vh-8rem)] lg:min-h-[680px]">
            <SakshamBox />
            <div className="min-h-0 flex-1">
              <LiveAgentPanel />
            </div>
          </div>
          <div className="lg:h-[calc(100vh-8rem)] lg:min-h-[680px]">
            <CapabilityTabs />
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  )
}
