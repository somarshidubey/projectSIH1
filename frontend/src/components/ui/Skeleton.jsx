import { motion } from 'framer-motion'

function SkeletonLine({ className = '' }) {
  return (
    <motion.div
      animate={{ opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      className={`rounded bg-slate-200 dark:bg-slate-700/60 ${className}`}
    />
  )
}

const skeletonCard = 'rounded-xl border border-slate-100 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-900'

export function SkeletonCard() {
  return (
    <div className={skeletonCard}>
      <div className="mb-4 flex items-center justify-between">
        <SkeletonLine className="h-5 w-32" />
        <SkeletonLine className="h-6 w-16 rounded-full" />
      </div>
      <SkeletonLine className="mb-2 h-3 w-full" />
      <SkeletonLine className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className={skeletonCard}>
          <div className="flex items-center justify-between">
            <SkeletonLine className="h-10 w-10 rounded-lg" />
            <SkeletonLine className="h-6 w-12 rounded-full" />
          </div>
          <SkeletonLine className="mt-4 h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${skeletonCard} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <SkeletonLine className="mb-2 h-5 w-48" />
              <SkeletonLine className="h-3 w-32" />
            </div>
            <SkeletonLine className="h-8 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default SkeletonLine