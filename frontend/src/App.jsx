import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CourseProvider } from './context/CourseContext'
import Sidebar from './components/layout/Sidebar'
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

function ProtectedLayout() {
  const location = useLocation()
  const outlet = useOutlet()

  return (
    <div className="min-h-screen bg-slate-50 transition-colors duration-300 dark:bg-slate-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar />
      <ChatWidget />
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <main id="main-content" role="main" className="min-h-screen pt-16 lg:ml-64 lg:pt-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
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
    <ThemeProvider>
      <AuthProvider>
        <CourseProvider>
          <Router>
            <AppRoutes />
          </Router>
        </CourseProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App