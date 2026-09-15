import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { apiGet, apiPost } from '../lib/api'

const AgentContext = createContext()

const EMPTY_STATE = {
  session_id: null,
  status: 'idle', // idle | loading | active | completed | error
  officer: null,
  messages: [],
  interview: { asked: 0, total: 0, progress: 0 },
  assessments: {},
  gaps: {},
  strengths: {},
  overall_readiness: 1,
  recommendations: null,
  next: null,
  error: null,
}

export function AgentProvider({ children }) {
  const [state, setState] = useState(EMPTY_STATE)
  const [responding, setResponding] = useState(false)
  const abortRef = useRef(null)

  const cancelPending = () => {
    abortRef.current?.abort()
    abortRef.current = null
  }

  const startSession = useCallback(async (officer) => {
    cancelPending()
    const controller = new AbortController()
    abortRef.current = controller
    setState((prev) => ({ ...prev, status: 'loading', officer: officer || prev.officer, error: null }))
    try {
      // Reuse an existing live session for this officer when present
      let data = null
      try {
        data = await apiGet(`/agent/session?officer_id=${encodeURIComponent(officer?.id || 'MOFSI-001')}`, {
          signal: controller.signal,
        })
      } catch (err) {
        if (err.status !== 404) throw err
      }

      if (!data) {
        data = await apiPost(
          '/agent/session',
          {
            officer_id: officer?.id || 'MOFSI-001',
            role: officer?.role,
            department: officer?.department,
            name: officer?.name,
          },
          { signal: controller.signal },
        )
      }
      setState({ ...data, status: data.status === 'completed' ? 'completed' : 'active', error: null })
    } catch (err) {
      if (err.name === 'AbortError') return
      setState((prev) => ({ ...prev, status: 'error', error: err.message || 'Could not start the AI mentor session' }))
    }
  }, [])

  const sendAnswer = useCallback(
    async (text) => {
      const sessionId = state?.session_id
      if (!sessionId || responding || state.status !== 'active') return
      setResponding(true)
      try {
        const data = await apiPost(`/agent/session/${sessionId}/respond`, { answer: text })
        setState({ ...data, status: data.status === 'completed' ? 'completed' : 'active', error: null })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err.message || 'The mentor could not process your answer. Please try again.',
        }))
      } finally {
        setResponding(false)
      }
    },
    [state?.session_id, responding, state?.status],
  )

  const restart = useCallback(
    async (officer) => {
      const officerId = officer?.id || state?.officer_id || 'MOFSI-001'
      setState((prev) => ({ ...prev, status: 'loading', error: null }))
      try {
        const data = await apiPost(`/agent/session/${encodeURIComponent(officerId)}/restart`, {
          role: officer?.role,
          department: officer?.department,
          name: officer?.name,
        })
        setState({ ...data, status: 'active', error: null })
      } catch (err) {
        setState((prev) => ({ ...prev, status: 'error', error: err.message || 'Could not restart the session' }))
      }
    },
    [state?.officer_id],
  )

  const clear = useCallback(() => {
    cancelPending()
    setState(EMPTY_STATE)
  }, [])

  useEffect(() => cancelPending, [])

  const value = {
    state,
    responding,
    startSession,
    sendAnswer,
    restart,
    clear,
  }

  return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export function useAgent() {
  const ctx = useContext(AgentContext)
  if (!ctx) throw new Error('useAgent must be used within AgentProvider')
  return ctx
}