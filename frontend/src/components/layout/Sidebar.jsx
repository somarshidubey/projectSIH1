import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Target, FileQuestion, GraduationCap, Archive, Menu, X, ChevronRight, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import ThemeToggle from '../ui/ThemeToggle'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/gaps', label: 'Gap Analysis', icon: Target },
  { path: '/quiz', label: 'Quiz Generator', icon: FileQuestion },
  { path: '/recommendations', label: 'Recommendations', icon: GraduationCap },
  { path: '/records', label: 'Course Records', icon: Archive },
]

export default function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        setUserMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const NavLink = ({ item, mobile = false }) => {
    const active = location.pathname === item.path
    return (
      <Link
        to={item.path}
        onClick={() => mobile && setMobileOpen(false)}
        className={`
          flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
          ${active
            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
          }
        `}
        aria-current={active ? 'page' : undefined}
      >
        <item.icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-indigo-600 dark:text-indigo-400' : ''}`} aria-hidden="true" />
        <span>{item.label}</span>
        {active && <ChevronRight className="ml-auto h-4 w-4 text-indigo-400" aria-hidden="true" />}
      </Link>
    )
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900 lg:flex">
        <div className="border-b border-slate-100 p-6 dark:border-slate-800">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/25">
              <span className="text-lg font-bold text-white">S</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Saksham</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">MoSPI Platform</p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 p-4" role="navigation" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </nav>

        <div className="p-4">
          <ThemeToggle showLabel className="w-full" />
        </div>

        {/* User Profile Card */}
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              className="w-full flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:bg-slate-800"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-md">
                {user?.avatar || 'U'}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name || 'User'}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.department || 'MoSPI'}</p>
              </div>
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  role="menu"
                  className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
                >
                  <div className="border-b border-slate-100 p-3 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{user?.id}</p>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      logout()
                      setUserMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-500/10"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <span className="font-bold text-white">S</span>
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">Saksham</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-xs font-bold text-white">
              {user?.avatar || 'U'}
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="flex h-full w-72 flex-col bg-white shadow-xl dark:bg-slate-900"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Navigation menu"
            >
              <div className="border-b border-slate-100 p-6 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
                    <span className="text-lg font-bold text-white">S</span>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">Saksham</h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400">MoSPI Platform</p>
                  </div>
                </div>
              </div>
              <nav className="flex-1 space-y-1 p-4" role="navigation" aria-label="Mobile navigation">
                {navItems.map((item) => (
                  <NavLink key={item.path} item={item} mobile />
                ))}
              </nav>
              <div className="mt-auto border-t border-slate-100 p-4 dark:border-slate-800">
                <div className="mb-2 flex items-center gap-3 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                    {user?.avatar || 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.department}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg p-2 text-sm text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400 dark:hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}