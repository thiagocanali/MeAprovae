<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { createAttemptIdempotencyKeys } from '~~/shared/domain/questions/attempt-idempotency'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Resolver questões | Me Aprovaê' })

interface QuestionOption { id: string; option_label: string; content: string; position: number }
interface Question {
  id: string
  statement: string
  difficulty: 'easy' | 'medium' | 'hard' | null
  source_label: string | null
  source_year: number | null
  source_url: string | null
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

const route = useRoute()
const query = computed(() => ({
  ...(route.query.contestId ? { contestId: String(route.query.contestId) } : {}),
  ...(route.query.questionId ? { questionId: String(route.query.questionId) } : {}),
  ...(selectedSubjectId.value ? { subjectId: selectedSubjectId.value } : {}),
  ...(selectedTopicId.value ? { topicId: selectedTopicId.value } : {}),
  ...(selectedDifficulty.value ? { difficulty: selectedDifficulty.value } : {}),
}))
const selectedSubjectId = ref(typeof route.query.subjectId === 'string' ? route.query.subjectId : '')
const selectedTopicId = ref(typeof route.query.topicId === 'string' ? route.query.topicId : '')
const selectedDifficulty = ref(typeof route.query.difficulty === 'string' && ['easy', 'medium', 'hard'].includes(route.query.difficulty) ? route.query.difficulty : '')
const { data: catalogData, error: catalogError } = await useFetch<{ subjects: Array<{ id: string; name: string }>; topics: Array<{ id: string; subject_id: string; name: string }> }>('/api/study/catalog')
const availableTopics = computed(() => catalogData.value?.topics.filter(topic => topic.subject_id === selectedSubjectId.value) ?? [])
const { data, pending, error, refresh } = await useFetch<{ questions: Question[]; page: number; pageSize: number; total: number; hasMore: boolean }>('/api/study/questions', { query })
const { data: favoritesData, error: favoritesError, refresh: refreshFavorites } = await useFetch<{ favorites: Array<{ question_id: string }> }>('/api/study/favorites')
const currentIndex = ref(0)
const selectedOptionId = ref('')
const result = ref<AttemptResult | null>(null)
const questions = ref<Question[]>([])
const page = ref(1)
const totalQuestions = ref(0)
const hasMoreQuestions = ref(false)
const loadingMore = ref(false)
const loadMoreError = ref('')

const submitPending = ref(false)
const submitError = ref('')
const attemptKeys = createAttemptIdempotencyKeys()
const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)
const isFavorite = computed(() => Boolean(currentQuestion.value && favoritesData.value?.favorites.some((favorite) => favorite.question_id === currentQuestion.value?.id)))
const favoritePending = ref(false)
const favoriteError = ref('')
// Each filter/list/question transition invalidates work started in the previous view.
// A revision also distinguishes A → B → A from the original A request.
let practiceRevision = 0
function resetQuestionState() {
  practiceRevision += 1
  selectedOptionId.value = ''
  result.value = null
  submitPending.value = false
  submitError.value = ''
  favoritePending.value = false
  favoriteError.value = ''
  loadingMore.value = false
  loadMoreError.value = ''
}
watch(query, () => {
  resetQuestionState()
  questions.value = []
  currentIndex.value = 0
  page.value = 1
  totalQuestions.value = 0
  hasMoreQuestions.value = false
}, { flush: 'sync' })
watch(data, (response) => {
  if (!response) return
  resetQuestionState()
  questions.value = response.questions
  page.value = response.page
  totalQuestions.value = response.total
  hasMoreQuestions.value = response.hasMore
  currentIndex.value = 0
}, { immediate: true, flush: 'sync' })
onBeforeUnmount(() => { practiceRevision += 1 })

async function toggleFavorite() {
  if (!currentQuestion.value || favoritePending.value) return
  const revision = practiceRevision
  const questionId = currentQuestion.value.id
  const method = isFavorite.value ? 'DELETE' : 'POST'
  favoritePending.value = true
  favoriteError.value = ''
  try {
    await $fetch(`/api/study/questions/${questionId}/favorite`, { method })
    await refreshFavorites()
  } catch {
    if (revision === practiceRevision) favoriteError.value = 'Não foi possível atualizar seus favoritos. Tente novamente.'
  } finally {
    if (revision === practiceRevision) favoritePending.value = false
  }
}

