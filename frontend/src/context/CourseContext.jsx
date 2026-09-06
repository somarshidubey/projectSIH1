import { createContext, useContext, useState, useEffect } from 'react'
import { TOTAL_MODULES } from '../constants/courses'

const CourseContext = createContext()

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

export function CourseProvider({ children }) {
  const [enrollments, setEnrollments] = useState(() => {
    return safeParse(localStorage.getItem('saksham-enrollments'), {})
  })

  const [submittedCourses, setSubmittedCourses] = useState(() => {
    return safeParse(localStorage.getItem('saksham-submitted-courses'), [])
  })

  useEffect(() => {
    localStorage.setItem('saksham-enrollments', JSON.stringify(enrollments))
  }, [enrollments])

  useEffect(() => {
    localStorage.setItem('saksham-submitted-courses', JSON.stringify(submittedCourses))
  }, [submittedCourses])

  const enroll = (courseId, courseData) => {
    setEnrollments((prev) => ({
      ...prev,
      [courseId]: {
        ...courseData,
        enrolledAt: new Date().toISOString(),
        progress: 0,
        completedModules: [],
        lastAccessed: new Date().toISOString(),
      },
    }))
  }

  const isEnrolled = (courseId) => {
    return !!enrollments[courseId]
  }

  const getEnrollment = (courseId) => {
    return enrollments[courseId] || null
  }

  const completeModule = (courseId, moduleIndex) => {
    setEnrollments((prev) => {
      const enrollment = prev[courseId]
      if (!enrollment) return prev

      const completed = new Set(enrollment.completedModules)
      completed.add(moduleIndex)

      const progress = Math.round((completed.size / TOTAL_MODULES) * 100)

      return {
        ...prev,
        [courseId]: {
          ...enrollment,
          completedModules: Array.from(completed),
          progress,
          lastAccessed: new Date().toISOString(),
        },
      }
    })
  }

  const submitCourse = (courseId) => {
    const enrollment = enrollments[courseId]
    if (!enrollment) return { success: false, error: 'Not enrolled in this course' }
    if (enrollment.progress !== 100) {
      return { success: false, error: 'Course must be 100% complete before submission' }
    }
    if (submittedCourses.some((c) => c.courseId === courseId)) {
      return { success: false, error: 'This course has already been submitted' }
    }

    const record = {
      courseId,
      title: enrollment.title,
      provider: enrollment.provider,
      duration: enrollment.duration,
      difficulty: enrollment.difficulty,
      progress: 100,
      completedModules: enrollment.completedModules || [],
      submittedAt: new Date().toISOString(),
    }
    setSubmittedCourses((prev) => [record, ...prev])
    return { success: true }
  }

  const getSubmittedCourses = () => submittedCourses

  const isSubmitted = (courseId) => submittedCourses.some((c) => c.courseId === courseId)

  const getEnrolledCourses = () => {
    return Object.entries(enrollments).map(([courseId, data]) => ({
      courseId,
      ...data,
    }))
  }

  const getTotalProgress = () => {
    const enrolled = Object.values(enrollments)
    if (enrolled.length === 0) return 0
    const total = enrolled.reduce((sum, e) => sum + (e.progress || 0), 0)
    return Math.round(total / enrolled.length)
  }

  return (
    <CourseContext.Provider
      value={{
        enrollments,
        enroll,
        isEnrolled,
        getEnrollment,
        completeModule,
        submitCourse,
        getSubmittedCourses,
        isSubmitted,
        getEnrolledCourses,
        getTotalProgress,
      }}
    >
      {children}
    </CourseContext.Provider>
  )
}

export function useCourses() {
  const ctx = useContext(CourseContext)
  if (!ctx) throw new Error('useCourses must be used within CourseProvider')
  return ctx
}
