import { createContext, useContext, useState, useEffect } from 'react'
import { loginWithIGOT } from '../services/igotKarmayogi.service'

const AuthContext = createContext()

const demoUsers = [
  { id: 'MOFSI-001', name: 'Rajesh Kumar', role: 'deputy_director', department: 'Ministry of Statistics', avatar: 'RK', email: 'rajesh@mospi.gov.in' },
  { id: 'MOFSI-002', name: 'Priya Sharma', role: 'statistical_officer', department: 'National Statistical Office', avatar: 'PS', email: 'priya@mospi.gov.in' },
  { id: 'MOFSI-003', name: 'Amit Patel', role: 'joint_secretary', department: 'MoSPI', avatar: 'AP', email: 'amit@mospi.gov.in' },
  { id: 'IAS-001', name: 'Arun Verma, IAS', role: 'ias', department: 'Department of Revenue & District Administration', avatar: 'AV', email: 'arun.verma@nic.in' },
  { id: 'IPS-001', name: 'Kavita Singh, IPS', role: 'ips', department: 'State Police Department & Home Affairs', avatar: 'KS', email: 'kavita.ips@nic.in' },
]

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

// Demo-grade obfuscation (djb2). Never store the actual password.
function hashPassword(password) {
  let hash = 5381
  const str = String(password || '')
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return `sak${(hash >>> 0).toString(36)}`
}

function publicProfile(user) {
  if (!user) return null
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    avatar: user.avatar,
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    return publicProfile(safeParse(localStorage.getItem('saksham-user'), null))
  })

  useEffect(() => {
    if (user) {
      localStorage.setItem('saksham-user', JSON.stringify(user))
    } else {
      localStorage.removeItem('saksham-user')
    }
  }, [user])

  const login = async (email, password, officerId) => {
    const foundUser = demoUsers.find((u) => u.email === email)
    // Demo access must not depend on a network request or live iGOT credentials.
    if (foundUser) {
      setUser(foundUser)
      localStorage.setItem('saksham-igot-token', 'demo-token-local-testing')
      return { success: true, source: 'Saksham demo' }
    }
    try {
      const result = await loginWithIGOT({ email, officer_id: officerId || foundUser?.id, password })
      if (result.authenticated && result.officer) {
        setUser(profileFromIGOT(result.officer, foundUser))
        localStorage.setItem('saksham-igot-token', result.access_token || '')
        return { success: true, source: result.source }
      }
    } catch (error) {
      // Continue to locally registered accounts below when the API is offline.
    }

    const registered = safeParse(localStorage.getItem('saksham-users'), [])
    const regUser = registered.find(
      (u) => u.email === email && (hashPassword(password) === u.passwordHash || u.password === password),
    )
    if (regUser) {
      setUser(publicProfile(regUser))
      return { success: true }
    }
    return { success: false, error: 'Invalid email or password' }
  }

  const signup = (name, email, password, department) => {
    const registered = safeParse(localStorage.getItem('saksham-users'), [])
    if (registered.find((u) => u.email === email)) {
      return { success: false, error: 'Email already registered' }
    }
    if (demoUsers.find((u) => u.email === email)) {
      return { success: false, error: 'Email already registered' }
    }

    const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    const newUser = {
      id: `MOFSI-${Date.now()}`,
      name,
      email,
      passwordHash: hashPassword(password),
      role: 'statistical_officer',
      department: department || 'MoSPI',
      avatar: initials,
    }

    registered.push(newUser)
    localStorage.setItem('saksham-users', JSON.stringify(registered))
    setUser(publicProfile(newUser))
    return { success: true }
  }

  const logout = () => {
    localStorage.removeItem('saksham-igot-token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

function profileFromIGOT(profile, fallback = {}) {
  const name = profile?.known_as || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || fallback.name
  return publicProfile({
    id: profile?.officer_id || fallback.id,
    name,
    email: profile?.email || fallback.email,
    role: profile?.job_role || fallback.role || 'statistical_officer',
    department: profile?.department_name || fallback.department || 'MoSPI',
    avatar: profile?.avatar || fallback.avatar || name?.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
  })
}
