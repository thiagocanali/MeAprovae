<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import type { ExamSession } from '~~/shared/domain/questions/exam-session'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Simulados | Me Aprovaê' })
interface Summary { id: string; question_count: number; answered_count: number; correct_count: number; status: string; started_at: string; score: number }
const { data: contests, error: contestsError } = await useFetch<{ contests: Array<{ id: string; title: string }> }>('/api/study/contests')
const { data: history, error: historyError, refresh } = await useFetch<{ sessions: Summary[] }>('/api/study/exams')
const route = useRoute()
const selectedContestId = ref(typeof route.query.contestId === 'string' ? route.query.contestId : '')
const questionCount = ref(10)
const requestId = ref('')
const pending = ref(false)
const errorMessage = ref('')
watch([selectedContestId, questionCount], () => { requestId.value = ''; errorMessage.value = '' })
const active = computed(() => history.value?.sessions.find(session => session.status === 'active'))
async function startExam() {
  if (pending.value) return
  pending.value = true; errorMessage.value = ''
  if (!requestId.value) requestId.value = crypto.randomUUID()
  try {
    const response = await $fetch<{ session: ExamSession }>('/api/study/exams', { method: 'POST', body: {
      requestId: requestId.value, contestId: selectedContestId.value || null, questionCount: questionCount.value,
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
        <label for="exam-count">Quantidade de questões</label><select id="exam-count" v-model.number="questionCount" :disabled="pending"><option :value="10">10 questões · 60 minutos</option><option :value="20">20 questões · 120 minutos</option></select>
        <p class="study-muted">O prazo começa ao iniciar e continua contando ao sair da página. O relógio do servidor determina quando o simulado expira.</p>
        <button type="submit" class="study-primary-button" :disabled="pending">{{ pending ? 'Preparando…' : 'Começar simulado' }}</button>
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
