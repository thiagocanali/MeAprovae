<script setup lang="ts">
import authMiddleware from '~/middleware/auth'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Minha área | Me Aprovaê' })

const { data } = await useFetch<{ user: { id: string; email?: string } | null }>('/api/auth/me')
interface DashboardData {
  questionsAnswered: number
  correctAnswers: number
  accuracy: number
  activeGoal: { contestTitle: string; noticeTitle: string | null; positionTitle: string | null } | null
  recentAttempts: Array<{ id: string; questionId: string; isCorrect: boolean; submittedAt: string }>
}
interface SubjectPerformance {
  subjectId: string
  subjectName: string
  attempts: number
  correctAnswers: number
  accuracy: number
}
const { data: dashboardData, error: dashboardError, pending: dashboardPending, refresh: refreshDashboard } = await useFetch<{ dashboard: DashboardData; performanceBySubject: SubjectPerformance[] }>('/api/study/dashboard')
const pending = ref(false)
const errorMessage = ref('')

async function logout() {
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await navigateTo('/login')
  } catch {
    errorMessage.value = 'Não foi possível encerrar a sessão. Tente novamente.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="student-home">
    <header class="student-header">
      <NuxtLink class="auth-brand" to="/">Me Aprovaê</NuxtLink>
      <nav class="student-nav" aria-label="Navegação do estudante">
        <NuxtLink to="/app">Início</NuxtLink>
        <NuxtLink to="/app/concursos">Concursos</NuxtLink>
        <NuxtLink to="/app/questoes">Questões</NuxtLink>
        <NuxtLink to="/app/desempenho">Desempenho</NuxtLink>
      </nav>
      <button class="logout-button" :disabled="pending" @click="logout">{{ pending ? 'Saindo…' : 'Sair' }}</button>
    </header>
    <section class="student-welcome">
      <p class="auth-eyebrow">ÁREA DO ESTUDANTE</p>
      <h1>Seu próximo passo começa aqui.</h1>
      <p v-if="data?.user?.email" class="auth-description">Sessão autenticada: {{ data.user.email }}</p>
      <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
      <div v-if="dashboardPending" class="study-state" role="status" aria-live="polite">
        Carregando seus indicadores...
      </div>
      <div v-else-if="dashboardData?.dashboard" class="study-stats">
        <article class="study-card"><span class="study-muted">Questões respondidas</span><strong>{{ dashboardData.dashboard.questionsAnswered }}</strong></article>
        <article class="study-card"><span class="study-muted">Acertos</span><strong>{{ dashboardData.dashboard.correctAnswers }}</strong></article>
        <article class="study-card"><span class="study-muted">Taxa de acerto</span><strong>{{ dashboardData.dashboard.accuracy }}%</strong></article>
      </div>
      <div v-if="dashboardError && !dashboardPending" class="study-state study-error" role="alert">
        Não foi possível carregar seus indicadores. <button class="study-secondary-button" @click="refreshDashboard()">Tentar novamente</button>
      </div>
      <div v-if="dashboardData?.dashboard.activeGoal" class="study-card">
        <p class="auth-eyebrow">OBJETIVO ATIVO</p>
        <h2>{{ dashboardData.dashboard.activeGoal.contestTitle }}</h2>
        <p class="study-muted">{{ dashboardData.dashboard.activeGoal.positionTitle || 'Cargo não selecionado' }}<span v-if="dashboardData.dashboard.activeGoal.noticeTitle"> · {{ dashboardData.dashboard.activeGoal.noticeTitle }}</span></p>
        <NuxtLink class="study-link" to="/app/concursos">Ver concursos e editais →</NuxtLink>
      </div>
      <div v-else class="student-empty">
        <h2>Vamos organizar seus estudos.</h2>
        <p>Escolha um concurso como objetivo para acompanhar seu edital e orientar sua preparação. Nenhum indicador fictício será exibido aqui.</p>
        <NuxtLink class="study-link" to="/app/onboarding">Definir meu objetivo →</NuxtLink>
      </div>
      <section v-if="dashboardData?.performanceBySubject.length" class="study-section">
        <h2>Desempenho por disciplina</h2>
        <article v-for="subject in dashboardData.performanceBySubject" :key="subject.subjectId" class="study-card study-performance-row">
          <div><strong>{{ subject.subjectName }}</strong><p class="study-muted">{{ subject.correctAnswers }} acertos em {{ subject.attempts }} questões</p></div>
          <strong>{{ subject.accuracy }}%</strong>
        </article>
      </section>
      <section v-if="dashboardData?.dashboard.recentAttempts.length" class="study-section">
        <h2>Atividades recentes</h2>
        <ol class="study-history">
          <li v-for="attempt in dashboardData.dashboard.recentAttempts" :key="attempt.id" class="study-history-item">
            <span :class="attempt.isCorrect ? 'study-dot-correct' : 'study-dot-wrong'"></span>
            <div><strong>{{ attempt.isCorrect ? 'Resposta correta' : 'Resposta incorreta' }}</strong><p class="study-muted">{{ new Date(attempt.submittedAt).toLocaleString('pt-BR') }}</p></div>
          </li>
        </ol>
      </section>
    </section>
  </main>
</template>
