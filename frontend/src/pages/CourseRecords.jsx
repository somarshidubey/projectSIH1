import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Archive, Award, Calendar, Clock, GraduationCap, BadgeCheck } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import PageWrapper from '../components/layout/PageWrapper'
import { useCourses } from '../context/CourseContext'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS, TOTAL_MODULES } from '../constants/courses'

const formatDate = (iso) => {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function CourseRecords() {
  const navigate = useNavigate()
  const { getSubmittedCourses } = useCourses()
  const records = getSubmittedCourses()

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
              <Archive className="h-8 w-8 text-indigo-600" aria-hidden="true" />
              Course Records
            </h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Records of all courses you have completed and submitted
            </p>
          </div>

          {records.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <BadgeCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{records.length}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-500">Courses submitted</p>
              </div>
            </div>
          )}
        </div>

        {records.length === 0 ? (
          <Card>
            <EmptyState
              icon="book"
              title="No course records yet"
              description="When you finish all modules of a course and mark it as submitted, it will be recorded here."
              action={
                <Button onClick={() => navigate('/recommendations')}>
                  <GraduationCap className="h-4 w-4" aria-hidden="true" />
                  Browse Courses
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-3">
            {records.map((record, i) => (
              <motion.div key={record.courseId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="transition-colors hover:border-indigo-200 dark:hover:border-indigo-500/40">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
                        <GraduationCap className="h-6 w-6 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{record.title}</h3>
                        <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{record.provider}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                          {record.difficulty && (
                            <Badge variant={DIFFICULTY_COLORS[record.difficulty] || 'default'}>
                              {DIFFICULTY_LABELS[record.difficulty] || 'N/A'}
                            </Badge>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {record.duration ?? 'N/A'}h
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Submitted {formatDate(record.submittedAt)}
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                            {record.completedModules?.length ?? TOTAL_MODULES} modules completed
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2">
                      <Button variant="secondary" onClick={() => navigate(`/course/${record.courseId}`)}>
                        <Award className="h-4 w-4" aria-hidden="true" />
                        View Course
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}