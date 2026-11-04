<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Concursos | Me Aprovaê' })

interface Contest {
  id: string
  slug: string
  title: string
  organization: string | null
  exam_board: string | null
  published_at: string | null
  study_notices: Array<{ id: string; title: string; version: string; publication_date: string | null }>
}

const { data, pending, error, refresh } = await useFetch<{ contests: Contest[] }>('/api/study/contests')
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav><NuxtLink to="/app/questoes">Questões</NuxtLink><NuxtLink to="/app/historico">Meu histórico</NuxtLink></nav>
    </header>
    <section class="study-content">
      <p class="auth-eyebrow">SEU OBJETIVO</p>
      <h1>Concursos públicos</h1>
      <p class="auth-description">Escolha um concurso publicado para acompanhar seus editais e organizar a preparação.</p>
      <p v-if="pending" class="study-state">Carregando concursos…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar o catálogo. Verifique sua conexão e tente novamente.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <div v-else-if="!data?.contests.length" class="study-empty">
        <h2>O catálogo ainda está sendo preparado.</h2>
        <p>Não há concursos publicados no banco neste momento. Assim que o conteúdo editorial for cadastrado e publicado, ele aparecerá aqui.</p>
      </div>
      <div v-else class="study-grid">
        <article v-for="contest in data.contests" :key="contest.id" class="study-card">
          <p class="auth-eyebrow">{{ contest.organization || 'CONCURSO PÚBLICO' }}</p>
          <h2>{{ contest.title }}</h2>
          <p v-if="contest.exam_board" class="study-muted">Banca: {{ contest.exam_board }}</p>
          <p class="study-muted">{{ contest.study_notices.length }} edital(is) publicado(s)</p>
          <NuxtLink class="study-link" :to="`/app/concursos/${contest.slug}`">Ver concurso e editais →</NuxtLink>
        </article>
      </div>
    </section>
  </main>
</template>
