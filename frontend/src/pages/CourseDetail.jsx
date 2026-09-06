import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Clock, Users, Star, BookOpen, Award, PlayCircle, CheckCircle2, Lock, BadgeCheck, Send } from 'lucide-react'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import PageWrapper from '../components/layout/PageWrapper'
import { useCourses } from '../context/CourseContext'
import { apiGet } from '../lib/api'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../constants/courses'
import toast from 'react-hot-toast'

const sampleModules = [
  { title: 'Introduction & Overview', duration: '30 min', type: 'video' },
  { title: 'Core Concepts', duration: '1.5 hrs', type: 'video' },
  { title: 'Practical Examples', duration: '1 hr', type: 'video' },
  { title: 'Case Studies', duration: '45 min', type: 'reading' },
  { title: 'Knowledge Check', duration: '20 min', type: 'quiz' },
  { title: 'Final Assessment', duration: '30 min', type: 'quiz' },
]

export default function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { enroll, isEnrolled, getEnrollment, completeModule, submitCourse, isSubmitted } = useCourses()
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeModule, setActiveModule] = useState(null)

  const fullCourseLength = sampleModules.length
  const enrolled = isEnrolled(courseId)
  const enrollment = getEnrollment(courseId)
  const completedModules = enrollment?.completedModules || []
  const progress = enrollment?.progress || 0
  const submitted = isSubmitted(courseId)
  const isComplete = completedModules.length === fullCourseLength

  useEffect(() => {
    const controller = new AbortController()
    apiGet('/igot-courses', { signal: controller.signal })
      .then((courses) => {
        const found = courses.find((c) => c.course_id === courseId)
        if (found) {
          setCourse(found)
        } else {
          toast.error('Course not found')
          navigate('/recommendations')
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) toast.error('Failed to load course')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [courseId, navigate])

  const handleEnroll = () => {
    if (!course) return
    enroll(courseId, {
      title: course.title,
      provider: course.provider,
      duration: course.duration_hours,
      difficulty: course.difficulty,
    })
    toast.success('Enrolled successfully!')
  }

  const handleStartModule = (index) => {
    if (!enrolled) {
      toast.error('Please enroll first')
      return
    }
    setActiveModule(index)
  }

  const handleCompleteModule = (index) => {
    completeModule(courseId, index)
    setActiveModule(null)
    toast.success(`Module ${index + 1} completed!`)

    if (completedModules.length + 1 === fullCourseLength) {
      toast.success('Congratulations! All modules completed. You can now submit the course.', { duration: 5000 })
    }
  }

  const handleSubmit = () => {
    if (!isComplete) {
      toast.error('Complete all modules before submitting this course')
      return
    }
    const result = submitCourse(courseId)
    if (result.success) {
      toast.success('Course submitted successfully! View it in Course Records.')
    } else {
      toast.error(result.error || 'Failed to submit course')
    }
  }

  if (loading) {
    return (
      <PageWrapper>
        <div className="space-y-6">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        </div>
      </PageWrapper>
    )
  }

  if (!course) return null

  const enrollments = course.enrollments?.toLocaleString?.() ?? '0'

  return (
    <PageWrapper>
      <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-400 dark:hover:text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Back</span>
        </button>

        {/* Course Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white sm:p-8">
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-200" aria-hidden="true" />
              <span className="text-sm text-indigo-200">{course.provider}</span>
            </div>
            <h1 className="mb-4 text-2xl font-bold sm:text-3xl">{course.title}</h1>
            <p className="mb-6 max-w-2xl text-sm text-indigo-100 sm:text-base">{course.description}</p>
            <div className="flex flex-wrap items-center gap-4">
              <Badge variant={DIFFICULTY_COLORS[course.difficulty] || 'default'}>
                {DIFFICULTY_LABELS[course.difficulty] || 'N/A'}
              </Badge>
              <span className="flex items-center gap-1.5 text-sm text-indigo-100">
                <Clock className="h-4 w-4" aria-hidden="true" /> {course.duration_hours} hours
              </span>
              <span className="flex items-center gap-1.5 text-sm text-indigo-100">
                <Star className="h-4 w-4 text-amber-300" aria-hidden="true" /> {course.rating}
              </span>
              <span className="flex items-center gap-1.5 text-sm text-indigo-100">
                <Users className="h-4 w-4" aria-hidden="true" /> {enrollments} enrolled
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar (if enrolled) */}
        {enrolled && (
          <Card>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Your Progress</h3>
              <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{progress}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-slate-700/60">
              <motion.div
                className="h-2.5 rounded-full bg-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {completedModules.length} of {fullCourseLength} modules completed
            </p>

            {isComplete && !submitted && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                  <span className="text-sm font-semibold">All modules completed!</span>
                </div>
                <Button variant="success" onClick={handleSubmit}>
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Mark as Submitted
                </Button>
              </div>
            )}

            {submitted && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-semibold">Submitted — view it in Course Records</span>
              </div>
            )}
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Active Module View */}
            {activeModule !== null && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-2 border-indigo-200 dark:border-indigo-500/40">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      Module {activeModule + 1}: {sampleModules[activeModule].title}
                    </h2>
                    <button
                      onClick={() => setActiveModule(null)}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400"
                    >
                      Close
                    </button>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-8 text-center dark:bg-slate-800/60">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-500/15">
                      <PlayCircle className="h-8 w-8 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                    </div>
                    <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">{sampleModules[activeModule].title}</h3>
                    <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">Duration: {sampleModules[activeModule].duration}</p>
                    <div className="mb-6 rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        This is a simulated lesson view. In a real implementation, this would contain
                        the actual course content, videos, and interactive materials.
                      </p>
                    </div>
                    <Button onClick={() => handleCompleteModule(activeModule)}>
                      Mark as Complete
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* About */}
            <Card>
              <h2 className="mb-3 text-lg font-semibold text-slate-900 dark:text-slate-100">About this course</h2>
              <p className="leading-relaxed text-slate-600 dark:text-slate-300">{course.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {course.competency_tags?.map((tag) => (
                  <span key={tag} className="rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {tag}
                  </span>
                ))}
              </div>
            </Card>

            {/* Course Content */}
            <Card>
              <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Course Content</h2>
              <div className="space-y-2">
                {sampleModules.map((mod, i) => {
                  const isCompleted = completedModules.includes(i)
                  const isCurrent = !isCompleted && (i === 0 || completedModules.includes(i - 1))

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => enrolled && (isCompleted || isCurrent) && handleStartModule(i)}
                      className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
                        enrolled && (isCompleted || isCurrent)
                          ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          : 'opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          isCompleted
                            ? 'bg-emerald-100 dark:bg-emerald-500/15'
                            : isCurrent
                            ? 'bg-indigo-100 dark:bg-indigo-500/15'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                          ) : mod.type === 'video' ? (
                            <PlayCircle className={`h-4 w-4 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} aria-hidden="true" />
                          ) : mod.type === 'quiz' ? (
                            <CheckCircle2 className={`h-4 w-4 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} aria-hidden="true" />
                          ) : (
                            <BookOpen className={`h-4 w-4 ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} aria-hidden="true" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{mod.title}</p>
                          <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{mod.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{mod.duration}</span>
                        {!enrolled && <Lock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="sticky top-24">
              <div className="mb-4 text-center">
                <div className="mb-1 text-3xl font-bold text-slate-900 dark:text-slate-100">{course.duration_hours}h</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Duration</p>
              </div>

              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Format</span>
                  <span className="font-medium capitalize text-slate-900 dark:text-slate-100">{course.format}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Difficulty</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{DIFFICULTY_LABELS[course.difficulty]}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Rating</span>
                  <span className="flex items-center gap-1 font-medium text-slate-900 dark:text-slate-100">
                    <Star className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" /> {course.rating}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Enrollments</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{enrollments}</span>
                </div>
              </div>

              {enrolled ? (
                <Button
                  onClick={() => {
                    const nextModule = sampleModules.findIndex((_, i) => !completedModules.includes(i))
                    if (nextModule >= 0) {
                      handleStartModule(nextModule)
                    } else {
                      toast.success(submitted ? 'Already submitted' : 'Course completed! You can submit it now.')
                    }
                  }}
                  className="w-full"
                >
                  <PlayCircle className="h-4 w-4" aria-hidden="true" />
                  {isComplete ? (submitted ? 'Submitted' : 'Course Completed') : 'Continue Learning'}
                </Button>
              ) : (
                <Button onClick={handleEnroll} className="w-full">
                  Enroll Now
                </Button>
              )}
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Provider</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/15">
                  <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{course.provider}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Official iGOT Course</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  )
}