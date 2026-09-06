import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'
import { cn } from '../../utils/cn'

export default function ThemeToggle({ className, showLabel = false }) {
  const { dark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'shrink-0 items-center rounded-lg text-slate-500 transition-colors',
        'hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-slate-50',
        'dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-900',
        showLabel
          ? 'flex w-full justify-start gap-3 px-3 py-2.5 text-sm font-medium'
          : 'inline-flex size-9 justify-center',
        className,
      )}
    >
      {dark ? (
        <Sun className="size-4 shrink-0" aria-hidden="true" />
      ) : (
        <Moon className="size-4 shrink-0" aria-hidden="true" />
      )}
      {showLabel && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  )
}