// Synthetic UI-only fixtures. No identities, grades or writes from a real service.
const fs = require('node:fs')
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const subject = { id: id(2), name: 'Raciocínio Lógico e Matemática' }
const question = {
  id: id(3),
  statement:
    'Uma equipe resolveu 20 questões e acertou 15. Qual foi a porcentagem de acertos?',
  difficulty: null,
  source_label: 'Fixture de teste visual',
  source_year: 2026,
  source_url: null,
  options: [
    { id: id(4), option_label: 'A', content: '75%', position: 1 },
    { id: id(5), option_label: 'B', content: '25%', position: 2 },
  ],
}
const contest = {
  id: id(1),
  slug: 'concurso-teste',
  title: 'Concurso de teste — área administrativa',
  organization: 'Órgão de teste',
  exam_board: 'Banca de teste',
  published_at: '2026-11-25',
  status: 'published',
  study_positions: [
    {
      id: id(6),
      title: 'Técnico Administrativo',
      education_level: 'Médio',
      area: 'Administrativa',
      status: 'published',
    },
  ],
  study_notices: [
    {
      id: id(7),
      contest_id: id(1),
      title: 'Edital de teste',
      version: '1',
      publication_date: '2026-11-25',
      source_url: 'https://example.org/edital.pdf',
      status: 'published',
      study_notice_subjects: [{ position: 1, study_subjects: subject }],
    },
  ],
}
const performance = {
  periodDays: 30,
  timezone: 'America/Sao_Paulo',
  periodStart: '2026-10-27',
  generatedAt: '2026-11-25T12:00:00Z',
  days: [
    { date: '2026-11-23', attempts: 3, correct: 2, accuracy: 67 },
    { date: '2026-11-24', attempts: 4, correct: 3, accuracy: 75 },
    { date: '2026-11-25', attempts: 3, correct: 2, accuracy: 67 },
  ],
  totals: { attempts: 10, correct: 7, accuracy: 70, activeDays: 3 },
  performanceBySubject: [
    {
      subjectId: subject.id,
      subjectName: subject.name,
      attempts: 10,
      correctAnswers: 7,
      accuracy: 70,
    },
  ],
  examSummary: { count: 2, averageScore: 65, bestScore: 80 },
  recentExams: [
    {
      id: id(30),
      status: 'completed',
      questionCount: 10,
      answeredCount: 10,
      score: 50,
      finishedAt: '2026-11-24T12:00:00Z',
    },
    {
      id: id(31),
      status: 'completed',
      questionCount: 10,
      answeredCount: 10,
      score: 80,
      finishedAt: '2026-11-25T12:00:00Z',
    },
  ],
}
const catalog = JSON.parse(
  fs.readFileSync('content/sources/official-exams.json', 'utf8'),
)
function payload(path, url, state) {
  if (path === '/api/auth/me')
    return { user: { id: id(50), email: 'student@example.test' } }
  if (path === '/api/study/dashboard')
    return {
      dashboard: {
        questionsAnswered: 10,
        correctAnswers: 7,
        accuracy: 70,
        activeGoal: null,
        recentAttempts: [
          {
            id: id(20),
            questionId: question.id,
            isCorrect: true,
            submittedAt: '2026-11-25T12:00:00Z',
          },
        ],
      },
      performanceBySubject: performance.performanceBySubject,
    }
  if (path === '/api/study/catalog') return { subjects: [subject], topics: [] }
  if (path === '/api/study/contests')
    return { contests: [contest], followedContestIds: [] }
  if (path === '/api/study/contests/concurso-teste')
    return { contest, isFollowed: false }
  if (path === '/api/study/goals') return { goal: null }
  if (path === '/api/study/questions')
    return {
      questions: [question],
      page: 1,
      pageSize: 20,
      total: 1,
      hasMore: false,
    }
  if (path === '/api/study/favorites')
    return {
      favorites: [
        {
          question_id: question.id,
          created_at: '2026-11-25T12:00:00Z',
          study_questions: question,
        },
      ],
    }
  if (path === '/api/study/questions/wrong')
    return {
      questions: [
        {
          questionId: question.id,
          statement: question.statement,
          subjectName: subject.name,
          sourceLabel: question.source_label,
          sourceYear: 2026,
          lastAttemptAt: '2026-11-25T12:00:00Z',
          options: question.options.map((o) => ({
            ...o,
            label: o.option_label,
          })),
        },
      ],
    }
  if (path === '/api/study/attempts')
    return {
      attempts: [
        {
          id: id(20),
          question_id: question.id,
          selected_option_id: id(4),
          is_correct: true,
          submitted_at: '2026-11-25T12:00:00Z',
          study_questions: question,
        },
      ],
    }
  if (path === '/api/study/performance') return performance
  if (path === '/api/study/official-exams') return catalog
  if (path === '/api/study/comparison')
    return {
      comparison: {
        enabled: state.comparisonReady,
        status: state.comparisonReady ? 'ready' : 'disabled',
        consentVersion: '2026-11-v1',
        monthStart: '2026-11-01',
        timezone: 'America/Sao_Paulo',
        requiredQuestions: 20,
        minimumPeers: 10,
        yourAnswered: state.comparisonReady ? 20 : 0,
        yourAccuracy: state.comparisonReady ? 60 : null,
        peerAverage: state.comparisonReady ? 80 : null,
        contestTitle: contest.title,
        questions: [],
      },
    }
  if (path === '/api/study/exams') return { sessions: [] }
  if (path === '/api/study/exams/availability')
    return {
      available: 1,
      maxQuestions: 1,
      filters: {
        contestId: url.searchParams.get('contestId'),
        subjectId: url.searchParams.get('subjectId'),
        topicId: url.searchParams.get('topicId'),
      },
    }
  if (path.startsWith('/api/study/exams/'))
    return {
      session: {
        id: id(60),
        status: state.examCompleted ? 'completed' : 'active',
        questionCount: 1,
        startedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        serverNow: new Date().toISOString(),
        finishedAt: state.examCompleted ? new Date().toISOString() : null,
        answeredCount: state.examCompleted ? 1 : 0,
        correctCount: state.examCompleted ? 1 : 0,
        score: state.examCompleted ? 100 : 0,
        questions: [
          {
            position: 1,
            question,
            result: state.examCompleted
              ? {
                  attemptId: id(20),
                  selectedOptionId: id(4),
                  correctOptionId: id(4),
                  isCorrect: true,
                  explanation: '15/20 = 75%.',
                  submittedAt: '2026-11-25T12:00:00Z',
                }
              : null,
          },
        ],
      },
    }
  if (path === '/api/admin/overview')
    return {
      role: 'owner',
      metrics: {
        contests: 1,
        contestDrafts: 0,
        notices: 1,
        noticeDrafts: 0,
        positions: 1,
        positionDrafts: 0,
        questions: 0,
        questionDrafts: 0,
        publishedQuestions: 0,
        subjects: 1,
        topics: 0,
      },
      recentChanges: [],
    }
  if (path === '/api/admin/content-releases') return { releases: [] }
  if (path === '/api/admin/imports') return { batches: [] }
  if (path === '/api/admin/review-queue')
    return { questions: [], page: 1, pageSize: 20, total: 0, hasMore: false }
  if (path === '/api/admin/contests') return { contests: [contest] }
  if (path === '/api/admin/notices') return { notices: contest.study_notices }
  if (path === '/api/admin/positions')
    return { positions: contest.study_positions }
  if (path === '/api/admin/subjects') return { subjects: [subject] }
  if (path === '/api/admin/topics') return { topics: [] }
  if (path === '/api/admin/questions') return { questions: [] }
  if (path.endsWith('/subjects')) return { assignments: [] }
  throw new Error('Unhandled UI fixture: ' + path)
}
module.exports = { payload, id, question, contest }
