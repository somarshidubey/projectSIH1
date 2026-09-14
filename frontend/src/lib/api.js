const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const API_BASE_URL = API_BASE

class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function handleResponse(res) {
  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON body */
  }

  if (!res.ok) {
    if (res.status === 429) {
      const msg = data?.detail || 'Rate limit exceeded: too many attempts from your IP. Please wait a moment before trying again.'
      throw new ApiError(msg, 429)
    }
    throw new ApiError(data?.detail || data?.error || `Request failed (${res.status})`, res.status)
  }
  return data
}

const DEFAULT_HEADERS = {
  Accept: 'application/json',
  'X-Saksham-Client': 'web-v0.3',
}

export async function apiGet(path, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    signal,
    headers: { ...DEFAULT_HEADERS },
  })
  return handleResponse(res)
}

export async function apiPost(path, body, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    signal,
    headers: { ...DEFAULT_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function apiUpload(path, file, { signal } = {}) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    signal,
    headers: { 'X-Saksham-Client': 'web-v0.3' },
    body: formData,
  })
  return handleResponse(res)
}