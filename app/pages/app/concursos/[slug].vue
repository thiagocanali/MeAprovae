<script setup lang="ts">
import authMiddleware from '~/middleware/auth'

definePageMeta({ middleware: authMiddleware })
const route = useRoute()
const slug = String(route.params.slug)
useSeoMeta({ title: `Concurso | Me Aprovaê` })

interface ContestDetail {
  id: string
  slug: string
  title: string
  organization: string | null
  exam_board: string | null
  study_notices: Array<{
    id: string
    title: string
    version: string
    publication_date: string | null
    study_notice_subjects: Array<{ position: number; study_subjects: { id: string; name: string } | null }>
  }>
}

const { data, pending, error, refresh } = await useFetch<{ contest: ContestDetail; isFollowed: boolean }>(`/api/study/contests/${slug}`)
const actionPending = ref(false)
const actionError = ref('')
const followed = ref(false)
watchEffect(() => { followed.value = Boolean(data.value?.isFollowed) })

async function toggleFollow() {
  if (!data.value?.contest || actionPending.value) return
  actionPending.value = true
  actionError.value = ''
  try {
    const method = followed.value ? 'DELETE' : 'POST'
    const response = await $fetch<{ followed: boolean }>(`/api/study/contests/${data.value.contest.id}/follow`, { method })
    followed.value = response.followed
  } catch {
    actionError.value = 'Não foi possível atualizar seus concursos acompanhados.'
  } finally {
    actionPending.value = false
  }
}
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav><NuxtLink to="/app/concursos">Concursos</NuxtLink><NuxtLink to="/app/questoes">Questões</NuxtLink></nav>
    </header>
    <section class="study-content">
      <NuxtLink class="study-back" to="/app/concursos">← Voltar aos concursos</NuxtLink>
      <p v-if="pending" class="study-state">Carregando concurso…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar este concurso.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <template v-else-if="data?.contest">
        <p class="auth-eyebrow">{{ data.contest.organization || 'CONCURSO PÚBLICO' }}</p>
        <h1>{{ data.contest.title }}</h1>
        <p class="auth-description">Banca: {{ data.contest.exam_board || 'Não informada' }}</p>
        <div class="study-actions">
          <button class="study-primary-button" :disabled="actionPending" @click="toggleFollow">
            {{ actionPending ? 'Salvando…' : followed ? 'Deixar de acompanhar' : 'Acompanhar concurso' }}
          </button>
          <NuxtLink class="study-secondary-button" to="/app/questoes">Resolver questões</NuxtLink>
        </div>
        <p v-if="actionError" class="auth-error" role="alert">{{ actionError }}</p>
        <section class="study-section">
          <h2>Editais publicados</h2>
          <article v-for="notice in data.contest.study_notices" :key="notice.id" class="study-card">
            <h3>{{ notice.title }}</h3>
            <p class="study-muted">Versão {{ notice.version }}<span v-if="notice.publication_date"> · Publicado em {{ new Date(notice.publication_date).toLocaleDateString('pt-BR') }}</span></p>
            <h4>Disciplinas</h4>
            <ul v-if="notice.study_notice_subjects.length">
              <li v-for="item in notice.study_notice_subjects" :key="item.study_subjects?.id">{{ item.study_subjects?.name }}</li>
            </ul>
            <p v-else class="study-muted">Conteúdo programático ainda não cadastrado.</p>
            <NuxtLink class="study-link" :to="{ path: '/app/questoes', query: { contestId: data.contest.id } }">Praticar questões deste concurso →</NuxtLink>
          </article>
          <p v-if="!data.contest.study_notices.length" class="study-empty">Nenhum edital publicado para este concurso.</p>
        </section>
      </template>
    </section>
  </main>
</template>
