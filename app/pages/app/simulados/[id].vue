<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { remainingExamSeconds, type ExamSession } from '~~/shared/domain/questions/exam-session'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Meu simulado | Me Aprovaê' })
const route = useRoute()
const endpoint = `/api/study/exams/${String(route.params.id)}`
const { data, error, pending, refresh } = await useFetch<{ session: ExamSession }>(endpoint)
const session = computed(() => data.value?.session)
const currentIndex = ref(Math.max(0, session.value?.questions.findIndex(item => !item.result) ?? 0))
const unansweredCount = computed(() => Math.max(0, (session.value?.questionCount ?? 0) - (session.value?.answeredCount ?? 0)))
const current = computed(() => session.value?.questions[currentIndex.value])
const selectedOptionId = ref(current.value?.result?.selectedOptionId ?? '')
const saving = ref(false)
const errorMessage = ref('')
const synchronizing = ref(false)
const confirmFinish = ref(false)
const remainingSeconds = ref(session.value ? remainingExamSeconds(session.value.expiresAt, session.value.serverNow) : 0)
const timeLabel = computed(() => `${String(Math.floor(remainingSeconds.value / 60)).padStart(2, '0')}:${String(remainingSeconds.value % 60).padStart(2, '0')}`)
let interval: ReturnType<typeof setInterval> | undefined
let anchor = 0
let expirationRequested = false
function stopTimer() { if (interval !== undefined) { clearInterval(interval); interval = undefined } }
function synchronizeTimer() {
  stopTimer()
  if (!session.value) return
  remainingSeconds.value = remainingExamSeconds(session.value.expiresAt, session.value.serverNow)
  if (!import.meta.client || session.value.status !== 'active') return
  anchor = performance.now()
  expirationRequested = false
  interval = setInterval(() => {
    if (!session.value) return
    remainingSeconds.value = remainingExamSeconds(session.value.expiresAt, session.value.serverNow, performance.now() - anchor)
    if (remainingSeconds.value === 0 && !expirationRequested) {
      expirationRequested = true; stopTimer(); void synchronize()
    }
  }, 1000)
}
async function synchronize() {
  if (synchronizing.value) return
  synchronizing.value = true
  try {
    await refresh()
    if (!error.value) synchronizeTimer()
  } finally { synchronizing.value = false }
}
watch(data, synchronizeTimer)
watch(current, item => { selectedOptionId.value = item?.result?.selectedOptionId ?? '' })
watch(unansweredCount, () => { confirmFinish.value = false })
onMounted(synchronizeTimer)
onBeforeUnmount(stopTimer)
async function submitAnswer() {
  if (!current.value || !selectedOptionId.value || current.value.result || saving.value || remainingSeconds.value <= 0) return
  saving.value = true; errorMessage.value = ''
  try {
    data.value = await $fetch<{ session: ExamSession }>(`${endpoint}/answers`, { method: 'POST', body: {
      position: current.value.position, optionId: selectedOptionId.value,
    } })
    confirmFinish.value = false
  } catch (cause: unknown) {
    const failure = cause as { data?: { statusMessage?: string } }
    errorMessage.value = failure.data?.statusMessage ?? 'Não foi possível salvar sua resposta. A seleção foi mantida; tente novamente.'
  } finally { saving.value = false }
}
async function finishExam() {
  if (saving.value) return
  if (unansweredCount.value > 0 && !confirmFinish.value) {
    confirmFinish.value = true
    return
  }
  saving.value = true; errorMessage.value = ''
  try { data.value = await $fetch<{ session: ExamSession }>(`${endpoint}/finish`, { method: 'POST' }) }
  catch { errorMessage.value = 'Não foi possível finalizar. Tente novamente; suas respostas confirmadas estão salvas.' }
  finally { saving.value = false }
}
function changeQuestion(index: number) {
  if (saving.value) return
  currentIndex.value = index; errorMessage.value = ''; confirmFinish.value = false
}
const reviewed = computed(() => session.value?.questions.map(item => ({ ...item,
  selected: item.question.options.find(option => option.id === item.result?.selectedOptionId),
  correct: item.question.options.find(option => option.id === item.result?.correctOptionId),
})) ?? [])
</script>

