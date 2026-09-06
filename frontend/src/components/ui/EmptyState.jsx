import { BookOpen, Upload, Search } from 'lucide-react'

const icons = {
  book: BookOpen,
  upload: Upload,
  search: Search,
}

export default function EmptyState({ icon = 'book', title, description, action }) {
  const Icon = icons[icon] || BookOpen

  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action}
    </div>
  )
}