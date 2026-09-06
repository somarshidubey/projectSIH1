import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart3, Users, BookOpen, Database, ArrowRight, Zap, Brain, Link2, TrendingUp, Target, FileQuestion, GraduationCap, Activity, Clock, Award, CheckCircle2 } from 'lucide-react'
import Card from '../components/ui/Card'
import { SkeletonStats } from '../components/ui/Skeleton'
import PageWrapper from '../components/layout/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { useCourses } from '../context/CourseContext'
import { apiGet } from '../lib/api'
import { DIFFICULTY_LABELS } from '../constants/courses'

const statIcons = [BarChart3, Users, BookOpen, Database]
const statColors = ['from-blue-500 to-blue-600', 'from-emerald-500 to-emerald-600', 'from-purple-500 to-purple-600', 'from-orange-500 to-orange-600']
const statBg = ['bg-blue-50', 'bg-emerald-50', 'bg-purple-50', 'bg-orange-50']
const statBgDark = ['dark:bg-blue-500/10', 'dark:bg-emerald-500/10', 'dark:bg-purple-500/10', 'dark:bg-orange-500/10']

const quickActions = [
  { label: 'Analyze Gaps', desc: 'Check officer competency gaps', icon: Target, path: '/gaps', color: 'from-rose-500 to-rose-600' },
  { label: 'Generate Quiz', desc: 'Create MCQs from documents', icon: FileQuestion, path: '/quiz', color: 'from-indigo-500 to-indigo-600' },
  { label: 'Get Recommendations', desc: 'Personalized iGOT courses', icon: GraduationCap, path: '/recommendations', color: 'from-purple-500 to-purple-600' },
]