<template>
  <main class="study-page">
    <StudentNavigation />
    <section class="study-content">
      <p v-if="pending && !session" role="status" aria-live="polite">Carregando simulado…</p>
      <div v-if="error" class="study-error" role="alert">Não foi possível carregar este simulado. Ele deve pertencer à sua conta. <button type="button" class="study-secondary-button" :disabled="synchronizing" @click="synchronize()">{{ synchronizing ? 'Sincronizando…' : 'Tentar novamente' }}</button></div>
      <template v-if="session">
        <template v-if="session.status === 'active' && current">
          <div class="study-exam-top"><h1>Questão {{ currentIndex + 1 }} de {{ session.questionCount }}</h1><span class="study-exam-timer" aria-label="Tempo restante">{{ timeLabel }}</span></div>
          <p class="study-muted">Modo estudo · {{ session.answeredCount }} respostas salvas. O prazo continua contando ao sair.</p>
          <progress class="study-progress" :value="session.answeredCount" :max="Math.max(1, session.questionCount)" :aria-label="`${session.answeredCount} de ${session.questionCount} questões respondidas`">{{ session.answeredCount }} de {{ session.questionCount }}</progress>
          <p v-if="remainingSeconds === 0" role="status">O tempo terminou. <button type="button" class="study-secondary-button" :disabled="synchronizing" @click="synchronize()">{{ synchronizing ? 'Sincronizando…' : 'Sincronizar resultado' }}</button></p>
          <nav class="exam-question-nav" aria-label="Questões do simulado"><button v-for="(item, index) in session.questions" :key="item.position" :aria-current="index === currentIndex ? 'step' : undefined" :aria-label="`Questão ${item.position}${item.result ? ', respondida' : ', não respondida'}`" :disabled="saving" @click="changeQuestion(index)">{{ item.position }}{{ item.result ? ' ✓' : '' }}</button></nav>
          <article class="study-question-card">
            <p v-if="current.question.source_label" class="study-muted">{{ current.question.source_label }}</p>
            <h2>{{ current.question.statement }}</h2>
            <fieldset class="study-options" :disabled="saving || Boolean(current.result) || remainingSeconds === 0"><legend>Selecione uma alternativa</legend>
              <label v-for="option in current.question.options" :key="option.id" class="study-option" :class="{ 'is-selected': selectedOptionId === option.id, 'is-correct': current.result?.correctOptionId === option.id, 'is-wrong': current.result?.selectedOptionId === option.id && !current.result.isCorrect }">
                <input v-model="selectedOptionId" type="radio" :name="current.question.id" :value="option.id"><span class="study-option-label">{{ option.option_label }}</span><span>{{ option.content }}</span>
              </label>
            </fieldset>
            <button v-if="!current.result" class="study-primary-button" :disabled="saving || !selectedOptionId || remainingSeconds === 0" @click="submitAnswer">{{ saving ? 'Salvando…' : 'Confirmar resposta' }}</button>
            <section v-else class="study-result" aria-live="polite"><h3>{{ current.result.isCorrect ? 'Resposta correta!' : 'Resposta incorreta.' }}</h3><p>{{ current.result.explanation || 'Esta questão ainda não possui explicação cadastrada.' }}</p><p>Resposta salva na sua conta.</p></section>
            <div class="study-actions"><button v-if="currentIndex > 0" class="study-secondary-button" :disabled="saving" @click="changeQuestion(currentIndex - 1)">Anterior</button><button v-if="currentIndex < session.questionCount - 1" class="study-secondary-button" :disabled="saving" @click="changeQuestion(currentIndex + 1)">Próxima questão</button></div>
          </article>
          <div class="study-card"><p>{{ unansweredCount }} questão(ões) sem resposta. Ao finalizar, elas permanecerão sem acerto na nota.</p><p v-if="confirmFinish" class="study-error" role="alert">Confirma a finalização? As {{ unansweredCount }} questões sem resposta serão contabilizadas na nota e você não poderá responder depois.</p><div class="study-actions"><button v-if="confirmFinish" type="button" class="study-secondary-button" :disabled="saving" @click="confirmFinish = false">Continuar respondendo</button><button type="button" class="study-primary-button" :disabled="saving" @click="finishExam">{{ saving ? 'Finalizando…' : confirmFinish ? 'Confirmar finalização' : unansweredCount ? `Finalizar com ${unansweredCount} sem resposta` : 'Finalizar simulado' }}</button></div></div>
        </template>
        <template v-else-if="session.status !== 'active'">
          <p class="auth-eyebrow">RESULTADO SALVO</p><h1>{{ session.status === 'expired' ? 'Tempo do simulado encerrado' : 'Simulado concluído' }}</h1>
          <div class="study-stats"><article class="study-card"><span>Nota</span><strong>{{ session.score }}%</strong></article><article class="study-card"><span>Acertos</span><strong>{{ session.correctCount }} / {{ session.questionCount }}</strong></article><article class="study-card"><span>Sem resposta</span><strong>{{ session.questionCount - session.answeredCount }}</strong></article></div>
          <p class="study-muted">A nota considera todas as questões, inclusive as não respondidas. Você pode consultar este resultado novamente em Meus simulados.</p>
          <h2>Revisão das questões</h2>
          <article v-for="item in reviewed" :key="item.position" class="study-card"><h3>Questão {{ item.position }} · {{ !item.result ? 'Não respondida' : item.result.isCorrect ? 'Acerto' : 'Erro' }}</h3><p>{{ item.question.statement }}</p><p v-if="item.selected"><strong>Sua resposta:</strong> {{ item.selected.option_label }} — {{ item.selected.content }}</p><p v-if="item.correct"><strong>Resposta correta:</strong> {{ item.correct.option_label }} — {{ item.correct.content }}</p><p v-if="item.result?.explanation">{{ item.result.explanation }}</p></article>
          <NuxtLink to="/app/provas" class="study-link">Voltar aos meus simulados →</NuxtLink>
        </template>
      </template>
      <p v-if="errorMessage" class="study-error" role="alert">{{ errorMessage }} <button type="button" class="study-secondary-button" :disabled="saving || synchronizing" @click="synchronize()">{{ synchronizing ? 'Sincronizando…' : 'Sincronizar respostas salvas' }}</button></p>
    </section>
  </main>
</template>

<style scoped>
.exam-question-nav { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
.exam-question-nav button { min-width: 44px; min-height: 44px; padding: 8px; }
.exam-question-nav button[aria-current] { outline: 3px solid #246b67; font-weight: 700; }
</style>
