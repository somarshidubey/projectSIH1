import { motion } from 'framer-motion'

export default function Card({ children, className = '', hover = false, ...props }) {
  const Comp = hover ? motion.div : 'div'
  const motionProps = hover
    ? {
        whileHover: { y: -2 },
        transition: { duration: 0.15 },
      }
    : {}

  return (
    <Comp
      className={`rounded-none border border-[#2b211c] bg-[#141210] p-6 shadow-[4px_4px_0_#000] transition-colors duration-200 ${className}`}
      {...motionProps}
      {...props}
    >
      {children}
    </Comp>
  )
}