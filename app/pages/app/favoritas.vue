<script setup lang="ts">
import authMiddleware from '~/middleware/auth'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Questões favoritas | Me Aprovaê' })

interface Favorite {
  question_id: string
  created_at: string
  study_questions: { id: string; statement: string; source_label: string | null; source_year: number | null } | null
}
const { data, pending, error, refresh } = await useFetch<{ favorites: Favorite[] }>('/api/study/favorites')
const removingId = ref('')
const actionError = ref('')

async function removeFavorite(questionId: string) {
  if (removingId.value) return
  removingId.value = questionId
  actionError.value = ''
  try {
    await $fetch(`/api/study/questions/${questionId}/favorite`, { method: 'DELETE' })
    await refresh()
  } catch {
    actionError.value = 'Não foi possível remover a questão.'
  } finally {
    removingId.value = ''
  }
}
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav><NuxtLink to="/app/concursos">Concursos</NuxtLink><NuxtLink to="/app/questoes">Questões</NuxtLink><NuxtLink to="/app/historico">Histórico</NuxtLink></nav>
    </header>
    <section class="study-content">
      <p class="auth-eyebrow">SUA BIBLIOTECA</p>
      <h1>Questões favoritas</h1>
      <p class="auth-description">Questões salvas na sua conta para encontrar e revisar depois.</p>
      <p v-if="pending" class="study-state">Carregando favoritas…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar suas favoritas. Confirme se a migração de favoritos foi aplicada.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <div v-else-if="!data?.favorites.length" class="study-empty">
        <h2>Sua lista está vazia.</h2>
        <p>Ao resolver uma questão, toque em “Salvar nos favoritos” para guardá-la aqui.</p>
        <NuxtLink class="study-link" to="/app/questoes">Resolver questões →</NuxtLink>
      </div>
      <div v-else class="study-section">
        <p v-if="actionError" class="auth-error" role="alert">{{ actionError }}</p>
        <article v-for="favorite in data.favorites" :key="favorite.question_id" class="study-card">
          <p class="study-muted">{{ favorite.study_questions?.source_label || 'Fonte não informada' }}<span v-if="favorite.study_questions?.source_year"> · {{ favorite.study_questions.source_year }}</span></p>
          <h2>{{ favorite.study_questions?.statement || 'Questão indisponível' }}</h2>
          <button class="study-secondary-button" :disabled="removingId === favorite.question_id" @click="removeFavorite(favorite.question_id)">
            {{ removingId === favorite.question_id ? 'Removendo…' : 'Remover dos favoritos' }}
          </button>
        </article>
      </div>
    </section>
  </main>
</template>
