import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Circle } from 'lucide-react'

export default function QuizQuestion({ question, index, selected, onAnswer }) {
  const answered = selected !== null && selected !== undefined && selected !== ''
  const correctLetter = question.correct_answer

  const optionState = (letter) => {
    if (!answered) return 'idle'
    if (letter === correctLetter) return 'correct'
    if (letter === selected) return 'wrong'
    return 'disabled'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border-2 border-slate-200 p-4 dark:border-slate-700"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
          {index + 1}
        </span>
        <div className="flex-1">
          <p className="font-medium text-slate-900 dark:text-slate-100">{question.question}</p>

          <div className="mt-3 space-y-2" role="group" aria-live="polite">
            {question.options.map((opt, j) => {
              const letter = String.fromCharCode(65 + j)
              const optionText = opt.replace(/^[A-D]\)\s*/, '')
              const state = optionState(letter)

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={answered}
                  onClick={() => onAnswer(letter)}
                  aria-pressed={selected === letter}
                  className={`
                    w-full flex items-center gap-2 p-2.5 rounded text-left text-sm transition-all duration-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500
                    ${
                      state === 'idle' &&
                      'cursor-pointer border border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-200 dark:hover:border-indigo-500/50 dark:hover:bg-indigo-500/10'
                    }
                    ${
                      state === 'correct' &&
                      'border border-emerald-300 bg-emerald-100 font-medium text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300'
                    }
                    ${
                      state === 'wrong' &&
                      'border border-rose-300 bg-rose-100 font-medium text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300'
                    }
                    ${
                      state === 'disabled' &&
                      'border border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-500'
                    }
                  `}
                >
                  <span className="h-5 w-5 flex-shrink-0">
                    {state === 'correct' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                    ) : state === 'wrong' ? (
                      <XCircle className="h-5 w-5 text-rose-500" aria-hidden="true" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <span className="mr-1 font-semibold">{letter}.</span>
                    {optionText}
                  </span>
                </button>
              )
            })}
          </div>

          {answered && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3">
              <div
                role="status"
                className={`rounded p-3 text-sm ${
                  selected === correctLetter
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-300'
                }`}
              >
                <p className="font-medium">
                  {selected === correctLetter
                    ? `Correct! The answer is ${correctLetter}.`
                    : `Incorrect. The correct answer is ${correctLetter}.`}
                </p>
              </div>
              <div className="mt-2 rounded bg-blue-50 p-3 text-sm dark:bg-blue-500/10">
                <p className="font-medium text-blue-800 dark:text-blue-300">Explanation:</p>
                <p className="text-blue-700 dark:text-blue-400">{question.explanation}</p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}