async function submitAnswer() {
  if (!currentQuestion.value || !selectedOptionId.value || submitPending.value || result.value) return
  const revision = practiceRevision
  submitPending.value = true
  submitError.value = ''
  const questionId = currentQuestion.value.id
  const optionId = selectedOptionId.value
  try {
    const response = await $fetch<{ result: AttemptResult }>('/api/study/attempts', {
      method: 'POST',
      body: {
        questionId,
        optionId,
        idempotencyKey: attemptKeys.forSubmission(questionId, optionId),
      },
    })
    if (revision === practiceRevision) {
      result.value = response.result
      attemptKeys.clear(questionId, optionId)
    }
  } catch {
    if (revision === practiceRevision) submitError.value = 'Não foi possível registrar sua resposta. Sua seleção foi mantida; tente novamente.'
  } finally {
    if (revision === practiceRevision) submitPending.value = false
  }
}

async function loadMoreQuestions() {
  if (!hasMoreQuestions.value || loadingMore.value) return
  const revision = practiceRevision
  const nextQuery = { ...query.value, page: page.value + 1, pageSize: 20 }
  loadingMore.value = true
  loadMoreError.value = ''
  try {
    const response = await $fetch<{ questions: Question[]; page: number; pageSize: number; total: number; hasMore: boolean }>(
      '/api/study/questions',
      { query: nextQuery },
    )
    if (revision !== practiceRevision) return
    const knownIds = new Set(questions.value.map(question => question.id))
    questions.value.push(...response.questions.filter(question => !knownIds.has(question.id)))
    page.value = response.page
    totalQuestions.value = response.total
    hasMoreQuestions.value = response.hasMore
  } catch {
    if (revision === practiceRevision) loadMoreError.value = 'Não foi possível carregar mais questões. Tente novamente.'
  } finally {
    if (revision === practiceRevision) loadingMore.value = false
  }
}

async function nextQuestion() {
  if (loadingMore.value || submitPending.value) return
  const revision = practiceRevision
  if (currentIndex.value >= questions.value.length - 1 && hasMoreQuestions.value) {
    await loadMoreQuestions()
  }
  if (revision !== practiceRevision || currentIndex.value >= questions.value.length - 1) return
  resetQuestionState()
  currentIndex.value += 1
}
</script>

