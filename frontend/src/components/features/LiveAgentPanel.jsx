import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Send, Sparkles, RotateCcw, User, Loader2, ArrowRight, CircleAlert } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import ProgressBar from '../ui/ProgressBar'
import { useAgent } from '../../context/AgentContext'
import { useAuth } from '../../context/AuthContext'

const md = {
  p: ({ node: _node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  strong: ({ node: _node, ...props }) => <strong className="font-semibold" {...props} />,
  em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
  ul: ({ node: _node, ...props }) => <ul className="mb-2 list-disc space-y-1 pl-4 last:mb-0" {...props} />,
  ol: ({ node: _node, ...props }) => <ol className="mb-2 list-decimal space-y-1 pl-4 last:mb-0" {...props} />,
  li: ({ node: _node, ...props }) => <li className="leading-relaxed" {...props} />,
  code: ({ node: _node, className, children, ...props }) => {
    const isInline = !className && typeof children === 'string' && !children.includes('\n')
    return isInline ? (
      <code className="rounded-sm bg-[#cf492c]/15 px-1.5 py-0.5 font-mono text-xs text-[#ffd9cc]" {...props}>
        {children}
      </code>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },
  a: ({ node: _node, ...props }) => (
    <a className="font-medium underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />
  ),
}

const strengthClasses = {
  strong: 'border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-400 hover:bg-emerald-500/20',
  partial: 'border-amber-400/40 bg-amber-500/10 hover:border-amber-400 hover:bg-amber-500/20',
  weak: 'border-rose-400/40 bg-rose-500/10 hover:border-rose-400 hover:bg-rose-500/20',
}

export default function LiveAgentPanel() {
  const { user } = useAuth()
  const { state, responding, startSession, sendAnswer, restart } = useAgent()
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [state?.messages, responding, state?.next])

  useEffect(() => {
    if (state?.status === 'idle') startSession(user)
  }, [state?.status, user, startSession])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }, [input])

  const handleSend = (text) => {
    const trimmed = (text ?? input).trim()
    if (!trimmed || responding || state?.status !== 'active') return
    setInput('')
    sendAnswer(trimmed)
  }

  const progress = state?.interview
    ? (state.interview.asked / Math.max(1, state.interview.total)) * 100
    : 0

  return (
    <div className="flex h-full flex-col overflow-hidden border border-[#2b211c] bg-[#141210] text-[#e5e5e5] shadow-[4px_4px_0_#000]">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b-2 border-[#8b2a1a] bg-[#111] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center rounded-sm bg-[#cf492c] shadow-[0_0_12px_rgba(207,73,44,0.5),2px_2px_0_#000]">
            <Bot className="h-6 w-6 text-white" aria-hidden="true" />
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-[#111] bg-emerald-500" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-2 font-mono text-sm font-semibold">
              karmayogi-mentor
              <span className="rounded-sm border border-emerald-400/40 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                live
              </span>
            </p>
            <p className="truncate font-mono text-xs text-[#a3a3a3]">{state?.officer?.name || user?.name || 'Officer'}</p>
            {state?.officer && (
              <div>
              <p className="mt-0.5 truncate font-mono text-[11px] text-[#cf492c]/90">
                {state.officer.role_title} · pulled from iGOT ({state.officer.department})
              </p>
              <p className="mt-0.5 truncate font-mono text-[11px] text-[#a3a3a3]">{state.officer.cadre || 'Group A (Gazetted)'} · {state.officer.department}</p>
              </div>
            )}
          </div>
        </div>
        {(state?.status === 'active' || state?.status === 'completed') && (
          <button
            onClick={() => restart(user)}
            title="Restart interview"
            aria-label="Restart interview"
            className="rounded-sm p-1.5 text-[#a3a3a3] transition-colors hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Progress */}
      {state?.interview && state.status === 'active' && (
        <div className="border-b border-[#2b211c] bg-[#1a1715] px-5 py-2.5">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-[#a3a3a3]">
            <span className="flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-[#cf492c]" aria-hidden="true" />
              adaptive competency interview
            </span>
            <span>{state.interview.asked} / {state.interview.total} questions</span>
          </div>
          <ProgressBar value={progress} color="orange" showValue={false} size="sm" />
        </div>
      )}

      {/* ====== AI PROMPT AREA — top real estate ====== */}
      <AnimatePresence mode="wait">
        {state?.status === 'active' && state.next?.type === 'question' && (
          <motion.div
            key={state.next.question_id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="border-b border-[#2b211c] bg-[#0d0b0a] p-6"
          >
            <div className="mb-3 flex flex-wrap items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#ffd9cc]">
              <span className="rounded-sm bg-[#cf492c]/20 px-2 py-1">{state.next.competency_name}</span>
              <span className="text-[#cf492c]/80">Level {state.next.focus_level} probe</span>
              {(state.next.constitutional_reference || state.next.legal_reference) && <span className="text-[#a3a3a3]">{state.next.constitutional_reference || state.next.legal_reference}</span>}
            </div>
            <p className="text-sm leading-relaxed text-slate-100">{state.next.text}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== OFFICER INPUT — spacious, directly beneath prompt ====== */}
      <AnimatePresence mode="wait">
        {state?.status === 'active' && state.next?.type === 'question' && (
          <motion.div
            key={`input-${state.next.question_id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="border-b border-[#2b211c] bg-[#111] px-6 py-4"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="space-y-3"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Type your answer here…"
                aria-label="Your answer"
                disabled={responding}
                rows={3}
                className="w-full resize-none rounded-sm border border-[#3a2a22] bg-[#0d0b0a] p-4 font-mono text-sm leading-relaxed text-[#e5e5e5] placeholder-[#6b5a52] focus:outline-none focus:ring-2 focus:ring-[#cf492c] disabled:opacity-60"
              />

              {/* Suggested answers + send */}
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1.5">
                  {state.next.suggested?.slice(0, 2).map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSend(s.text)}
                      disabled={responding}
                      className={`block w-full rounded-sm border px-3 py-2 text-left text-xs leading-relaxed text-slate-300 transition-colors disabled:opacity-50 ${strengthClasses[s.strength] || strengthClasses.partial}`}
                    >
                      {s.text}
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  disabled={responding || !input.trim()}
                  aria-label="Send answer"
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-sm bg-[#cf492c] text-white shadow-[2px_2px_0_#000] transition-colors hover:bg-[#e0552f] disabled:opacity-50"
                >
                  {responding ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ====== COMPLETED STATE ====== */}
      {state?.status === 'completed' && (
        <div className="border-b border-[#2b211c] bg-[#111] px-5 py-6 text-center">
          <p className="mb-4 font-mono text-sm text-slate-300">
            Interview complete — your gap analysis and iGOT course plan are ready.
          </p>
          <button
            onClick={() => restart(user)}
            className="inline-flex items-center gap-2 rounded-sm bg-[#cf492c] px-5 py-2.5 font-mono text-sm font-medium text-white shadow-[2px_2px_0_#000] transition-colors hover:bg-[#e0552f]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            restart interview
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* ====== CHAT HISTORY — scrollable bottom ====== */}
      <div className="terminal-scroll flex-1 space-y-4 overflow-y-auto bg-[#0d0b0a] p-6" ref={scrollRef}>
        {state?.status === 'idle' && (
          <div className="flex h-32 items-center justify-center font-mono text-sm text-[#a3a3a3]">
            Preparing your AI mentor…
          </div>
        )}

        {state?.messages?.map((msg, idx) =>
          msg.role === 'user' ? (
            <div key={idx} className="flex items-start gap-2.5 justify-end">
              <div className="max-w-[80%] rounded-sm bg-[#cf492c] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap text-white shadow-[2px_2px_0_#000]">
                {msg.content}
              </div>
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border border-[#cf492c] bg-[#8b2a1a]">
                <User className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
            </div>
          ) : (
            <div key={idx} className="flex items-start gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border border-[#cf492c] bg-[#8b2a1a]">
                <Bot className="h-3.5 w-3.5 text-white" aria-hidden="true" />
              </div>
              <div className="max-w-[82%] rounded-sm border border-[#2b211c] bg-[#1a1715] px-4 py-3 text-sm leading-relaxed text-slate-200">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={md}>
                  {msg.content}
                </ReactMarkdown>
              </div>
            </div>
          ),
        )}

        {responding && (
          <div className="flex items-start gap-2.5">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-sm border border-[#cf492c] bg-[#8b2a1a]">
              <Bot className="h-3.5 w-3.5 text-white" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 rounded-sm border border-[#2b211c] bg-[#1a1715] px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-[#cf492c]" aria-hidden="true" />
              <span className="font-mono text-xs text-[#a3a3a3]">
                <span className="blink-cursor">updating gap analysis</span> …
              </span>
            </div>
          </div>
        )}

        {state?.status === 'error' && (
          <div className="flex items-start gap-2.5 rounded-sm border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <div>
              <p>{state.error}</p>
              <button onClick={() => startSession(user)} className="mt-2 text-xs font-medium underline underline-offset-2">
                Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
