<script setup lang="ts">
import authMiddleware from '~/middleware/auth'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Resolver questões | Me Aprovaê' })

interface QuestionOption { id: string; option_label: string; content: string; position: number }
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

const route = useRoute()
const query = computed(() => ({
  ...(route.query.contestId ? { contestId: String(route.query.contestId) } : {}),
  ...(route.query.questionId ? { questionId: String(route.query.questionId) } : {}),
}))
const { data, pending, error, refresh } = await useFetch<{ questions: Question[] }>('/api/study/questions', { query })
const { data: favoritesData, error: favoritesError, refresh: refreshFavorites } = await useFetch<{ favorites: Array<{ question_id: string }> }>('/api/study/favorites')
const currentIndex = ref(0)
const selectedOptionId = ref('')
const result = ref<AttemptResult | null>(null)
const submitPending = ref(false)
const submitError = ref('')
const idempotencyKey = ref('')
const currentQuestion = computed(() => data.value?.questions[currentIndex.value] ?? null)
const isFavorite = computed(() => Boolean(currentQuestion.value && favoritesData.value?.favorites.some((favorite) => favorite.question_id === currentQuestion.value?.id)))
const favoritePending = ref(false)
const favoriteError = ref('')

async function toggleFavorite() {
  if (!currentQuestion.value || favoritePending.value) return
  favoritePending.value = true
  favoriteError.value = ''
  try {
    await $fetch(`/api/study/questions/${currentQuestion.value.id}/favorite`, { method: isFavorite.value ? 'DELETE' : 'POST' })
    await refreshFavorites()
  } catch {
    favoriteError.value = 'Não foi possível atualizar seus favoritos. Verifique se a migração de favoritos foi aplicada.'
  } finally {
    favoritePending.value = false
  }
}

async function submitAnswer() {
  if (!currentQuestion.value || !selectedOptionId.value || submitPending.value || result.value) return
  submitPending.value = true
  submitError.value = ''
  if (!idempotencyKey.value) idempotencyKey.value = crypto.randomUUID()
  try {
    const response = await $fetch<{ result: AttemptResult }>('/api/study/attempts', {
      method: 'POST',
      body: {
        questionId: currentQuestion.value.id,
        optionId: selectedOptionId.value,
        idempotencyKey: idempotencyKey.value,
      },
    })
    result.value = response.result
  } catch {
    submitError.value = 'Não foi possível registrar sua resposta. Sua seleção foi mantida; tente novamente.'
  } finally {
    submitPending.value = false
  }
}

function nextQuestion() {
  if (!data.value || currentIndex.value >= data.value.questions.length - 1) return
  currentIndex.value += 1
  selectedOptionId.value = ''
  result.value = null
  submitError.value = ''
  idempotencyKey.value = ''
}
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav><NuxtLink to="/app/concursos">Concursos</NuxtLink><NuxtLink to="/app/favoritas">Favoritas</NuxtLink><NuxtLink to="/app/erros">Revisar erros</NuxtLink><NuxtLink to="/app/historico">Meu histórico</NuxtLink></nav>
    </header>
    <section class="study-content">
      <p class="auth-eyebrow">PRÁTICA</p>
      <h1>Banco de questões</h1>
      <p class="auth-description">Responda questões publicadas. Sua tentativa será registrada no seu histórico.</p>
      <p v-if="pending" class="study-state">Carregando questões…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar as questões.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <div v-else-if="!currentQuestion" class="study-empty">
        <h2>Nenhuma questão disponível ainda.</h2>
        <p>O banco ainda não possui questões publicadas para este filtro. Questões só aparecerão após cadastro editorial e publicação no banco.</p>
        <NuxtLink class="study-link" to="/app/concursos">Explorar concursos →</NuxtLink>
      </div>
      <template v-else>
        <div class="study-progress-line">
          <span>Questão {{ currentIndex + 1 }} de {{ data?.questions.length }}</span>
          <span>{{ Math.round(((currentIndex + 1) / (data?.questions.length || 1)) * 100) }}%</span>
        </div>
        <article class="study-question-card">
          <p v-if="currentQuestion.source_label || currentQuestion.source_year" class="study-muted">
            {{ currentQuestion.source_label || 'Fonte não identificada' }}<span v-if="currentQuestion.source_year"> · {{ currentQuestion.source_year }}</span>
          </p>
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
          <button v-if="!result" class="study-primary-button" :disabled="!selectedOptionId || submitPending" @click="submitAnswer">
            {{ submitPending ? 'Registrando resposta…' : 'Confirmar resposta' }}
          </button>
          <section v-else class="study-result" :class="result.isCorrect ? 'result-correct' : 'result-wrong'" aria-live="polite">
            <h3>{{ result.isCorrect ? 'Resposta correta!' : 'Não foi dessa vez.' }}</h3>
            <p v-if="result.explanation">{{ result.explanation }}</p>
            <p v-else class="study-muted">O gabarito foi conferido e sua tentativa foi salva. A explicação ainda não foi cadastrada.</p>
            <p v-if="result.wasDuplicate" class="study-muted">Esta resposta já havia sido registrada; nenhuma tentativa duplicada foi criada.</p>
            <button class="study-primary-button" :disabled="currentIndex >= (data?.questions.length || 0) - 1" @click="nextQuestion">
              {{ currentIndex >= (data?.questions.length || 0) - 1 ? 'Fim das questões carregadas' : 'Próxima questão' }}
            </button>
          </section>
        </article>
      </template>
    </section>
  </main>
</template>