<template>
  <main class="study-page">
    <StudentNavigation />
    <section class="study-content">
      <p class="auth-eyebrow">PRÁTICA</p>
      <h1>Banco de questões</h1>
      <p class="auth-description">Responda questões publicadas. Sua tentativa será registrada no seu histórico.</p>
        <div class="study-filters" aria-label="Filtros de questões">
          <label>Disciplina
            <select v-model="selectedSubjectId" @change="selectedTopicId = ''">
              <option value="">Todas as disciplinas</option>
              <option v-for="subject in catalogData?.subjects ?? []" :key="subject.id" :value="subject.id">{{ subject.name }}</option>
            </select>
          </label>
          <label>Dificuldade
            <select v-model="selectedDifficulty" aria-describedby="difficulty-help">
              <option value="">Todas as dificuldades</option>
              <option value="easy">Fácil</option>
              <option value="medium">Média</option>
              <option value="hard">Difícil</option>
            </select>
          </label>
          <label>Assunto
            <select v-model="selectedTopicId" :disabled="!selectedSubjectId || availableTopics.length === 0">
              <option value="">Todos os assuntos</option>
              <option v-for="topic in availableTopics" :key="topic.id" :value="topic.id">{{ topic.name }}</option>
            </select>
          </label>
          <button v-if="selectedSubjectId || selectedTopicId || selectedDifficulty" class="study-secondary-button" @click="selectedSubjectId = ''; selectedTopicId = ''; selectedDifficulty = ''">Limpar filtros</button>
          <p id="difficulty-help" class="study-muted">O filtro de dificuldade inclui apenas questões já classificadas após revisão. Para praticar também as que aguardam classificação, mantenha “Todas as dificuldades”.</p>
          <p v-if="catalogError" class="study-muted">Os filtros não puderam ser carregados.</p>
        </div>
      <p v-if="pending" class="study-state">Carregando questões…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar as questões.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <div v-else-if="!currentQuestion" class="study-empty">
        <template v-if="selectedDifficulty">
          <h2>Nenhuma questão revisada nesta dificuldade.</h2>
          <p>Não encontramos questões com esta dificuldade revisada para os filtros escolhidos. Outras questões podem estar disponíveis sem classificação de dificuldade.</p>
          <button class="study-secondary-button" @click="selectedDifficulty = ''">Ver todas as dificuldades</button>
        </template>
        <template v-else>
          <h2>Nenhuma questão encontrada.</h2>
          <p>Não há questões publicadas para os filtros escolhidos. Tente outra disciplina ou limpe os filtros para continuar praticando.</p>
        </template>
        <NuxtLink class="study-link" to="/app/concursos">Explorar concursos →</NuxtLink>
      </div>
      <template v-else>
        <div class="study-progress-line">
          <span>Questão {{ currentIndex + 1 }} de {{ totalQuestions }}</span>
          <span>{{ Math.round(((currentIndex + 1) / (totalQuestions || 1)) * 100) }}%</span>
        </div>
        <article class="study-question-card">
          <p v-if="currentQuestion.source_label || currentQuestion.source_year || currentQuestion.source_url" class="study-muted">
            {{ currentQuestion.source_label || 'Fonte não identificada' }}<span v-if="currentQuestion.source_year"> · {{ currentQuestion.source_year }}</span><span v-if="currentQuestion.source_url"> · <a :href="currentQuestion.source_url" target="_blank" rel="noopener noreferrer">Consultar referência oficial</a></span>
          </p>
          <p class="study-muted">Dificuldade: {{ currentQuestion.difficulty === 'easy' ? 'Fácil' : currentQuestion.difficulty === 'hard' ? 'Difícil' : currentQuestion.difficulty === 'medium' ? 'Média' : 'Ainda não revisada' }}</p>
          <h2>{{ currentQuestion.statement }}</h2>
          <button class="study-secondary-button study-favorite-button" :disabled="favoritePending || Boolean(favoritesError)" @click="toggleFavorite">
            {{ favoritePending ? 'Salvando…' : isFavorite ? '★ Remover dos favoritos' : '☆ Salvar nos favoritos' }}
          </button>
          <p v-if="favoriteError" class="auth-error" role="alert">{{ favoriteError }}</p>
          <fieldset class="study-options" :disabled="Boolean(result) || submitPending">
            <legend>Selecione uma alternativa</legend>
            <label v-for="option in currentQuestion.options" :key="option.id" class="study-option" :class="{ 'is-selected': selectedOptionId === option.id, 'is-correct': result?.correctOptionId === option.id, 'is-wrong': result?.selectedOptionId === option.id && !result.isCorrect }">
              <input v-model="selectedOptionId" type="radio" :value="option.id" :name="currentQuestion.id">
              <span class="study-option-label">{{ option.option_label }}</span>
              <span>{{ option.content }}</span>
            </label>
          </fieldset>
          <p v-if="submitError" class="auth-error" role="alert">{{ submitError }}</p>
          <p v-if="loadMoreError" class="auth-error" role="alert">{{ loadMoreError }}</p>
          <button v-if="!result" class="study-primary-button" :disabled="!selectedOptionId || submitPending" @click="submitAnswer">
            {{ submitPending ? 'Registrando resposta…' : 'Confirmar resposta' }}
          </button>
          <section v-else class="study-result" :class="result.isCorrect ? 'result-correct' : 'result-wrong'" aria-live="polite">
            <h3>{{ result.isCorrect ? 'Resposta correta!' : 'Não foi dessa vez.' }}</h3>
            <p v-if="result.explanation">{{ result.explanation }}</p>
            <p v-else class="study-muted">O gabarito foi conferido e sua tentativa foi salva. A explicação ainda não foi cadastrada.</p>
            <p v-if="result.wasDuplicate" class="study-muted">Esta resposta já havia sido registrada; nenhuma tentativa duplicada foi criada.</p>
            <button class="study-primary-button" :disabled="(currentIndex >= questions.length - 1 && !hasMoreQuestions) || loadingMore" @click="nextQuestion">
              {{ loadingMore ? 'Carregando questões…' : currentIndex >= questions.length - 1 && hasMoreQuestions ? 'Carregar próxima página' : currentIndex >= questions.length - 1 ? 'Fim do banco' : 'Próxima questão' }}
            </button>
          </section>
        </article>
      </template>
    </section>
  </main>
</template>

<style scoped>
.study-filters { display: flex; flex-wrap: wrap; align-items: end; gap: 14px; margin: 22px 0; padding: 16px; border: 1px solid var(--color-border, rgba(255,255,255,.12)); border-radius: 12px; }
.study-filters label { display: grid; gap: 7px; min-width: min(220px, 100%); color: var(--color-muted); font-size: 12px; }
.study-filters select { min-height: 42px; padding: 9px 12px; border: 1px solid var(--color-border, rgba(255,255,255,.16)); border-radius: 8px; color: var(--color-text); background: var(--color-surface, #172235); }
.study-filters select:disabled { opacity: .55; }
</style>
