<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import type { ExamSession } from '~~/shared/domain/questions/exam-session'
import { isExamQuestionCount, validExamFilters, type ExamAvailability } from '~~/shared/domain/questions/exam-config'
import { isCurrentExamAvailability, parseExamQueryCount, parseExamQueryId, topicBelongsToSubject } from '~~/shared/domain/questions/exam-filter-ui'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Simulados | Me Aprovaê' })
interface Summary { id: string; question_count: number; answered_count: number; correct_count: number; status: string; started_at: string; score: number }
const { data: contests, error: contestsError } = await useFetch<{ contests: Array<{ id: string; title: string }> }>('/api/study/contests')
const { data: history, error: historyError, refresh } = await useFetch<{ sessions: Summary[] }>('/api/study/exams')
const route = useRoute()
const router = useRouter()
const queryId = parseExamQueryId
const selectedContestId = ref(queryId(route.query.contestId))
const selectedSubjectId = ref(queryId(route.query.subjectId))
const selectedTopicId = ref(queryId(route.query.topicId))
const questionCount = ref(parseExamQueryCount(route.query.questionCount))
const { data: catalog, error: catalogError } = await useFetch<{ subjects: Array<{ id: string; name: string }>; topics: Array<{ id: string; subject_id: string; name: string }> }>('/api/study/catalog')
const topics = computed(() => catalog.value?.topics.filter(topic => topic.subject_id === selectedSubjectId.value) ?? [])
const filters = computed(() => ({ contestId: selectedContestId.value || null, subjectId: selectedSubjectId.value || null, topicId: selectedTopicId.value || null }))
const availabilityQuery = computed(() => Object.fromEntries(Object.entries(filters.value).filter(([, value]) => value !== null)))
const { data: availability, status: availabilityStatus, error: availabilityError, refresh: refreshAvailability } = await useFetch<ExamAvailability & { filters: typeof filters.value }>('/api/study/exams/availability', { query: availabilityQuery })
const currentAvailability = computed(() => availabilityStatus.value === 'success' && isCurrentExamAvailability(availability.value, filters.value)
  ? availability.value : null)
const topicMatchesSubject = computed(() => !catalog.value || topicBelongsToSubject(filters.value.subjectId, filters.value.topicId, catalog.value.topics))
const validConfig = computed(() => validExamFilters(filters.value) && topicMatchesSubject.value && isExamQuestionCount(questionCount.value))
const canStart = computed(() => validConfig.value && currentAvailability.value && questionCount.value <= currentAvailability.value.maxQuestions)
const requestId = ref('')
const pending = ref(false)
const errorMessage = ref('')
watch([selectedContestId, selectedSubjectId, selectedTopicId, questionCount], () => {
  requestId.value = ''; errorMessage.value = ''
  const query = { ...route.query, contestId: selectedContestId.value || undefined, subjectId: selectedSubjectId.value || undefined,
    topicId: selectedTopicId.value || undefined, questionCount: String(questionCount.value) }
  if (JSON.stringify(query) !== JSON.stringify(route.query)) void router.replace({ query })
})
watch(() => route.query, query => {
  selectedContestId.value = queryId(query.contestId); selectedSubjectId.value = queryId(query.subjectId)
  selectedTopicId.value = queryId(query.topicId); questionCount.value = parseExamQueryCount(query.questionCount)
})
const active = computed(() => history.value?.sessions.find(session => session.status === 'active'))
async function startExam() {
  if (pending.value || !canStart.value) return
  pending.value = true; errorMessage.value = ''
  if (!requestId.value) requestId.value = crypto.randomUUID()
  try {
    const response = await $fetch<{ session: ExamSession }>('/api/study/exams', { method: 'POST', body: {
      requestId: requestId.value, ...filters.value, questionCount: questionCount.value,
    } })
    await navigateTo(`/app/simulados/${response.session.id}`)
  } catch (cause: unknown) {
    const failure = cause as { data?: { statusMessage?: string } }
    errorMessage.value = failure.data?.statusMessage ?? 'Não foi possível iniciar. Tente novamente sem alterar a configuração.'
    await refresh()
  } finally { pending.value = false }
}
</script>

