import { useState } from 'react'
import { motion } from 'framer-motion'
import { FileQuestion, Upload, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import EmptyState from '../components/ui/EmptyState'
import QuizQuestion from '../components/features/QuizQuestion'
import PageWrapper from '../components/layout/PageWrapper'
import { apiPost, apiUpload } from '../lib/api'
import { DIFFICULTY_OPTIONS } from '../constants/courses'
import toast from 'react-hot-toast'

const questionOptions = [
  { value: 3, label: '3 questions' },
  { value: 5, label: '5 questions' },
  { value: 7, label: '7 questions' },
  { value: 10, label: '10 questions' },
]

export default function QuizGenerator() {
  const [file, setFile] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [query, setQuery] = useState('')
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState('mixed')
  const [quiz, setQuiz] = useState(null)
  const [loading, setLoading] = useState(false)
  const [answers, setAnswers] = useState({})

  const upload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const data = await apiUpload('/upload-document', file)
      setUploadResult(data)
      toast.success(`Uploaded ${data.chunks_stored} chunks from ${data.filename}`)
    } catch (err) {
      toast.error(err.message || 'Failed to upload document')
    }
    setLoading(false)
  }

  const generate = async () => {
    setLoading(true)
    try {
      const data = await apiPost('/generate-quiz', { query, num_questions: numQuestions, difficulty })
      setQuiz(data)
      setAnswers({})
      toast.success(`Generated ${data.questions.length} questions`)
    } catch (err) {
      toast.error(err.message || 'Failed to generate quiz')
    }
    setLoading(false)
  }

  const answerQuestion = (index, letter) => {
    setAnswers((prev) => ({ ...prev, [index]: letter }))
  }

  const resetQuiz = () => {
    setQuiz(null)
    setAnswers({})
  }

  const totalQuestions = quiz?.questions?.length ?? 0
  const answeredCount = Object.keys(answers).length
  const score = quiz?.questions?.reduce((acc, q, i) => (answers[i] === q.correct_answer ? acc + 1 : acc), 0) ?? 0
  const allAnswered = totalQuestions > 0 && answeredCount === totalQuestions

  return (
    <PageWrapper>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
            <FileQuestion className="h-8 w-8 text-indigo-600" aria-hidden="true" />
            AI Quiz Generator
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Upload documents and auto-generate MCQs using RAG</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Upload className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              1. Upload Document
            </h2>
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center transition-colors hover:border-indigo-400 dark:border-slate-700">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setFile(e.target.files[0])}
                className="sr-only"
                id="file-upload"
                aria-label="Upload document"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Upload className="h-8 w-8 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {file ? file.name : 'Click to select PDF, DOCX, or TXT'}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Maximum file size: 10MB</p>
              </label>
            </div>
            <Button onClick={upload} disabled={!file} loading={loading} variant="success" className="mt-4 w-full">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload &amp; Process
            </Button>
            {uploadResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-500/10"
                role="status"
              >
                <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Uploaded successfully</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-500">Chunks stored: {uploadResult.chunks_stored}</p>
                </div>
              </motion.div>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              <Sparkles className="h-5 w-5 text-purple-500" aria-hidden="true" />
              2. Generate Quiz
            </h2>
            <div className="space-y-4">
              <Input
                label="Topic / Query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g., GDP calculation methods"
              />
              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Questions"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  options={questionOptions}
                />
                <Select
                  label="Difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  options={DIFFICULTY_OPTIONS}
                />
              </div>
              <Button onClick={generate} disabled={!uploadResult} loading={loading} className="w-full">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Generate Quiz
              </Button>
            </div>
          </Card>
        </div>

        {quiz && quiz.questions && quiz.questions.length > 0 && (
          <Card>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Generated Quiz ({quiz.questions.length} questions)
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Difficulty: {quiz.difficulty} &middot; Click an option to answer
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {answeredCount} of {totalQuestions} answered
                  </p>
                  {answeredCount > 0 && (
                    <p className={`text-sm font-bold ${allAnswered ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      Score: {score}/{answeredCount}
                    </p>
                  )}
                  {allAnswered && (
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {score}/{totalQuestions} correct ({totalQuestions ? Math.round((score / totalQuestions) * 100) : 0}%)
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={resetQuiz}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  New Quiz
                </Button>
              </div>
            </div>
            <div className="space-y-4">
              {quiz.questions.map((q, i) => (
                <QuizQuestion
                  key={i}
                  question={q}
                  index={i}
                  selected={answers[i] ?? ''}
                  onAnswer={(letter) => answerQuestion(i, letter)}
                />
              ))}
            </div>
          </Card>
        )}

        {quiz && quiz.questions && quiz.questions.length === 0 && (
          <EmptyState
            icon="search"
            title="No questions generated"
            description="Try uploading a different document or changing the query topic."
          />
        )}
      </div>
    </PageWrapper>
  )
}