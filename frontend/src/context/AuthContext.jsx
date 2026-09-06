import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

const demoUsers = [
  { id: 'MOFSI-001', name: 'Rajesh Kumar', role: 'deputy_director', department: 'Ministry of Statistics', avatar: 'RK', email: 'rajesh@mospi.gov.in' },
  { id: 'MOFSI-002', name: 'Priya Sharma', role: 'statistical_officer', department: 'National Statistical Office', avatar: 'PS', email: 'priya@mospi.gov.in' },
  { id: 'MOFSI-003', name: 'Amit Patel', role: 'joint_secretary', department: 'MoSPI', avatar: 'AP', email: 'amit@mospi.gov.in' },
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

  const login = (email, password) => {
    const foundUser = demoUsers.find((u) => u.email === email)
    if (foundUser) {
      setUser(foundUser)
      return { success: true }
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

  const logout = () => setUser(null)

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