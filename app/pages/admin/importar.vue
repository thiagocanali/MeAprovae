<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { IMPORT_MAX_BYTES, parseQuestionImport } from '~~/shared/domain/questions/import'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Importar questões | Me Aprovaê' })
const { data: overview, error: accessError } = await useFetch('/api/admin/overview')
const { data: notices } = await useFetch<{ notices: Array<{ id: string; title: string; status: string }> }>('/api/admin/notices')
interface Batch { id: string; source_name: string; question_count: number; created_at: string }
const { data: history, error: historyError, refresh: refreshHistory } = await useFetch<{ batches: Batch[] }>('/api/admin/imports')
const jsonl = ref('')
const noticeId = ref('')
const sourceName = ref('')
const requestId = ref('')
const fileError = ref('')
const saving = ref(false)
const message = ref('')
const serverError = ref('')
const validation = computed(() => parseQuestionImport(jsonl.value))
const hasIssues = computed(() => validation.value.issues.length > 0)
const requestValid = computed(() => Boolean(noticeId.value && /^[a-z0-9][a-z0-9._-]{2,79}$/.test(sourceName.value) && !hasIssues.value))
// Keep the identifier on retries; change it whenever the payload changes.
watch([jsonl, noticeId, sourceName], () => { requestId.value = ''; message.value = ''; serverError.value = '' })
async function loadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  fileError.value = ''
  if (!file) return
  if (file.size > IMPORT_MAX_BYTES) { jsonl.value = ''; fileError.value = 'O arquivo deve ter no máximo 2 MB.'; return }
  try { jsonl.value = await file.text() }
  catch { fileError.value = 'Não foi possível ler o arquivo.' }
}
async function submit() {
  if (!requestValid.value || saving.value) return
  saving.value = true; serverError.value = ''; message.value = ''
  if (!requestId.value) requestId.value = crypto.randomUUID()
  try {
    const response = await $fetch<{ batch: { id: string; questionCount: number; replayed: boolean } }>('/api/admin/imports', {
      method: 'POST', body: { requestId: requestId.value, noticeId: noticeId.value, sourceName: sourceName.value, jsonl: jsonl.value },
    })
    message.value = `${response.batch.questionCount} questões em rascunho. Lote ${response.batch.id}.${response.batch.replayed ? ' Requisição já processada, sem duplicação.' : ''}`
    await refreshHistory()
  } catch (cause: unknown) {
    const failure = cause as { data?: { statusMessage?: string } }
    serverError.value = failure.data?.statusMessage ?? 'Não foi possível importar. Tente novamente sem alterar o lote.'
  } finally { saving.value = false }
}
</script>

<template>
  <main class="study-page">
    <header class="study-header"><NuxtLink class="auth-brand" to="/admin">Me Aprovaê · Editorial</NuxtLink><NuxtLink to="/admin">Voltar à gestão</NuxtLink></header>
    <section class="study-content">
      <h1>Importar questões em lote</h1>
      <div v-if="accessError" class="study-error" role="alert">A importação exige acesso editorial. <NuxtLink to="/app">Voltar aos estudos</NuxtLink></div>
      <template v-else-if="overview">
        <p class="auth-description">Importe até 100 questões por lote. Todas entram como rascunho, com alternativas, gabarito, explicação e procedência. Revise o conteúdo antes de publicar.</p>
        <form class="study-card import-form" @submit.prevent="submit">
          <fieldset :disabled="saving">
            <legend>Destino e procedência</legend>
            <label for="import-notice">Edital</label>
            <select id="import-notice" v-model="noticeId" required><option value="">Selecione um edital</option><option v-for="notice in notices?.notices.filter(item => item.status !== 'archived')" :key="notice.id" :value="notice.id">{{ notice.title }}</option></select>
            <label for="import-source">Identificador estável da fonte</label>
            <input id="import-source" v-model="sourceName" required pattern="[a-z0-9][a-z0-9._-]{2,79}" placeholder="acervo-original-2026" aria-describedby="source-help">
            <p id="source-help" class="study-muted">Use o mesmo identificador nos lotes da mesma coleção. Letras minúsculas, números, ponto, hífen ou sublinhado, de 3 a 80 caracteres.</p>
            <label for="import-file">Arquivo JSONL (até 2 MB)</label><input id="import-file" type="file" accept=".jsonl,.ndjson" @change="loadFile">
            <p v-if="fileError" role="alert">{{ fileError }}</p>
            <label for="import-content">Conteúdo do lote — um objeto JSON por linha</label>
            <textarea id="import-content" v-model="jsonl" rows="12" spellcheck="false" required aria-describedby="import-help"></textarea>
            <p id="import-help" class="study-muted">Informe a disciplina exatamente como cadastrada e vinculada ao edital. Inclua declaração de autoria ou evidência dos direitos em rightsEvidence.</p>
          </fieldset>
          <details><summary>Formato e exemplo de uma linha</summary>
            <p>correctOption começa em zero; difficulty aceita easy, medium ou hard; rights aceita original, licensed ou public-domain. Conteúdo externo exige sourceUrl. A dificuldade será marcada como não revisada.</p>
            <pre>{"externalId":"mat-001","subject":"Matemática","statement":"Qual é o resultado de 2 + 3?","explanation":"Somando duas unidades a três unidades, obtemos cinco.","sourceLabel":"Equipe editorial","rights":"original","rightsEvidence":"Questão de autoria própria da equipe.","difficulty":"easy","options":["4","5"],"correctOption":1}</pre>
          </details>
          <div v-if="jsonl && hasIssues" role="alert"><h2>Revise o lote</h2><ul><li v-for="(issue, index) in validation.issues.slice(0, 30)" :key="index">{{ issue.line ? `Linha ${issue.line}: ` : '' }}{{ issue.message }}</li></ul><p v-if="validation.issues.length > 30">Mostrando 30 de {{ validation.issues.length }} problemas.</p></div>
          <p v-else-if="jsonl" role="status">{{ validation.questions.length }} questões passaram na validação do arquivo. O banco verificará vínculos e duplicatas.</p>
          <button class="study-primary-button" :disabled="saving || !requestValid" type="submit">{{ saving ? 'Importando…' : 'Importar como rascunho' }}</button>
        </form>
        <p v-if="serverError" class="study-error" role="alert">{{ serverError }}</p>
        <p v-if="message" role="status">{{ message }} <NuxtLink to="/admin">Revisar questões na gestão editorial →</NuxtLink></p>
        <section class="study-section"><h2>Últimos 50 lotes</h2>
          <p v-if="historyError" role="alert">Não foi possível carregar os lotes. <button @click="refreshHistory()">Tentar novamente</button></p>
          <p v-else-if="!history?.batches.length">Nenhum lote importado.</p>
          <ol v-else><li v-for="batch in history.batches" :key="batch.id" class="study-card"><strong>{{ batch.source_name }}</strong> · {{ batch.question_count }} questões<p>{{ new Date(batch.created_at).toLocaleString('pt-BR') }}</p><small>{{ batch.id }}</small></li></ol>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.import-form { display: grid; gap: 20px; }
fieldset { display: grid; gap: 12px; border: 1px solid #cbd5e1; padding: 16px; min-width: 0; }
input, select, textarea { width: 100%; padding: 10px; box-sizing: border-box; font: inherit; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
