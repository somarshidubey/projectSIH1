import { motion } from 'framer-motion'

export default function Card({ children, className = '', hover = false, ...props }) {
  const Comp = hover ? motion.div : 'div'
  const motionProps = hover
    ? {
        whileHover: { y: -2 },
        transition: { duration: 0.2 },
      }
    : {}

  return (
    <Comp
      className={`rounded-xl border border-slate-100 bg-white p-6 shadow-md transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 ${className}`}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  )
}