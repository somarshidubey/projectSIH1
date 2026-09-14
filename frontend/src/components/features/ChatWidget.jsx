import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { apiPost } from '../../lib/api'

const WELCOME_MESSAGE = {
  role: 'assistant',
  content:
    "Hi! I'm the Saksham Assistant. Ask me anything about using this platform — gap analysis, quiz generation, course recommendations, or navigating around the site.",
}

const SUGGESTIONS = [
  'How does gap analysis work?',
  'How do I generate a quiz?',
  'Where can I see my recommended courses?',
]

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 250)
      return () => clearTimeout(timer)
    }
  }, [open])

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const nextMessages = [...messages, { role: 'user', content: trimmed }]
    setMessages(nextMessages)
    setInput('')
    setError(null)
    setLoading(true)

    try {
      // Only send prior turns as history (exclude the just-added user message,
      // the backend appends it separately) and skip the local welcome message.
      const history = nextMessages
        .slice(1, -1)
        .map(({ role, content }) => ({ role, content }))

      const data = await apiPost('/chat', { message: trimmed, history })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry, I couldn't reach the assistant right now. Please try again in a moment.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label="Saksham Assistant chat"
            className="fixed bottom-24 right-4 z-50 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:right-6 sm:bottom-24"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 dark:border-slate-800">
              <div className="flex items-center gap-2 text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                  <Bot className="h-4.5 w-4.5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Saksham Assistant</p>
                  <p className="text-[11px] leading-tight text-indigo-100">Ask about this site</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4 dark:bg-slate-950"
            >
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-tr-sm bg-indigo-600 text-white whitespace-pre-wrap'
                        : 'rounded-tl-sm bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node: _node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                          strong: ({ node: _node, ...props }) => (
                            <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props} />
                          ),
                          em: ({ node: _node, ...props }) => <em className="italic" {...props} />,
                          ul: ({ node: _node, ...props }) => (
                            <ul className="mb-2 list-disc pl-4 space-y-1 last:mb-0" {...props} />
                          ),
                          ol: ({ node: _node, ...props }) => (
                            <ol className="mb-2 list-decimal pl-4 space-y-1 last:mb-0" {...props} />
                          ),
                          li: ({ node: _node, ...props }) => <li className="leading-relaxed" {...props} />,
                          pre: ({ node: _node, ...props }) => (
                            <pre
                              className="my-1.5 overflow-x-auto rounded-lg bg-slate-100 p-2 font-mono text-xs text-slate-800 dark:bg-slate-900 dark:text-slate-200"
                              {...props}
                            />
                          ),
                          code: ({ node: _node, className, children, ...props }) => {
                            const isInline = !className && typeof children === 'string' && !children.includes('\n')
                            if (isInline) {
                              return (
                                <code
                                  className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-indigo-600 dark:bg-slate-700/60 dark:text-indigo-300"
                                  {...props}
                                >
                                  {children}
                                </code>
                              )
                            }
                            return (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            )
                          },
                          a: ({ node: _node, ...props }) => (
                            <a
                              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                              target="_blank"
                              rel="noopener noreferrer"
                              {...props}
                            />
                          ),
                          blockquote: ({ node: _node, ...props }) => (
                            <blockquote
                              className="my-1.5 border-l-2 border-indigo-400 pl-2.5 italic text-slate-600 dark:border-indigo-500 dark:text-slate-400"
                              {...props}
                            />
                          ),
                          table: ({ node: _node, ...props }) => (
                            <div className="my-2 overflow-x-auto">
                              <table className="w-full text-xs border-collapse" {...props} />
                            </div>
                          ),
                          th: ({ node: _node, ...props }) => (
                            <th
                              className="border-b border-slate-200 px-2 py-1 text-left font-semibold text-slate-900 dark:border-slate-700 dark:text-slate-100"
                              {...props}
                            />
                          ),
                          td: ({ node: _node, ...props }) => (
                            <td
                              className="border-b border-slate-100 px-2 py-1 text-slate-700 dark:border-slate-800 dark:text-slate-300"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-indigo-400">
                    <Bot className="h-3.5 w-3.5" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-3 py-2.5 shadow-sm dark:bg-slate-800">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  </div>
                </div>
              )}

              {messages.length === 1 && !loading && (
                <div className="flex flex-col gap-1.5 pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left text-xs text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="border-t border-rose-100 bg-rose-50 px-3 py-1.5 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                {error}
              </p>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about the platform..."
                aria-label="Message"
                disabled={loading}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating toggle button */}
      <motion.button
        onClick={() => setOpen((prev) => !prev)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={open ? 'Close assistant chat' : 'Open assistant chat'}
        aria-expanded={open}
        className="fixed bottom-5 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 sm:right-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={open ? 'close' : 'chat'}
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.15 }}
          >
            {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageCircle className="h-6 w-6" aria-hidden="true" />}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  )
}
