import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Brain, BarChart3, User, Building2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from '../components/ui/ThemeToggle'
import toast from 'react-hot-toast'

const inputClass = (extra = '') =>
  `w-full rounded-xl border bg-white px-3 py-3 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder-slate-500 ${extra}`

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300'

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
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800">
      {/* Left Panel - Branding */}
      <div className="relative hidden items-center justify-center overflow-hidden p-12 lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-purple-500/20 blur-3xl" />

        <div className="relative z-10 max-w-lg text-white">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl">
                <span className="text-2xl font-bold text-indigo-700">S</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">Saksham</h1>
                <p className="text-sm text-indigo-200">Empowering India's Statistics</p>
              </div>
            </div>

            <h2 className="mb-6 text-4xl font-bold leading-tight">
              AI-Enabled Capacity Building for India's Official Statistical System
            </h2>
            <p className="mb-10 text-lg text-indigo-100">
              Identify competency gaps, get personalized training recommendations, and generate assessments — all powered by AI.
            </p>

            <div className="space-y-4">
              {[
                { icon: Brain, text: 'Bayesian Knowledge Tracing for skill estimation' },
                { icon: BarChart3, text: 'RAG-powered quiz generation from documents' },
                { icon: Shield, text: 'iGOT Karmayogi ecosystem integration' },
              ].map((item, i) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex items-center gap-3 text-white/90"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <span className="text-sm">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex flex-1 items-center justify-center bg-white p-6 transition-colors duration-300 dark:bg-slate-950 sm:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="mb-4 flex justify-end">
            <ThemeToggle />
          </div>

          {/* Mobile logo */}
          <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600">
              <span className="text-xl font-bold text-white">S</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Saksham</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">MoSPI Platform</p>
            </div>
          </div>

          {/* Header */}
          <div className="mb-8 text-center lg:text-left">
            <AnimatePresence mode="wait">
              {isSignup ? (
                <motion.div key="signup-header" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create account</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Join the capacity building platform</p>
                </motion.div>
              ) : (
                <motion.div key="login-header" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h2>
                  <p className="mt-1 text-slate-500 dark:text-slate-400">Sign in to your account to continue</p>
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
                      <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                      <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-300"
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
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white shadow-lg shadow-indigo-500/25 transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:opacity-50 dark:focus-visible:ring-offset-slate-950"
            >
              {loading ? (
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <>
                  {isSignup ? 'Create Account' : 'Sign In'}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </>
              )}
            </motion.button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
              <button
                onClick={toggleMode}
                className="ml-1 font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {isSignup ? 'Sign In' : 'Sign Up'}
              </button>
            </p>
          </div>

          {/* Demo accounts */}
          {!isSignup && (
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-3 text-slate-500 dark:bg-slate-950 dark:text-slate-400">Demo accounts</span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { name: 'Rajesh', email: 'rajesh@mospi.gov.in' },
                  { name: 'Priya', email: 'priya@mospi.gov.in' },
                  { name: 'Amit', email: 'amit@mospi.gov.in' },
                ].map((u) => (
                  <button
                    key={u.name}
                    type="button"
                    onClick={() => {
                      setEmail(u.email)
                      setPassword('demo123')
                    }}
                    className="rounded-lg border border-slate-200 p-2 text-center transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700 dark:hover:bg-slate-800"
                  >
                    <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{u.name[0]}</span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{u.name}</p>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">Click a demo account, then sign in</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}