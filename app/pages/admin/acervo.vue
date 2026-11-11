<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Acervo editorial | Me Aprovaê' })
interface Release { id: string; name: string; questionCount: number; drafts: number; published: number; archived: number; difficultyPending: number; contentHash: string; gitCommit: string; installedAt: string }
interface Question { id: string; externalId: string; statement: string; rightsEvidence: string; status: string; difficultyReviewed: boolean; topic: string }
const { data, pending, error, refresh } = await useFetch<{ releases: Release[] }>('/api/admin/content-releases')
const selected = ref<Release | null>(null)
const questions = ref<Question[]>([])
const loading = ref(false)
const questionError = ref('')
async function openRelease(release: Release) {
  if (loading.value) return
  selected.value = release; loading.value = true; questionError.value = ''; questions.value = []
  try { questions.value = (await $fetch<{ questions: Question[] }>(`/api/admin/content-releases/${release.id}`)).questions }
  catch { questionError.value = 'Não foi possível carregar o lote. Tente novamente.' }
  finally { loading.value = false }
}
</script>
<template>
  <main class="study-page">
    <header class="study-header"><NuxtLink class="auth-brand" to="/admin">Me Aprovaê · Editorial</NuxtLink><nav><NuxtLink to="/admin/revisao">Fila de revisão</NuxtLink><NuxtLink to="/admin">Gestão</NuxtLink><NuxtLink to="/admin/importar">Importar</NuxtLink></nav></header>
    <section class="study-content">
      <p class="auth-eyebrow">CONTEÚDO ORIGINAL VERSIONADO</p><h1>Acervo em revisão</h1>
      <p class="auth-description">Acompanhe os últimos 50 lotes originais instalados a partir do repositório. Conferência automática de cálculos não substitui revisão editorial de enunciados, explicações, direitos e dificuldade.</p>
      <button class="study-secondary-button" :disabled="pending" @click="refresh()">Atualizar acervo</button>
      <p v-if="pending" role="status">Carregando acervo…</p>
      <p v-else-if="error" class="study-error" role="alert">Acesso editorial necessário ou serviço indisponível. <button @click="refresh()">Tentar novamente</button></p>
      <p v-else-if="!data?.releases.length" class="study-empty">Nenhum lote de repositório instalado.</p>
      <article v-for="release in data?.releases" :key="release.id" class="study-card">
        <h2>{{ release.name }}</h2>
        <p>{{ release.questionCount }} questões · {{ release.drafts }} rascunhos · {{ release.published }} publicadas · {{ release.archived }} arquivadas</p>
        <p>{{ release.difficultyPending }} classificações de dificuldade pendentes. A origem registra assistência de IA.</p>
        <details><summary>Procedência do lote</summary><p>Instalado em {{ new Date(release.installedAt).toLocaleString('pt-BR') }}.</p><p class="hash">SHA-256: {{ release.contentHash }}</p><a :href="`https://github.com/thiagocanali/MeAprovae/tree/${release.gitCommit}/content/releases`" target="_blank" rel="noopener noreferrer">Consultar arquivos no commit de origem</a></details>
        <NuxtLink class="study-link" :to="{ path: '/admin/revisao', query: { releaseId: release.id, status: 'draft' } }">Revisar rascunhos deste lote →</NuxtLink>
        <button class="study-secondary-button" :disabled="loading" @click="openRelease(release)">Ver questões de {{ release.name }}</button>
      </article>
      <section v-if="selected" class="study-section" aria-live="polite">
        <h2>Revisão: {{ selected.name }}</h2>
        <p v-if="loading" role="status">Carregando questões…</p>
        <p v-if="questionError" role="alert">{{ questionError }} <button @click="openRelease(selected)">Tentar novamente</button></p>
        <ol v-if="questions.length" class="review-list"><li v-for="question in questions" :key="question.id" class="study-card">
          <h3>{{ question.topic }}</h3><p>{{ question.statement }}</p><p class="study-muted">{{ question.status === 'draft' ? 'Rascunho' : question.status === 'published' ? 'Publicada' : 'Arquivada' }} · {{ question.difficultyReviewed ? 'Dificuldade revisada' : 'Dificuldade pendente' }}</p>
          <details><summary>Autoria e identificador</summary><p>{{ question.rightsEvidence }}</p><p class="hash">{{ question.externalId }}</p></details>
          <NuxtLink class="study-link" :to="{ path: '/admin', query: { questionId: question.id }, hash: '#question-editor' }">Revisar no editor →</NuxtLink>
        </li></ol>
      </section>
    </section>
  </main>
</template>
<style scoped>
.hash { overflow-wrap: anywhere; }
.review-list { padding: 0; list-style-position: inside; }
</style>
