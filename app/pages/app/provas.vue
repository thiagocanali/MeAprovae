<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { createAttemptIdempotencyKeys } from '~~/shared/domain/questions/attempt-idempotency'
import { calculateExamScore } from '~~/shared/domain/questions/exam-results'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Simulados | Me Aprovaê' })

interface Contest {
  id: string
  title: string
  organization: string | null
}

interface QuestionOption {
  id: string
  option_label: string
  content: string
  position: number
}

interface Question {
  id: string
  statement: string
  source_label: string | null
  source_year: number | null
  options: QuestionOption[]
}

interface AttemptResult {
  attemptId: string
  selectedOptionId: string
  isCorrect: boolean
  correctOptionId: string
  explanation: string
  wasDuplicate: boolean
}

interface AnsweredQuestion {
  question: Question
  selectedOptionId: string
  result: AttemptResult
}

const { data: contestsData, pending: contestsPending, error: contestsError } =
  await useFetch<{ contests: Contest[] }>('/api/study/contests')

const route = useRoute()
const selectedContestId = ref(String(route.query.contestId || ''))
const questionCount = ref(10)
const questions = ref<Question[]>([])
const currentIndex = ref(0)
const selectedOptionId = ref('')
const currentResult = ref<AttemptResult | null>(null)
const answers = ref<AnsweredQuestion[]>([])
const loading = ref(false)
const submitPending = ref(false)
const errorMessage = ref('')
const started = ref(false)
const finished = ref(false)
const remainingSeconds = ref(0)
let timer: ReturnType<typeof setInterval> | null = null
const attemptKeys = createAttemptIdempotencyKeys()

