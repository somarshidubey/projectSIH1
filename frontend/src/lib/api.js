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
    throw new ApiError(data?.detail || data?.error || `Request failed (${res.status})`, res.status)
  }
  return data
}

export async function apiGet(path, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, { signal, headers: { Accept: 'application/json' } })
  return handleResponse(res)
}

export async function apiPost(path, body, { signal } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
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
    body: formData,
  })
  return handleResponse(res)
}