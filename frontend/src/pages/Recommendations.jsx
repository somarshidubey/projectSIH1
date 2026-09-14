import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, BookOpen, Clock } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import CourseCard from '../components/features/CourseCard'
import LearningPathStep from '../components/features/LearningPathStep'
import PageWrapper from '../components/layout/PageWrapper'
import { useAuth } from '../context/AuthContext'
import { sampleHistory, roleOptions } from '../data/sampleData'
import { apiGet, apiPost } from '../lib/api'
import toast from 'react-hot-toast'

export default function Recommendations() {
  const { user } = useAuth()
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [courses, setCourses] = useState([])

  const roleLabel = roleOptions.find((r) => r.value === user?.role)?.label || user?.role || 'Statistical Officer'

  useEffect(() => {
    const controller = new AbortController()
    apiGet('/igot-courses', { signal: controller.signal })
      .then(setCourses)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  const getRecommendations = async () => {
    setLoading(true)
    try {
      const data = await apiPost('/recommendations', {
        officer_id: user?.id || 'MOFSI-001',
        name: user?.name || 'Officer',
        role: user?.role || 'statistical_officer',
        competency_history: sampleHistory,
      })
      setResult(data)
      toast.success('Recommendations loaded')
    } catch (err) {
      toast.error(err.message || 'Failed to get recommendations')
    }
    setLoading(false)
  }

  const summaryCards = result
    ? [
        { label: 'Gaps Found', value: result.recommendations.summary.total_gaps, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        { label: 'Courses Recommended', value: result.recommendations.summary.total_recommendations, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        { label: 'Total Learning Time', value: `${result.recommendations.summary.estimated_total_hours}h`, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10' },
        { label: 'High Priority', value: result.recommendations.summary.high_priority_gaps, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      ]
    : []

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
            <GraduationCap className="h-8 w-8 text-indigo-600" aria-hidden="true" />
            iGOT Karmayogi Recommendations
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Personalized learning paths from India's official course ecosystem</p>
        </div>

        <Card>
          <h2 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">Get Personalized Recommendations</h2>
          <p className="mb-4 text-slate-600 dark:text-slate-400">
            Generate course recommendations for {user?.name || 'your profile'} ({roleLabel}) based on detected gaps.
          </p>
          <Button onClick={getRecommendations} loading={loading}>
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
            Get Recommendations
          </Button>
        </Card>

        {result && result.recommendations && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {summaryCards.map((card, i) => (
                <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <Card className={`text-center ${card.bg}`}>
                    <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
                    <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{card.label}</div>
                  </Card>
                </motion.div>
              ))}
            </div>

            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                <BookOpen className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                Recommended Courses
              </h2>
              <div className="space-y-4">
                {result.recommendations.recommendations.map((rec) => (
                  <div
                    key={rec.competency_id}
                    className={`rounded-lg border p-4 ${
                      rec.priority === 'high'
                        ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
                        : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{rec.competency_name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={rec.priority}>Gap: {rec.gap_size} levels</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {rec.courses.map((course) => (
                        <CourseCard key={course.course_id} course={course} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {result.recommendations.learning_path.length > 0 && (
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  <Clock className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                  Suggested Learning Path
                </h2>
                <div className="space-y-3">
                  {result.recommendations.learning_path.map((step, i) => (
                    <LearningPathStep key={step.step} step={step} index={i} />
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {courses.length > 0 && (
          <Card>
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Available iGOT Courses ({courses.length})
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((course, i) => (
                <CourseCard key={course.course_id} course={course} index={i} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageWrapper>
  )
}