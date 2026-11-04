<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Meu histórico | Me Aprovaê' })

interface Attempt {
  id: string
  question_id: string
  selected_option_id: string
  is_correct: boolean
  submitted_at: string
  study_questions: { statement: string } | null
}
const { data, pending, error, refresh } = await useFetch<{ attempts: Attempt[] }>('/api/study/attempts')
const total = computed(() => data.value?.attempts.length ?? 0)
const correct = computed(() => data.value?.attempts.filter((attempt) => attempt.is_correct).length ?? 0)
const accuracy = computed(() => total.value ? Math.round((correct.value / total.value) * 100) : 0)
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav><NuxtLink to="/app/concursos">Concursos</NuxtLink><NuxtLink to="/app/questoes">Questões</NuxtLink></nav>
    </header>
    <section class="study-content">
      <p class="auth-eyebrow">SUA EVOLUÇÃO</p>
      <h1>Histórico de questões</h1>
      <p class="auth-description">Tentativas registradas na sua conta, sem misturar dados de outros estudantes.</p>
      <p v-if="pending" class="study-state">Carregando histórico…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar seu histórico.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <template v-else>
        <div class="study-stats">
          <article class="study-card"><span class="study-muted">Questões respondidas</span><strong>{{ total }}</strong></article>
          <article class="study-card"><span class="study-muted">Acertos</span><strong>{{ correct }}</strong></article>
          <article class="study-card"><span class="study-muted">Taxa de acerto</span><strong>{{ accuracy }}%</strong></article>
        </div>
        <div v-if="!total" class="study-empty"><h2>Seu histórico começa na primeira resposta.</h2><NuxtLink class="study-link" to="/app/questoes">Resolver questões →</NuxtLink></div>
        <ol v-else class="study-history">
          <li v-for="attempt in data?.attempts" :key="attempt.id" class="study-history-item">
            <span :class="attempt.is_correct ? 'study-dot-correct' : 'study-dot-wrong'"></span>
            <div><strong>{{ attempt.is_correct ? 'Acertou' : 'Errou' }}</strong><p class="study-muted">{{ attempt.study_questions?.statement || `Questão ${attempt.question_id.slice(0, 8)}` }} · {{ new Date(attempt.submitted_at).toLocaleString('pt-BR') }}</p></div>
          </li>
        </ol>
      </template>
    </section>
  </main>
</template>
