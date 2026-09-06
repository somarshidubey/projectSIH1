import { useState, useEffect, useCallback } from 'react'

export default function useApi(url, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // The spread keeps the latest caller options; the AbortController signal is
  // passed per-call so unmount/refetch interruptions are cancelled safely.
  const fetchData = useCallback(
    async (signal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(url, { ...options, signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!signal?.aborted) setData(json)
      } catch (err) {
        if (err.name === 'AbortError') return
        if (!signal?.aborted) setError(err.message)
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [url, options],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchData(controller.signal)
    return () => controller.abort()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}