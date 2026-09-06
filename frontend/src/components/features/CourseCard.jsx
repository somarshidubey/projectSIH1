import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Clock, Users, Star } from 'lucide-react'
import Badge from '../ui/Badge'
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '../../constants/courses'

export default function CourseCard({ course, index = 0 }) {
  const enrollments = course.enrollments?.toLocaleString?.() ?? '0'

  return (
    <Link to={`/course/${course.course_id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04 }}
        whileHover={{ y: -2 }}
        className="cursor-pointer rounded-lg border border-slate-100 bg-white p-4 transition-all duration-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="mb-2 flex items-start justify-between">
          <h4 className="text-sm font-medium leading-tight text-slate-900 dark:text-slate-100">{course.title}</h4>
          <Badge variant={DIFFICULTY_COLORS[course.difficulty] || 'default'}>
            {DIFFICULTY_LABELS[course.difficulty] || 'N/A'}
          </Badge>
        </div>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">{course.provider}</p>
        <p className="mb-3 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{course.description}</p>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {course.duration_hours}h
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" aria-hidden="true" />
            {enrollments}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-500" aria-hidden="true" />
            {course.rating}
          </span>
        </div>
      </motion.div>
    </Link>
  )
}