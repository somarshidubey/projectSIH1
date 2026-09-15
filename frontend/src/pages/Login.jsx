import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Brain, BarChart3, User, Building2, Terminal } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const inputClass = (extra = '') =>
  `w-full rounded-sm border border-[#3a2a22] bg-[#0d0b0a] px-3 py-3 font-mono text-sm text-[#e5e5e5] placeholder-[#6b5a52] transition-colors focus:outline-none focus:ring-2 focus:ring-[#cf492c] focus:border-[#cf492c] ${extra}`

const labelClass = 'mb-1.5 block font-mono text-xs font-medium text-[#a3a3a3]'

const features = [
  { icon: Brain, text: 'Bayesian Knowledge Tracing for skill estimation' },
  { icon: BarChart3, text: 'RAG-powered quiz generation from documents' },
  { icon: Shield, text: 'iGOT Karmayogi ecosystem integration' },
]

export default function Login() {
  const { login, signup } = useAuth()
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const resetForm = () => {
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setDepartment('')
    setShowPassword(false)
  }

  const toggleMode = () => {
    setIsSignup((prev) => !prev)
    resetForm()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isSignup) {
      if (!name.trim() || !email.trim() || !password || !confirmPassword) {
        toast.error('Please fill in all fields')
        return
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }

      setLoading(true)
      await new Promise((r) => setTimeout(r, 800))
      const result = signup(name, email, password, department)
      setLoading(false)

      if (result.success) {
        toast.success('Account created! Welcome to Saksham!')
        navigate('/')
      } else {
        toast.error(result.error)
      }
    } else {
      if (!email.trim() || !password) {
        toast.error('Please fill in all fields')
        return
      }

      setLoading(true)
      await new Promise((r) => setTimeout(r, 800))
      const result = login(email, password)
      setLoading(false)

      if (result.success) {
        toast.success('Welcome to Saksham!')
        navigate('/')
      } else {
        toast.error(result.error)
      }
    }
  }

  return (
    <div className="flex min-h-screen bg-transparent">
      {/* Left Panel - Branding */}
      <div className="relative hidden flex-col justify-center overflow-hidden border-r-2 border-[#8b2a1a] p-12 lg:flex lg:w-1/2">
        <div className="absolute left-24 top-16 h-56 w-56 rounded-full bg-[#cf492c]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-8 right-12 font-mono text-[10px] text-[#8b2a1a]">
          $ ssh officer@mospi.gov.in <span className="blink-cursor" />
        </div>

        <div className="relative z-10 max-w-lg">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-sm border border-[#cf492c] bg-[#cf492c] shadow-[0_0_14px_rgba(207,73,44,0.5),3px_3px_0_#000]">
                <span className="font-pixel text-xl text-white">S</span>
              </div>
              <div>
                <h1 className="font-pixel text-lg text-[#e5e5e5]">SAKSHAM</h1>
                <p className="font-mono text-xs text-[#8b2a1a]">MoSPI · v0.3</p>
              </div>
            </div>

            <p className="mb-6 font-mono text-[11px] uppercase tracking-widest text-[#8b2a1a]">// login: saksham terminal</p>

            <h2 className="mb-6 font-pixel text-2xl leading-relaxed text-[#e5e5e5]">
              AI-ENABLED <span className="text-[#cf492c] text-glow">CAPACITY BUILDING</span> FOR INDIA'S OFFICIAL STATISTICAL SYSTEM
            </h2>
            <p className="mb-10 font-mono text-sm leading-relaxed text-[#a3a3a3]">
              Identify competency gaps, get personalized iGOT training recommendations, and generate assessments — all powered by AI.
            </p>

            <div className="space-y-4">
              {features.map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.15 }}
                  className="flex items-center gap-3 font-mono text-sm text-[#e5e5e5]"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-sm border border-[#cf492c]/50 bg-[#cf492c]/10">
                    <item.icon className="h-4 w-4 text-[#cf492c]" aria-hidden="true" />
                  </div>
                  <span className="text-[13px] text-[#cccccc]">{item.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="mt-10 flex items-center gap-2 font-mono text-xs text-[#a3a3a3]">
              <Terminal className="h-4 w-4 text-[#cf492c]" aria-hidden="true" />
              <span>$ saksham --deploy=mospi --agent=karmayogi <span className="blink-cursor" /></span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#cf492c] shadow-[0_0_12px_rgba(207,73,44,0.45),2px_2px_0_#000]">
              <span className="font-pixel text-sm text-white">S</span>
            </div>
            <div className="text-left">
              <h1 className="font-pixel text-sm text-[#e5e5e5]">SAKSHAM</h1>
              <p className="font-mono text-[10px] text-[#8b2a1a]">MoSPI · v0.3</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-[#8b2a1a]">// authenticate</p>
            <AnimatePresence mode="wait">
              {isSignup ? (
                <motion.div key="signup-header" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-pixel text-xl text-[#e5e5e5]">CREATE ACCOUNT</h2>
                  <p className="mt-2 font-mono text-xs text-[#a3a3a3]">join the capacity building network</p>
                </motion.div>
              ) : (
                <motion.div key="login-header" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="font-pixel text-xl text-[#e5e5e5]">SIGN IN</h2>
                  <p className="mt-2 font-mono text-xs text-[#a3a3a3]">authorized_officer@mospi.gov.in</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
            <AnimatePresence mode="wait">
              {isSignup && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div>
                    <label className={labelClass} htmlFor="signup-name">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b5a52]" aria-hidden="true" />
                      <input
                        id="signup-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Rajesh Kumar"
                        autoComplete="name"
                        required
                        className={`${inputClass('pl-10 pr-4')}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="signup-department">Department</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b5a52]" aria-hidden="true" />
                      <input
                        id="signup-department"
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g., Ministry of Statistics"
                        autoComplete="organization"
                        className={`${inputClass('pl-10 pr-4')}`}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className={labelClass} htmlFor="email">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b5a52]" aria-hidden="true" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@mospi.gov.in"
                  autoComplete="email"
                  required
                  className={`${inputClass('pl-10 pr-4')}`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor="password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b5a52]" aria-hidden="true" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? 'Create a password (6+ chars)' : 'Enter your password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  minLength={isSignup ? 6 : undefined}
                  required
                  className={`${inputClass('pl-10 pr-12')}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b5a52] transition-colors hover:text-[#e5e5e5]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isSignup && (
                <motion.div key="confirm-password" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <label className={labelClass} htmlFor="confirm-password">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6b5a52]" aria-hidden="true" />
                    <input
                      id="confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      minLength={6}
                      required
                      className={`${inputClass('pl-10 pr-4')}`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-sm bg-[#cf492c] px-4 py-3 font-mono text-sm font-semibold text-white shadow-[0_0_16px_rgba(207,73,44,0.35),3px_3px_0_#000] transition-colors hover:bg-[#e0552f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf492c] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0b0a] disabled:opacity-50"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  {isSignup ? '> create account' : '> sign in'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="font-mono text-xs text-[#a3a3a3]">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={toggleMode}
                className="ml-1 font-medium text-[#cf492c] hover:underline"
              >
                {isSignup ? 'sign in' : 'sign up'}
              </button>
            </p>
          </div>

          {/* Demo accounts */}
          {!isSignup && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2b211c]" />
                </div>
                <div className="relative flex justify-center font-mono text-xs">
                  <span className="bg-[#0d0b0a] px-3 text-[#8b2a1a]">Demo accounts</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { name: 'IAS', email: 'arun.verma@nic.in' },
                  { name: 'IPS', email: 'kavita.ips@nic.in' },
                  { name: 'Revenue', email: 'rajesh@mospi.gov.in' },
                  { name: 'Deputy Director', email: 'rajesh@mospi.gov.in' },
                  { name: 'Statistical Officer', email: 'priya@mospi.gov.in' },
                ].map((u) => (
                  <button
                    key={u.name}
                    type="button"
                    onClick={() => {
                      setEmail(u.email)
                      setPassword('demo123')
                    }}
                    className="rounded-sm border border-[#2b211c] bg-[#141210] p-2 text-center transition-colors hover:border-[#cf492c] hover:bg-[#1a1715] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf492c]"
                  >
                    <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-sm bg-[#cf492c]/15">
                      <span className="font-mono text-xs font-bold text-[#cf492c]">{u.name[0]}</span>
                    </div>
                    <p className="font-mono text-xs font-medium text-[#e5e5e5]">{u.name}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center font-mono text-[11px] text-[#6b5a52]">&gt; click a demo account, then sign in</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