<template>
  <main class="study-page">
    <header class="study-header"><NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink><nav><NuxtLink to="/app/questoes">Questões</NuxtLink><NuxtLink to="/app/desempenho">Desempenho</NuxtLink></nav></header>
    <section class="study-content">
      <p class="auth-eyebrow">SIMULADOS</p><h1>Pratique e acompanhe sua evolução</h1>
      <p class="auth-description">Modo estudo: correção após cada resposta. Sua sessão fica salva para retomar em outro momento ou dispositivo, dentro do prazo original.</p>
      <div v-if="active" class="study-card"><h2>Você tem um simulado em andamento</h2><p>{{ active.answered_count }} de {{ active.question_count }} questões respondidas.</p><NuxtLink class="study-link" :to="`/app/simulados/${active.id}`">Retomar simulado →</NuxtLink></div>
      <form v-else class="study-form" @submit.prevent="startExam">
        <label for="exam-contest">Concurso</label><select id="exam-contest" v-model="selectedContestId" :disabled="pending"><option value="">Todos os concursos</option><option v-for="contest in contests?.contests" :key="contest.id" :value="contest.id">{{ contest.title }}</option></select>
        <p v-if="contestsError" role="alert">Não foi possível carregar os concursos. Tente novamente mais tarde ou use todas as questões.</p>
        <label for="exam-subject">Matéria</label><select id="exam-subject" v-model="selectedSubjectId" :disabled="pending || !!catalogError" @change="selectedTopicId = ''"><option value="">Todas as matérias</option><option v-for="subject in catalog?.subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option></select>
        <label for="exam-topic">Assunto</label><select id="exam-topic" v-model="selectedTopicId" :disabled="pending || !selectedSubjectId || !!catalogError"><option value="">Todos os assuntos</option><option v-for="topic in topics" :key="topic.id" :value="topic.id">{{ topic.name }}</option></select>
        <p v-if="catalogError" role="alert">Não foi possível carregar matérias e assuntos. Recarregue a página para tentar novamente.</p>
        <p v-if="availabilityStatus === 'pending'" role="status" aria-live="polite">Consultando questões disponíveis…</p>
        <p v-else-if="availabilityError" role="alert">Não foi possível consultar o acervo. Revise os filtros ou tente novamente. <button type="button" :disabled="pending" @click="refreshAvailability()">Tentar novamente</button> <button type="button" :disabled="pending" @click="selectedContestId = ''; selectedSubjectId = ''; selectedTopicId = ''">Limpar filtros</button></p>
        <p v-else-if="currentAvailability" role="status">{{ currentAvailability.available }} questões disponíveis com estes filtros. Você pode selecionar até {{ currentAvailability.maxQuestions }}.</p>
        <p v-if="currentAvailability?.available === 0" class="study-empty">Nenhuma questão publicada nesta combinação. Escolha outro assunto, matéria ou concurso.</p>
        <label for="exam-count">Quantidade de questões</label><input id="exam-count" v-model.number="questionCount" type="number" min="1" max="20" step="1" :disabled="pending" aria-describedby="exam-duration">
        <p v-if="!topicMatchesSubject" role="alert">O assunto não pertence à matéria selecionada. Escolha outro assunto.</p>
        <p v-if="!validConfig" role="alert">Revise os filtros e escolha uma quantidade inteira de 1 a 20 questões.</p>
        <p v-else-if="currentAvailability && questionCount > currentAvailability.maxQuestions && currentAvailability.maxQuestions > 0" role="alert">A quantidade escolhida supera o acervo deste filtro. <button type="button" :disabled="pending" @click="questionCount = currentAvailability!.maxQuestions">Usar {{ currentAvailability.maxQuestions }} questões</button></p>
        <p id="exam-duration" class="study-muted">{{ isExamQuestionCount(questionCount) ? `${questionCount * 6} minutos · 6 minutos por questão.` : 'Escolha a quantidade para calcular o prazo.' }}</p>
        <p class="study-muted">O prazo começa ao iniciar e continua contando ao sair da página. O relógio do servidor determina quando o simulado expira.</p>
        <button type="submit" class="study-primary-button" :disabled="pending || !canStart" :aria-busy="pending">{{ pending ? 'Preparando…' : 'Começar simulado' }}</button>
      </form>
      <p v-if="errorMessage" class="study-error" role="alert">{{ errorMessage }}</p>
      <section class="study-section"><h2>Meus últimos 50 simulados</h2>
        <p v-if="historyError" role="alert">Não foi possível carregar o histórico. <button @click="refresh()">Tentar novamente</button></p>
        <p v-else-if="!history?.sessions.length" class="study-empty">Seu primeiro simulado aparecerá aqui. Nenhum resultado será criado antes da sua participação.</p>
        <ol v-else class="study-history"><li v-for="session in history.sessions" :key="session.id" class="study-card">
          <h3>{{ session.status === 'active' ? 'Em andamento' : session.status === 'expired' ? 'Tempo encerrado' : 'Concluído' }}</h3>
          <p>{{ new Date(session.started_at).toLocaleString('pt-BR') }} · {{ session.answered_count }}/{{ session.question_count }} respondidas</p>
          <p v-if="session.status !== 'active'">{{ session.score }}% · {{ session.correct_count }} acertos</p>
          <NuxtLink class="study-link" :to="`/app/simulados/${session.id}`">{{ session.status === 'active' ? 'Retomar' : 'Ver resultado e revisão' }} →</NuxtLink>
        </li></ol>
      </section>
    </section>
  </main>
</template>
