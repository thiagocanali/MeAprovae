<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { parseReviewQueueQuery, type ReviewQueueResponse } from '~~/shared/domain/questions/review-queue'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Fila de revisão | Me Aprovaê' })
const route = useRoute()
const router = useRouter()
const parsed = computed(() => parseReviewQueueQuery(route.query))
const defaults = () => ({ status: parsed.value?.status ?? 'draft', pending: parsed.value?.pending ?? 'all', subjectId: parsed.value?.subjectId ?? '', releaseId: parsed.value?.releaseId ?? '', search: parsed.value?.search ?? '', pageSize: String(parsed.value?.pageSize ?? 20) })
const form = reactive(defaults())
watch(() => route.query, () => { Object.assign(form, defaults()); formError.value = '' })
const formError = ref('')
const { data, pending, error, refresh } = await useFetch<ReviewQueueResponse>('/api/admin/review-queue', { query: computed(() => route.query) })
const { data: subjects, error: subjectsError } = await useFetch<{ subjects: Array<{ id: string; name: string }> }>('/api/admin/subjects')
const { data: releases, error: releasesError } = await useFetch<{ releases: Array<{ id: string; name: string }> }>('/api/admin/content-releases')
async function applyFilters() {
  const query: Record<string, string> = { status: form.status, pending: form.pending, page: '1', pageSize: form.pageSize }
  if (form.subjectId) query.subjectId = form.subjectId
  if (form.releaseId) query.releaseId = form.releaseId
  if (form.search.trim()) query.search = form.search.trim()
  if (!parseReviewQueueQuery(query)) { formError.value = 'Revise os filtros. A busca pode ter até 200 caracteres.'; return }
  formError.value = ''
  await router.push({ query })
}
async function changePage(page: number) {
  if (pending.value || !parsed.value) return
  await router.push({ query: { ...route.query, page: String(page) } })
}
async function resetFilters() {
  Object.assign(form, { status: 'draft', pending: 'all', subjectId: '', releaseId: '', search: '', pageSize: '20' })
  formError.value = ''
  await router.push({ query: {} })
}
const statusLabel = (status: string) => ({ draft: 'Rascunho', published: 'Publicada', archived: 'Arquivada' }[status] ?? status)
const difficultyLabel = (difficulty: string | null) => ({ easy: 'Fácil', medium: 'Média', hard: 'Difícil' }[difficulty ?? ''] ?? 'Não revisada')
</script>

<template>
  <main class="study-page">
    <header class="study-header"><NuxtLink class="auth-brand" to="/admin">Me Aprovaê · Editorial</NuxtLink><nav><NuxtLink to="/admin/acervo">Acervo</NuxtLink><NuxtLink to="/admin">Gestão</NuxtLink></nav></header>
    <section class="study-content">
      <p class="auth-eyebrow">REVISÃO EDITORIAL</p><h1>Fila de revisão</h1>
      <p class="auth-description">Encontre questões por disciplina, lote e pendência de dificuldade. Abra cada item no editor para conferir enunciado, gabarito, explicação e procedência. Classificar a dificuldade não aprova automaticamente o conteúdo.</p>
      <form class="study-card review-filters" @submit.prevent="applyFilters">
        <label for="review-status">Status</label><select id="review-status" v-model="form.status"><option value="draft">Rascunhos</option><option value="published">Publicadas</option><option value="archived">Arquivadas</option><option value="all">Todos</option></select>
        <label for="review-subject">Disciplina</label><select id="review-subject" v-model="form.subjectId"><option value="">Todas</option><option v-for="subject in subjects?.subjects" :key="subject.id" :value="subject.id">{{ subject.name }}</option></select>
        <label for="review-release">Lote de repositório</label><select id="review-release" v-model="form.releaseId"><option value="">Todos</option><option v-if="form.releaseId && !releases?.releases.some(item => item.id === form.releaseId)" :value="form.releaseId">Lote selecionado ({{ form.releaseId.slice(0, 8) }})</option><option v-for="release in releases?.releases" :key="release.id" :value="release.id">{{ release.name }}</option></select>
        <p v-if="subjectsError || releasesError" role="alert">Não foi possível carregar algumas opções. Atualize a página para tentar novamente.</p>
        <label for="review-pending">Pendência</label><select id="review-pending" v-model="form.pending"><option value="all">Todas as questões</option><option value="difficulty">Dificuldade ainda não revisada</option></select>
        <label for="review-search">Trecho do enunciado</label><input id="review-search" v-model="form.search" type="search" maxlength="200" placeholder="Ex.: juros simples">
        <label for="review-size">Itens por página</label><select id="review-size" v-model="form.pageSize"><option value="20">20</option><option value="50">50</option></select>
        <div class="study-actions"><button class="study-primary-button" type="submit" :disabled="pending">Aplicar filtros</button><button class="study-secondary-button" type="button" :disabled="pending" @click="resetFilters">Limpar filtros</button><button class="study-secondary-button" type="button" :disabled="pending" @click="refresh()">Atualizar resultados</button></div>
      </form>
      <p v-if="formError" class="study-error" role="alert">{{ formError }}</p>
      <p v-if="pending" role="status">Carregando fila…</p>
      <div v-else-if="error" class="study-error" role="alert"><p>{{ !parsed ? 'Filtros inválidos. Redefina a busca para continuar.' : 'Não foi possível carregar a fila. É necessário acesso editorial.' }}</p><button @click="refresh()">Tentar novamente</button><button @click="resetFilters">Redefinir filtros</button></div>
      <template v-else-if="data">
        <p role="status">{{ data.total }} questão(ões) encontrada(s) · página {{ data.page }} · {{ data.questions.length }} nesta página</p>
        <p v-if="!data.total" class="study-empty">Nenhuma questão corresponde a esses filtros.</p>
        <div v-else-if="!data.questions.length" class="study-empty">Esta página está fora dos resultados atuais. <button @click="changePage(1)">Ir para a primeira página</button></div>
        <ol v-else class="review-results" :start="(data.page - 1) * data.pageSize + 1">
          <li v-for="question in data.questions" :key="question.id" class="study-card">
            <h2>{{ question.subjectName }}<span v-if="question.topicName"> · {{ question.topicName }}</span></h2>
            <p>{{ question.statementPreview }}</p><p class="study-muted">{{ statusLabel(question.status) }} · Dificuldade: {{ difficultyLabel(question.difficulty) }}</p><p v-if="question.sourceLabel" class="study-muted">{{ question.sourceLabel }}</p>
            <NuxtLink class="study-link" :to="{ path: '/admin', query: { questionId: question.id }, hash: '#question-editor' }">Abrir questão para revisão →</NuxtLink>
          </li>
        </ol>
        <nav v-if="data.total" class="study-actions" aria-label="Paginação da fila"><button class="study-secondary-button" :disabled="pending || data.page <= 1" @click="changePage(data.page - 1)">Página anterior</button><button class="study-secondary-button" :disabled="pending || !data.hasMore" @click="changePage(data.page + 1)">Próxima página</button></nav>
      </template>
    </section>
  </main>
</template>
<style scoped>
.review-filters { display: grid; gap: 10px; }
.review-filters input, .review-filters select { width: 100%; min-width: 0; box-sizing: border-box; padding: 10px; font: inherit; }
.review-results { padding: 0; list-style-position: inside; }
.review-results h2 { font-size: 1.1rem; }
</style>