const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)
const answeredCount = computed(() => answers.value.length)
const correctCount = computed(() => answers.value.filter((answer) => answer.result.isCorrect).length)
const unansweredCount = computed(() => questions.value.length - answeredCount.value)
const score = computed(() => calculateExamScore(correctCount.value, questions.value.length))
const reviewedAnswers = computed(() => answers.value.map((answer) => ({
  ...answer,
  selectedOption: answer.question.options.find((option) => option.id === answer.selectedOptionId),
  correctOption: answer.question.options.find((option) => option.id === answer.result.correctOptionId),
})))
const progress = computed(() => questions.value.length ? Math.round(((currentIndex.value + 1) / questions.value.length) * 100) : 0)
const timeLabel = computed(() => {
  const minutes = Math.floor(remainingSeconds.value / 60)
  const seconds = remainingSeconds.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function finishExam() {
  stopTimer()
  finished.value = true
  started.value = false
  currentResult.value = null
}

function startTimer(seconds: number) {
  stopTimer()
  remainingSeconds.value = seconds
  timer = setInterval(() => {
    remainingSeconds.value -= 1
    if (remainingSeconds.value <= 0) finishExam()
  }, 1000)
}

async function startExam() {
  loading.value = true
  errorMessage.value = ''
  try {
    const query = selectedContestId.value ? { contestId: selectedContestId.value } : {}
    const response = await $fetch<{ questions: Question[] }>('/api/study/questions', { query })
    const available = [...response.questions]

    if (available.length < questionCount.value) {
      errorMessage.value = `Há apenas ${available.length} questão(ões) disponível(is) para este simulado. Cadastre e publique mais questões ou reduza a quantidade.`
      return
    }

    questions.value = available
      .sort(() => Math.random() - 0.5)
      .slice(0, questionCount.value)
      .map((question) => ({
        ...question,
        options: [...question.options].sort(() => Math.random() - 0.5),
      }))

    currentIndex.value = 0
    selectedOptionId.value = ''
    currentResult.value = null
    answers.value = []
    finished.value = false
    started.value = true
    startTimer(questionCount.value === 10 ? 60 * 60 : 120 * 60)
  } catch {
    errorMessage.value = 'Não foi possível carregar as questões do simulado. Tente novamente.'
  } finally {
    loading.value = false
  }
}

async function submitAnswer() {
  if (!currentQuestion.value || !selectedOptionId.value || submitPending.value || currentResult.value) return
  submitPending.value = true
  errorMessage.value = ''
  const questionId = currentQuestion.value.id
  const optionId = selectedOptionId.value

  try {
    const result = await $fetch<{ result: AttemptResult }>('/api/study/attempts', {
      method: 'POST',
      body: {
        questionId,
        optionId,
        idempotencyKey: attemptKeys.forSubmission(questionId, optionId),
      },
    })

    currentResult.value = result.result
    attemptKeys.clear(questionId, optionId)
    answers.value.push({
      question: currentQuestion.value,
      selectedOptionId: selectedOptionId.value,
      result: result.result,
    })
  } catch {
    errorMessage.value = 'Não foi possível registrar esta resposta. Sua seleção foi mantida; tente novamente.'
  } finally {
    submitPending.value = false
  }
}

function nextQuestion() {
  if (currentIndex.value >= questions.value.length - 1) {
    finishExam()
    return
  }

  currentIndex.value += 1
  selectedOptionId.value = ''
  currentResult.value = null
  errorMessage.value = ''
}

function resetExam() {
  stopTimer()
  started.value = false
  finished.value = false
  questions.value = []
  answers.value = []
  currentIndex.value = 0
  selectedOptionId.value = ''
  currentResult.value = null
  remainingSeconds.value = 0
  errorMessage.value = ''
}

onBeforeUnmount(stopTimer)
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav>
        <NuxtLink to="/app/concursos">Concursos</NuxtLink>
        <NuxtLink to="/app/questoes">Questões</NuxtLink>
        <NuxtLink to="/app/provas">Simulados</NuxtLink>
        <NuxtLink to="/app/historico">Histórico</NuxtLink>
      </nav>
    </header>

    <section class="study-content">
      <template v-if="!started && !finished">
        <p class="auth-eyebrow">SIMULADOS</p>
        <h1>Faça uma prova</h1>
        <p class="auth-description">
          Modo estudo: veja a correção após cada resposta. As tentativas são registradas no histórico.
        </p>

        <form class="study-form study-exam-form" @submit.prevent="startExam">
          <label for="exam-contest">Concurso</label>
          <select id="exam-contest" v-model="selectedContestId" :disabled="contestsPending || loading">
            <option value="">Todos os concursos</option>
            <option v-for="contest in contestsData?.contests ?? []" :key="contest.id" :value="contest.id">
              {{ contest.organization ? `${contest.organization} — ${contest.title}` : contest.title }}
            </option>
          </select>

          <p v-if="contestsError" class="study-error">
            Não foi possível carregar os concursos. Você ainda pode tentar iniciar o simulado com todas as questões.
          </p>

          <label for="exam-count">Quantidade de questões</label>
          <select id="exam-count" v-model.number="questionCount" :disabled="loading">
            <option :value="10">10 questões · até 60 min</option>
            <option :value="20">20 questões · até 120 min</option>
          </select>

          <button class="study-primary-button" type="submit" :disabled="loading">
            {{ loading ? 'Preparando prova…' : 'Começar simulado' }}
          </button>
        </form>

        <div v-if="errorMessage" class="study-state study-error" role="alert">
          {{ errorMessage }}
        </div>

        <section class="study-section">
          <article class="study-card">
            <h2>Como funciona</h2>
            <ul>
              <li>As questões são selecionadas entre as publicadas no banco.</li>
              <li>A ordem das questões e alternativas é embaralhada ao iniciar.</li>
              <li>Você recebe o resultado e a explicação após responder.</li>
              <li>As respostas entram no histórico e no seu desempenho.</li>
            </ul>
          </article>
        </section>
      </template>

      <template v-else-if="started && currentQuestion">
        <div class="study-exam-top">
          <div>
            <p class="auth-eyebrow">SIMULADO EM ANDAMENTO</p>
            <h1>Questão {{ currentIndex + 1 }} de {{ questions.length }}</h1>
          </div>
          <div class="study-exam-timer" :class="{ 'is-warning': remainingSeconds <= 300 }" aria-live="polite">
            {{ timeLabel }}
          </div>
        </div>

        <div class="study-progress-line">
          <span>{{ answeredCount }} respondida(s)</span>
          <span>{{ progress }}%</span>
        </div>

        <article class="study-question-card">
          <p v-if="currentQuestion.source_label || currentQuestion.source_year" class="study-muted">
            {{ currentQuestion.source_label || 'Fonte não identificada' }}<span v-if="currentQuestion.source_year"> · {{ currentQuestion.source_year }}</span>
          </p>
          <h2>{{ currentQuestion.statement }}</h2>

          <fieldset class="study-options" :disabled="Boolean(currentResult) || submitPending">
            <legend>Selecione uma alternativa</legend>
            <label
              v-for="option in currentQuestion.options"
              :key="option.id"
              class="study-option"
              :class="{
                'is-selected': selectedOptionId === option.id,
                'is-correct': currentResult?.correctOptionId === option.id,
                'is-wrong': currentResult?.selectedOptionId === option.id && !currentResult.isCorrect,
              }"
            >
              <input v-model="selectedOptionId" type="radio" :value="option.id" :name="currentQuestion.id">
              <span class="study-option-label">{{ option.option_label }}</span>
              <span>{{ option.content }}</span>
            </label>
          </fieldset>

          <div v-if="errorMessage" class="study-state study-error" role="alert">{{ errorMessage }}</div>

          <button
            v-if="!currentResult"
            class="study-primary-button"
            :disabled="!selectedOptionId || submitPending"
            @click="submitAnswer"
          >
            {{ submitPending ? 'Registrando resposta…' : 'Confirmar resposta' }}
          </button>

          <section
            v-else
            class="study-result"
            :class="currentResult.isCorrect ? 'result-correct' : 'result-wrong'"
            aria-live="polite"
          >
            <h3>{{ currentResult.isCorrect ? 'Resposta correta!' : 'Resposta incorreta.' }}</h3>
            <p v-if="currentResult.explanation">{{ currentResult.explanation }}</p>
            <p v-else class="study-muted">A resposta foi corrigida, mas esta questão ainda não possui explicação cadastrada.</p>
            <button class="study-primary-button" @click="nextQuestion">
              {{ currentIndex >= questions.length - 1 ? 'Finalizar prova' : 'Próxima questão' }}
            </button>
          </section>
        </article>
      </template>

      <template v-else-if="finished">
        <p class="auth-eyebrow">RESULTADO</p>
        <h1>Simulado concluído</h1>
        <p class="auth-description">
          Você respondeu {{ answeredCount }} de {{ questions.length }} questões; {{ unansweredCount }} não respondida(s).
        </p>

        <div class="study-stats">
          <article class="study-card">
            <span class="study-muted">Nota</span>
            <strong>{{ score }}%</strong>
          </article>
          <article class="study-card">
            <span class="study-muted">Acertos</span>
            <strong>{{ correctCount }}</strong>
          </article>
          <article class="study-card">
            <span class="study-muted">Erros</span>
            <strong>{{ answeredCount - correctCount }}</strong>
          </article>
        </div>

        <section class="study-section">
          <h2>Revisão</h2>
          <article v-for="(answer, index) in reviewedAnswers" :key="answer.question.id" class="study-card study-exam-review">
            <div>
              <span class="study-muted">Questão {{ index + 1 }}</span>
              <strong :class="answer.result.isCorrect ? 'study-review-correct' : 'study-review-wrong'">
                {{ answer.result.isCorrect ? 'Acerto' : 'Erro' }}
              </strong>
            </div>
            <p>{{ answer.question.statement }}</p>
            <p v-if="answer.selectedOption"><strong>Sua resposta:</strong> {{ answer.selectedOption.option_label }} — {{ answer.selectedOption.content }}</p>
            <p v-if="answer.correctOption"><strong>Resposta correta:</strong> {{ answer.correctOption.option_label }} — {{ answer.correctOption.content }}</p>
            <p v-if="answer.result.explanation" class="study-muted">{{ answer.result.explanation }}</p>
          </article>
        </section>

        <div class="study-actions">
          <button class="study-primary-button" @click="resetExam">Novo simulado</button>
          <NuxtLink class="study-secondary-button" to="/app/questoes">Continuar praticando</NuxtLink>
          <NuxtLink class="study-secondary-button" to="/app/historico">Ver histórico</NuxtLink>
        </div>
      </template>
    </section>
  </main>
</template>
