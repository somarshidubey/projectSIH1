import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { LogOut, ChevronDown } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CourseProvider } from './context/CourseContext'
import { AgentProvider } from './context/AgentContext'
import ChatWidget from './components/features/ChatWidget'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import GapAnalysis from './pages/GapAnalysis'
import QuizGenerator from './pages/QuizGenerator'
import Recommendations from './pages/Recommendations'
import CourseDetail from './pages/CourseDetail'
import CourseRecords from './pages/CourseRecords'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function CompactUserMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed right-4 top-4 z-40">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-sm border border-[#2b211c] bg-[#141210]/95 px-3 py-2 font-mono text-xs text-[#e5e5e5] shadow-[3px_3px_0_#000] backdrop-blur transition-colors hover:border-[#3a2a22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#cf492c]"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#cf492c] text-[10px] font-bold text-white">
          {user?.avatar || 'U'}
        </span>
        <span className="hidden sm:inline">{user?.name || 'User'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-[#cf492c]" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-sm border border-[#3a2a22] bg-[#141210] shadow-[4px_4px_0_#000]">
          <div className="border-b border-[#2b211c] p-3 font-mono">
            <p className="text-xs text-[#e5e5e5]">{user?.name}</p>
            <p className="mt-0.5 text-[11px] text-[#a3a3a3]">{user?.id} · {user?.department || 'MoSPI'}</p>
          </div>
          <button
            role="menuitem"
            onClick={() => {
              logout()
              setOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 font-mono text-xs text-[#cf492c] transition-colors hover:bg-[#1a1412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#cf492c]"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

function ProtectedLayout() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <div className="min-h-screen transition-colors duration-300">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-sm focus:bg-[#cf492c] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <CompactUserMenu />
      {location.pathname !== '/' && <ChatWidget />}
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <main id="main-content" role="main" className="min-h-screen">
        <div className="mx-auto w-full max-w-[120rem] px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="gaps" element={<GapAnalysis />} />
        <Route path="quiz" element={<QuizGenerator />} />
        <Route path="recommendations" element={<Recommendations />} />
        <Route path="records" element={<CourseRecords />} />
        <Route path="course/:courseId" element={<CourseDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <CourseProvider>
        <AgentProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AgentProvider>
      </CourseProvider>
    </AuthProvider>
  )
}

export default App
