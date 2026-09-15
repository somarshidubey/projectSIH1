import { apiGet, apiPost } from '../lib/api'

/** Calls Saksham's server-to-server iGOT proxy; credentials never reach the browser. */
export const loginWithIGOT = (credentials) => apiPost('/igot/auth/login', credentials)
export const getOfficerProfile = (officerId, options) => apiGet(`/igot/officer/${encodeURIComponent(officerId)}`, options)
export const getOfficerCourses = (officerId, options) => apiGet(`/igot/officer/${encodeURIComponent(officerId)}/courses`, options)
export const getAllCourses = (options) => apiGet('/igot/courses/all', options)