const capabilities = [
  { icon: Brain, title: 'Competency Gap Analysis', desc: 'Bayesian Knowledge Tracing estimates skill mastery from quiz results and course completions', color: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' },
  { icon: Zap, title: 'AI Quiz Generation', desc: 'RAG-powered MCQ generation from uploaded PDFs, DOCX, and text files using vector search', color: 'text-amber-500 bg-amber-50 dark:bg-amber-500/10' },
  { icon: Link2, title: 'iGOT Karmayogi Integration', desc: 'Personalized course recommendations aligned with MoSPI competency framework', color: 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' },
  { icon: TrendingUp, title: 'Division-Level Insights', desc: 'Aggregated gap analysis for leadership to identify systemic training needs', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' },
]

const activity = [
  { action: 'Document uploaded', detail: 'NAS_Methodology.pdf', time: '2 hours ago', color: 'bg-blue-500' },
  { action: 'Quiz generated', detail: '15 MCQs on GDP stats', time: '3 hours ago', color: 'bg-purple-500' },
  { action: 'Gaps analyzed', detail: '4 gaps found for DD role', time: '5 hours ago', color: 'bg-rose-500' },
  { action: 'Course recommended', detail: 'Advanced SRS Analysis', time: '1 day ago', color: 'bg-emerald-500' },
]

const technologies = ['FastAPI', 'React', 'ChromaDB', 'PyMuPDF', 'Tailwind']

export default function Dashboard() {
  const { user } = useAuth()
  const { getEnrolledCourses, getTotalProgress } = useCourses()
  const [stats, setStats] = useState(null)
  const [courses, setCourses] = useState([])

  useEffect(() => {
    const controller = new AbortController()
    apiGet('/document-stats', { signal: controller.signal })
      .then(setStats)
      .catch(() => {})
    apiGet('/igot-courses', { signal: controller.signal })
      .then(setCourses)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const enrolledCourses = getEnrolledCourses()
  const totalProgress = getTotalProgress()

  const cards = [
    { title: 'Competencies Tracked', value: '6', subtitle: 'Across 4 categories', icon: statIcons[0] },
    { title: 'Job Roles Mapped', value: '3', subtitle: 'Officer to Joint Secretary', icon: statIcons[1] },
    { title: 'iGOT Courses', value: courses.length || '12', subtitle: 'Available for recommendations', icon: statIcons[2] },
    { title: 'Enrolled Courses', value: enrolledCourses.length.toString(), subtitle: `${totalProgress}% avg progress`, icon: statIcons[3] },
  ]

  return (
    <PageWrapper>
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white sm:p-8">
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/4 translate-y-1/2 rounded-full bg-purple-500/20 blur-2xl" />
          <div className="relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <p className="mb-1 text-sm text-indigo-100">Welcome back,</p>
              <h1 className="mb-2 text-2xl font-bold sm:text-3xl">{user?.name || 'Officer'}</h1>
              <p className="max-w-xl text-sm text-indigo-100 sm:text-base">
                AI-Enabled Capacity Building Platform for India's Official Statistical System.
                Identify gaps, generate assessments, and track your learning journey.
              </p>
            </motion.div>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                <Activity className="h-4 w-4" aria-hidden="true" />
                <span>{stats?.total_chunks || 0} chunks indexed</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>Last active: Today</span>
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-white/20 px-3 py-1.5 text-sm backdrop-blur-sm">
                <Award className="h-4 w-4" aria-hidden="true" />
                <span>{user?.role?.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {!stats ? (
          <SkeletonStats />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {cards.map((card, i) => {
              const Icon = card.icon
              return (
                <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card hover className="relative overflow-hidden">
                    <div className={`absolute right-0 top-0 h-20 w-20 -translate-y-6 translate-x-6 rounded-full ${statBg[i]} ${statBgDark[i]}`} />
                    <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg sm:h-12 sm:w-12 ${statColors[i]}`}>
                      <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" aria-hidden="true" />
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">{card.value}</div>
                    <div className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-300">{card.title}</div>
                    <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{card.subtitle}</div>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Enrolled Courses */}
        {enrolledCourses.length > 0 && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">My Learning</h2>
              <Link to="/recommendations" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">
                Browse more courses
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrolledCourses.map((course, i) => (
                <motion.div key={course.courseId} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Link to={`/course/${course.courseId}`}>
                    <Card hover className="h-full cursor-pointer">
                      <div className="mb-3 flex items-start justify-between">
                        <h3 className="pr-2 text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">{course.title}</h3>
                        {course.progress === 100 && (
                          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          </div>
                        )}
                      </div>
                      <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{course.provider}</p>

                      <div className="mb-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400">Progress</span>
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400">{course.progress}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700/60">
                          <motion.div
                            className={`h-2 rounded-full ${course.progress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${course.progress}%` }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{DIFFICULTY_LABELS[course.difficulty] || 'N/A'}</span>
                        <span>{course.duration}h</span>
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon
              return (
                <motion.div key={action.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}>
                  <Link to={action.path}>
                    <Card hover className="group h-full cursor-pointer">
                      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110 ${action.color}`}>
                        <Icon className="h-6 w-6 text-white" aria-hidden="true" />
                      </div>
                      <h3 className="mb-1 font-semibold text-slate-900 dark:text-slate-100">{action.label}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{action.desc}</p>
                      <div className="mt-3 flex items-center gap-1 text-sm font-medium text-indigo-600 transition-all group-hover:gap-2 dark:text-indigo-400">
                        Get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </div>
                    </Card>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Capabilities */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Platform Capabilities</h2>
              <div className="space-y-3">
                {capabilities.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.title}</h4>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Recent Activity + Tech Stack */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h2>
              <div className="space-y-3">
                {activity.map((item, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }} className="flex items-start gap-3">
                    <div className={`mt-2 h-2 w-2 flex-shrink-0 rounded-full ${item.color}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.action}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-slate-400 dark:text-slate-500">{item.time}</span>
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Tech Stack</h2>
              <div className="flex flex-wrap gap-2">
                {technologies.map((tech) => (
                  <span key={tech} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {tech}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}