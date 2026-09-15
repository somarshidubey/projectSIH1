import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Clock, GraduationCap, ExternalLink, Play, Star, Users, MapPin } from 'lucide-react'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import EmptyState from '../ui/EmptyState'
import LearningPathStep from './LearningPathStep'
import { useAgent } from '../../context/AgentContext'
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from '../../constants/courses'
import { getOfficerCourses } from '../../services/igotKarmayogi.service'

function CourseCard({ course }) {
  const enrollments = course.enrollments?.toLocaleString?.() ?? '0'
  const courseUrl = course.url || 'https://igotkarmayogi.gov.in'
  return (
    <div className="rounded-sm border border-[#2b211c] bg-[#1a1715] p-4 transition-colors hover:border-[#3a2a22]">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{course.title}</h4>
        <Badge variant={DIFFICULTY_COLORS[course.difficulty] || 'default'}>
          {DIFFICULTY_LABELS[course.difficulty] || 'N/A'}
        </Badge>
      </div>
      <p className="mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{course.description}</p>
      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <Play className="h-3 w-3 text-[#cf492c]" aria-hidden="true" /> {course.format || 'video'}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" aria-hidden="true" /> {course.duration_hours}h
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" aria-hidden="true" /> {enrollments}
        </span>
        <span className="flex items-center gap-1">
          <Star className="h-3 w-3 text-amber-500" aria-hidden="true" /> {course.rating}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden="true" /> {course.provider}
        </span>
      </div>
      <a
        href={courseUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-sm border border-[#cf492c]/50 bg-[#cf492c]/10 px-3 py-1.5 text-xs font-medium text-[#cf492c] transition-colors hover:bg-[#cf492c]/20 hover:border-[#cf492c]"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        Open on iGOT Karmayogi
      </a>
    </div>
  )
}

export default function RecommendedCoursesTab() {
  const { state } = useAgent()
  const recs = state?.recommendations
  const [catalogCourses, setCatalogCourses] = useState([])

  useEffect(() => {
    if (recs?.recommendations?.length || !state?.officer_id) return undefined
    const controller = new AbortController()
    getOfficerCourses(state.officer_id, { signal: controller.signal })
      .then((data) => setCatalogCourses(data.courses || []))
      .catch(() => { if (!controller.signal.aborted) setCatalogCourses([]) })
    return () => controller.abort()
  }, [recs?.recommendations?.length, state?.officer_id])

  if (state?.status === 'idle' || state?.status === 'loading') {
    return (
      <Card className="flex h-full flex-col items-center justify-center py-20 text-sm text-slate-500">
        Fetching iGOT Karmayogi course catalog…
      </Card>
    )
  }

  if (!recs || !recs.recommendations?.length) {
    if (catalogCourses.length) {
      return (
        <div className="space-y-4">
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <GraduationCap className="h-5 w-5 text-[#cf492c]" aria-hidden="true" />
              iGOT Karmayogi Course Catalog
            </h3>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">Available while the mentor prepares personalised recommendations.</p>
            <div className="space-y-3">{catalogCourses.map((course) => <CourseCard key={course.course_id} course={course} />)}</div>
          </div>
        </div>
      )
    }
    return (
      <Card className="h-full">
        <EmptyState
          icon="book"
          title="No recommendations yet"
          description="Courses from the iGOT Karmayogi ecosystem appear here live as the mentor flags competency gaps during your interview."
        />
      </Card>
    )
  }

  const summary = recs.summary || {}
  const summaryCards = [
    { label: 'Gaps Matched', value: summary.total_gaps ?? Object.keys(state?.gaps || {}).length, color: 'text-rose-400' },
    { label: 'Courses Recommended', value: summary.total_recommendations ?? 0, color: 'text-emerald-400' },
    { label: 'Learning Time', value: `${summary.estimated_total_hours ?? 0}h`, color: 'text-[#cf492c]' },
    { label: 'High Priority', value: summary.high_priority_gaps ?? 0, color: 'text-amber-400' },
  ]

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryCards.map((c, i) => (
          <motion.div key={c.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <Card className="text-center">
              <div className={`text-3xl font-bold ${c.color}`}>{c.value}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.label}</div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <GraduationCap className="h-5 w-5 text-[#cf492c]" aria-hidden="true" />
          iGOT Karmayogi Course Recommendations
        </h3>
        <div className="space-y-4">
          {recs.recommendations.map((rec) => (
            <div
              key={rec.competency_id}
              className={`rounded-sm border p-4 ${
                rec.priority === 'high'
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : 'border-amber-500/30 bg-amber-500/5'
              }`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">{rec.competency_name}</h4>
                <Badge variant={rec.priority}>Gap: {rec.gap_size} level(s)</Badge>
              </div>
              <div className="space-y-2">
                {rec.courses.map((course) => (
                  <CourseCard key={course.course_id} course={course} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {recs.learning_path?.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <BookOpen className="h-5 w-5 text-[#cf492c]" aria-hidden="true" />
            Suggested Learning Path
          </h3>
          <div className="space-y-2.5">
            {recs.learning_path.map((step, i) => (
              <LearningPathStep key={step.step} step={step} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
