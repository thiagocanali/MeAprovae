<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import {
  catalogKinds,
  catalogKindLabel,
  catalogStatusLabel,
  catalogDate,
  catalogUiError,
  catalogIssueLabels,
  type CatalogVersionRecord,
  type CatalogModelResponse,
  type CatalogValidation,
  type CatalogAuditResponse,
} from '~~/shared/domain/questions/exam-catalog-ui'
import type {
  ReviewContext,
  ReviewRecord,
  ReviewSnapshot,
} from '~~/shared/domain/questions/exam-catalog-review'
import type { ReviewQueueResponse } from '~~/shared/domain/questions/review-queue'
import { parseCatalogSave } from '~~/shared/domain/questions/exam-catalog-editorial'
import { evidenceUrl } from '~~/shared/domain/questions/exam-catalog-review'
definePageMeta({
  layout: 'workspace',
  middleware: authMiddleware,
  key: (to) => to.path,
})
useSeoMeta({ title: 'Composição e revisão de simulado | Me Aprovaê' })
const route = useRoute()
const id = String(route.params.id),
  version = String(route.params.version),
  base = `/api/admin/exam-models/${id}`,
  endpoint = `${base}/versions/${version}`
const auditPage = ref(1),
  reviewsPage = ref(1)
const [detail, model, validation, context, audit, reviews] = await Promise.all([
  useFetch<{ version: CatalogVersionRecord }>(endpoint),
  useFetch<CatalogModelResponse>(base),
  useFetch<CatalogValidation>(`${endpoint}/validation`),
  useFetch<ReviewContext>(`${endpoint}/review-context`),
  useFetch<CatalogAuditResponse>(`${base}/audit`, {
    query: computed(() => ({ page: auditPage.value, pageSize: 10 })),
  }),
  useFetch<{ reviews: ReviewRecord[]; total: number; hasMore: boolean }>(
    `${endpoint}/reviews`,
    { query: computed(() => ({ page: reviewsPage.value, pageSize: 10 })) },
  ),
])
const serverVersion = computed(() => detail.data.value?.version)
const form = reactive({
  title: '',
  description: '',
  kind: 'subject-foundations' as CatalogVersionRecord['kind'],
  questionCount: 1,
  questionIds: [] as string[],
})
const original = ref(''),
  dirty = computed(
    () => !!serverVersion.value && JSON.stringify(form) !== original.value,
  ),
  tab = ref('composition'),
  reviewDirty = ref(false),
  reviewBusy = ref(false),
  mutating = ref(false),
  message = ref(''),
  success = ref('')
const busy = computed(() => mutating.value || reviewBusy.value)
function hydrate() {
  const v = serverVersion.value
  if (!v) return
  Object.assign(form, {
    title: v.title,
    description: v.description,
    kind: v.kind,
    questionCount: v.question_count,
    questionIds: (v.items ?? []).map((item) => item.question_id),
  })
  original.value = JSON.stringify(form)
}
hydrate()
function warnBeforeUnload(event: BeforeUnloadEvent) {
  if (!busy.value && !dirty.value && !reviewDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', warnBeforeUnload))
onBeforeUnmount(() =>
  window.removeEventListener('beforeunload', warnBeforeUnload),
)
onBeforeRouteLeave(() => {
  if (busy.value) return false
  if (
    (dirty.value || reviewDirty.value) &&
    !window.confirm('Há alterações não salvas. Deseja sair desta versão?')
  )
    return false
})
const pickerSearch = ref(''),
  pickerSubject = ref(''),
  pickerPage = ref(1),
  pickerQuery = ref({ search: '', subjectId: '', page: 1 })
const picker = await useFetch<ReviewQueueResponse>('/api/admin/review-queue', {
  query: computed(() => ({
    page: pickerQuery.value.page,
    pageSize: 10,
    status: 'all',
    ...(pickerQuery.value.search ? { search: pickerQuery.value.search } : {}),
    ...(pickerQuery.value.subjectId
      ? { subjectId: pickerQuery.value.subjectId }
      : {}),
  })),
})
const subjects = await useFetch<{
  subjects: Array<{ id: string; name: string }>
}>('/api/admin/subjects')
const names = reactive<Record<string, string>>({})
watch(
  () => context.data.value,
  (ctx) => {
    for (const q of ctx?.snapshot.questions ?? [])
      names[q.questionId] = q.statement
  },
  { immediate: true },
)
watch(
  () => picker.data.value,
  (result) => {
    for (const q of result?.questions ?? []) names[q.id] = q.statementPreview
  },
  { immediate: true },
)
function searchQuestions(page = 1) {
  pickerPage.value = page
  pickerQuery.value = {
    search: pickerSearch.value.trim(),
    subjectId: pickerSubject.value,
    page,
  }
}
function addQuestion(questionId: string) {
  if (form.questionIds.length < 20 && !form.questionIds.includes(questionId))
    form.questionIds.push(questionId)
}
function move(index: number, offset: number) {
  const to = index + offset
  if (to < 0 || to >= form.questionIds.length) return
  const list = [...form.questionIds]
  ;[list[index], list[to]] = [list[to]!, list[index]!]
  form.questionIds = list
}
const canEdit = computed(
  () => serverVersion.value?.status === 'draft' && !busy.value,
)
const maximumVersion = computed(() =>
  Math.max(
    Number(version),
    ...(model.data.value?.versions.map((v) => v.version) ?? []),
  ),
)
const canSubmitReview = computed(
  () =>
    !dirty.value &&
    !busy.value &&
    !validation.pending.value &&
    validation.data.value?.canRequestReview &&
    validation.data.value.editRevision === serverVersion.value?.edit_revision,
)
async function refreshSupport() {
  await Promise.all([
    model.refresh(),
    validation.refresh(),
    context.refresh(),
    audit.refresh(),
    reviews.refresh(),
  ])
}
async function reload() {
  if (busy.value) return
  if (
    (dirty.value || reviewDirty.value) &&
    !window.confirm('Descartar alterações locais e recarregar a versão?')
  )
    return
  mutating.value = true
  message.value = ''
  try {
    await detail.refresh()
    if (detail.error.value) throw detail.error.value
    hydrate()
    await refreshSupport()
  } catch (cause) {
    message.value = catalogUiError(cause)
  } finally {
    mutating.value = false
  }
}
async function save() {
  if (!canEdit.value || !serverVersion.value) return
  const body = parseCatalogSave({
    ...form,
    expectedRevision: serverVersion.value.edit_revision,
  })
  if (!body) {
    message.value =
      'Confira título, descrição, tipo, quantidade de 1 a 20 e questões sem repetição.'
    return
  }
  mutating.value = true
  message.value = ''
  success.value = ''
  try {
    const result = await $fetch<{ version: CatalogVersionRecord }>(endpoint, {
      method: 'PUT',
      body,
    })
    detail.data.value = result
    hydrate()
    await refreshSupport()
    success.value = 'Rascunho salvo. Nenhum conteúdo foi publicado.'
  } catch (cause) {
    message.value = catalogUiError(cause)
  } finally {
    mutating.value = false
  }
}
async function transition(action: 'request_review' | 'return_to_draft') {
  if (busy.value || dirty.value || !serverVersion.value) return
  if (
    reviewDirty.value &&
    !window.confirm(
      'Esta mudança descarta o parecer não enviado. Deseja continuar?',
    )
  )
    return
  mutating.value = true
  message.value = ''
  success.value = ''
  try {
    const result = await $fetch<{ version: CatalogVersionRecord }>(
      `${endpoint}/transition`,
      {
        method: 'POST',
        body: { action, expectedRevision: serverVersion.value.edit_revision },
      },
    )
    detail.data.value = result
    hydrate()
    await refreshSupport()
    success.value =
      action === 'request_review'
        ? 'Revisão solicitada. É necessário um revisor independente.'
        : 'Versão devolvida a rascunho; pareceres anteriores permanecem no histórico.'
  } catch (cause) {
    message.value = catalogUiError(cause)
  } finally {
    mutating.value = false
  }
}
async function cloneVersion() {
  if (
    busy.value ||
    dirty.value ||
    reviewDirty.value ||
    !serverVersion.value ||
    model.error.value
  )
    return
  mutating.value = true
  message.value = ''
  try {
    const result = await $fetch<{ version: CatalogVersionRecord }>(
      `${base}/versions`,
      {
        method: 'POST',
        body: {
          version: maximumVersion.value + 1,
          sourceVersion: serverVersion.value.version,
          sourceRevision: serverVersion.value.edit_revision,
        },
      },
    )
    mutating.value = false
    await navigateTo(`/admin/simulados/${id}/${result.version.version}`)
  } catch (cause) {
    message.value = catalogUiError(cause)
  } finally {
    mutating.value = false
  }
}
const historical = ref<{
    review: ReviewRecord & { content_snapshot: ReviewSnapshot }
  } | null>(null),
  historyBusy = ref(false),
  historyError = ref('')
async function openSnapshot(reviewId: string) {
  if (historyBusy.value) return
  historyBusy.value = true
  historyError.value = ''
  try {
    historical.value = await $fetch(`${endpoint}/reviews/${reviewId}`)
  } catch (cause) {
    historyError.value = catalogUiError(cause)
  } finally {
    historyBusy.value = false
  }
}
</script>
<template>
  <div class="workspace-page catalog-admin">
    <section class="study-content">
      <NuxtLink class="study-link" to="/admin/simulados"
        >← Modelos de simulados</NuxtLink
      >
      <p class="auth-eyebrow">COMPOSIÇÃO EDITORIAL</p>
      <h1>Composição e revisão de simulado</h1>
      <p v-if="detail.pending.value" role="status">Carregando versão…</p>
      <div
        v-else-if="detail.error.value || !serverVersion"
        class="study-error"
        role="alert"
      >
        {{ catalogUiError(detail.error.value) }}
        <button @click="reload">Tentar novamente</button>
      </div>
      <template v-else>
        <h2>{{ serverVersion.title }}</h2>
        <p class="catalog-badge">
          Versão {{ serverVersion.version }} ·
          {{ catalogStatusLabel(serverVersion.status) }} · revisão
          {{ serverVersion.edit_revision }}
        </p>
        <p class="study-muted">
          {{ catalogKindLabel(serverVersion.kind) }} ·
          {{ serverVersion.question_count }}
          {{
            serverVersion.question_count === 1
              ? 'questão declarada'
              : 'questões declaradas'
          }}
          · {{ serverVersion.duration_minutes }} minutos. Publicação
          indisponível.
        </p>
        <div class="study-actions">
          <button
            class="study-secondary-button"
            :disabled="busy"
            @click="reload"
          >
            Recarregar versão</button
          ><button
            class="study-secondary-button"
            :disabled="
              busy ||
              dirty ||
              reviewDirty ||
              model.pending.value ||
              !!model.error.value ||
              maximumVersion >= 2147483647
            "
            @click="cloneVersion"
          >
            Criar nova versão</button
          ><span v-if="dirty" class="catalog-badge" role="status"
            >Alterações não salvas</span
          >
        </div>
        <p v-if="message" class="study-error" role="alert">{{ message }}</p>
        <p v-if="success" class="auth-success" role="status">{{ success }}</p>
        <nav class="catalog-sections" aria-label="Seções do editor">
          <button
            v-for="item in [
              { key: 'composition', label: 'Composição' },
              { key: 'review', label: 'Revisão humana e direitos' },
              { key: 'history', label: 'Histórico e auditoria' },
            ]"
            :key="item.key"
            class="study-secondary-button"
            :aria-pressed="tab === item.key"
            @click="tab = item.key"
          >
            {{ item.label }}
          </button>
        </nav>
        <section
          v-show="tab === 'composition'"
          aria-label="Composição da versão"
        >
          <form class="study-card catalog-form" @submit.prevent="save">
            <h2>Dados da composição</h2>
            <label for="edit-title"
              >Título<input
                id="edit-title"
                v-model="form.title"
                required
                minlength="3"
                maxlength="120"
                :disabled="!canEdit"
            /></label>
            <label for="edit-description"
              >Descrição<textarea
                id="edit-description"
                v-model="form.description"
                required
                minlength="3"
                maxlength="800"
                rows="3"
                :disabled="!canEdit"
              />
            </label>
            <label for="edit-kind"
              >Tipo de modelo<select
                id="edit-kind"
                v-model="form.kind"
                :disabled="!canEdit"
              >
                <option
                  v-for="item in catalogKinds"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select></label
            >
            <label for="edit-count"
              >Quantidade declarada<input
                id="edit-count"
                v-model.number="form.questionCount"
                required
                type="number"
                min="1"
                max="20"
                :disabled="!canEdit"
            /></label>
            <p class="study-muted">
              {{ form.questionIds.length }} de {{ form.questionCount }} questões
              selecionadas. A ordem abaixo será preservada.
            </p>
            <ol class="catalog-composition">
              <li
                v-for="(questionId, index) in form.questionIds"
                :key="questionId"
                class="study-card"
              >
                <p>{{ index + 1 }}. {{ names[questionId] || questionId }}</p>
                <div class="study-actions">
                  <button
                    type="button"
                    class="study-secondary-button"
                    :aria-label="`Mover questão ${index + 1} para cima`"
                    :disabled="!canEdit || index === 0"
                    @click="move(index, -1)"
                  >
                    ↑</button
                  ><button
                    type="button"
                    class="study-secondary-button"
                    :aria-label="`Mover questão ${index + 1} para baixo`"
                    :disabled="
                      !canEdit || index === form.questionIds.length - 1
                    "
                    @click="move(index, 1)"
                  >
                    ↓</button
                  ><button
                    type="button"
                    class="study-secondary-button"
                    :disabled="!canEdit"
                    :aria-label="`Remover questão ${index + 1}`"
                    @click="form.questionIds.splice(index, 1)"
                  >
                    Remover
                  </button>
                </div>
              </li>
            </ol>
            <p v-if="!form.questionIds.length" class="study-empty">
              Nenhuma questão selecionada. Use a busca abaixo.
            </p>
            <button class="study-primary-button" :disabled="!canEdit || !dirty">
              {{ mutating ? 'Salvando…' : 'Salvar rascunho' }}
            </button>
          </form>
          <section v-if="serverVersion.status === 'draft'" class="study-card">
            <h2>Adicionar questões existentes</h2>
            <form
              class="catalog-filter-grid"
              @submit.prevent="searchQuestions()"
            >
              <label
                >Buscar questão<input
                  v-model="pickerSearch"
                  type="search"
                  maxlength="200" /></label
              ><label
                >Matéria<select v-model="pickerSubject">
                  <option value="">Todas as matérias</option>
                  <option
                    v-for="subject in subjects.data.value?.subjects"
                    :key="subject.id"
                    :value="subject.id"
                  >
                    {{ subject.name }}
                  </option>
                </select></label
              ><button
                class="study-secondary-button"
                :disabled="picker.pending.value"
              >
                Buscar questões
              </button>
            </form>
            <p v-if="subjects.error.value" class="study-error" role="alert">
              Não foi possível carregar as matérias.
              <button @click="subjects.refresh()">Tentar novamente</button>
            </p>
            <p v-if="picker.pending.value" role="status">Buscando questões…</p>
            <p v-else-if="picker.error.value" class="study-error" role="alert">
              Não foi possível buscar questões.
              <button @click="picker.refresh()">Tentar novamente</button>
            </p>
            <p
              v-else-if="!picker.data.value?.questions.length"
              class="study-empty"
            >
              Nenhuma questão corresponde à busca.
            </p>
            <ul
              v-if="!picker.pending.value && !picker.error.value"
              class="catalog-picker"
            >
              <li
                v-for="question in picker.data.value?.questions"
                :key="question.id"
              >
                <div>
                  <p>{{ question.statementPreview }}</p>
                  <small
                    >{{ question.subjectName }} ·
                    {{
                      question.status === 'draft'
                        ? 'Rascunho'
                        : question.status === 'archived'
                          ? 'Arquivada'
                          : 'Publicada'
                    }}</small
                  >
                </div>
                <button
                  class="study-secondary-button"
                  :disabled="
                    !canEdit ||
                    question.status === 'archived' ||
                    form.questionIds.includes(question.id) ||
                    form.questionIds.length >= 20
                  "
                  :aria-label="`Adicionar questão ${question.statementPreview}`"
                  @click="addQuestion(question.id)"
                >
                  {{
                    form.questionIds.includes(question.id)
                      ? 'Selecionada'
                      : 'Adicionar'
                  }}
                </button>
              </li>
            </ul>
            <nav class="study-actions" aria-label="Paginação de questões">
              <button
                class="study-secondary-button"
                :disabled="pickerPage <= 1 || picker.pending.value"
                @click="searchQuestions(pickerPage - 1)"
              >
                Questões anteriores</button
              ><span>Página {{ pickerPage }}</span
              ><button
                class="study-secondary-button"
                :disabled="!picker.data.value?.hasMore || picker.pending.value"
                @click="searchQuestions(pickerPage + 1)"
              >
                Mais questões
              </button>
            </nav>
          </section>
          <section class="study-card">
            <h2>Validação da composição salva</h2>
            <p v-if="dirty" class="study-muted">
              Salve as alterações para validar a composição atual.
            </p>
            <p v-if="validation.pending.value" role="status">Validando…</p>
            <p
              v-else-if="validation.error.value"
              class="study-error"
              role="alert"
            >
              {{ catalogUiError(validation.error.value) }}
              <button @click="validation.refresh()">Tentar novamente</button>
            </p>
            <template v-else-if="validation.data.value"
              ><ul
                v-if="validation.data.value.issues.length"
                class="catalog-issues"
              >
                <li v-for="issue in validation.data.value.issues" :key="issue">
                  {{ catalogIssueLabels[issue] || issue }}
                </li>
              </ul>
              <p v-else>
                Composição estruturalmente completa. Isso não comprova revisão
                humana ou direitos.
              </p>
              <ul>
                <li
                  v-for="allocation in validation.data.value.distribution"
                  :key="allocation.subjectId"
                >
                  {{
                    subjects.data.value?.subjects.find(
                      (s) => s.id === allocation.subjectId,
                    )?.name || allocation.subjectId
                  }}: {{ allocation.questionCount }} questões
                </li>
              </ul></template
            >
            <div class="study-actions">
              <button
                v-if="serverVersion.status === 'draft'"
                class="study-primary-button"
                :disabled="!canSubmitReview"
                @click="transition('request_review')"
              >
                Solicitar revisão</button
              ><button
                v-else
                class="study-secondary-button"
                :disabled="busy || reviewDirty"
                @click="transition('return_to_draft')"
              >
                Devolver a rascunho
              </button>
            </div>
          </section>
        </section>
        <section v-show="tab === 'review'">
          <h2>Revisão humana e direitos</h2>
          <p v-if="context.pending.value" role="status">
            Carregando conteúdo para revisão…
          </p>
          <p v-else-if="context.error.value" class="study-error" role="alert">
            {{ catalogUiError(context.error.value) }}
            <button @click="reload">Tentar novamente</button>
          </p>
          <CatalogReviewPanel
            v-if="context.data.value"
            :blocked="context.pending.value || !!context.error.value"
            :context="context.data.value"
            :endpoint="`${endpoint}/reviews`"
            @saved="refreshSupport"
            @busy="reviewBusy = $event"
            @dirty="reviewDirty = $event"
          />
        </section>
        <section v-show="tab === 'history'">
          <h2>Versões, pareceres e auditoria</h2>
          <p v-if="model.error.value" class="study-error" role="alert">
            Não foi possível carregar as versões.
            <button @click="model.refresh()">Tentar novamente</button>
          </p>
          <p v-if="model.data.value?.versionsTruncated" class="study-muted">
            Exibindo as 100 versões mais recentes.
          </p>
          <ul class="catalog-versions">
            <li v-for="item in model.data.value?.versions" :key="item.version">
              <NuxtLink
                class="study-link"
                :aria-current="
                  item.version === serverVersion.version ? 'page' : undefined
                "
                :to="`/admin/simulados/${id}/${item.version}`"
                >Versão {{ item.version }} ·
                {{ catalogStatusLabel(item.status) }} ·
                {{ item.title }}</NuxtLink
              >
            </li>
          </ul>
          <h3>Pareceres registrados</h3>
          <p class="study-muted">Datas e horários de Brasília.</p>
          <p v-if="reviews.error.value" class="study-error" role="alert">
            Não foi possível carregar os pareceres.
            <button @click="reviews.refresh()">Tentar novamente</button>
          </p>
          <p
            v-else-if="!reviews.data.value?.reviews.length"
            class="study-empty"
          >
            Nenhum parecer registrado para esta versão.
          </p>
          <article
            v-for="item in reviews.data.value?.reviews"
            :key="item.id"
            class="study-card"
          >
            <h4>
              {{
                item.decision === 'approved'
                  ? 'Aprovado editorialmente'
                  : 'Ajustes solicitados'
              }}
              · revisão {{ item.edit_revision }}
            </h4>
            <p>{{ item.notes }}</p>
            <p class="study-muted">
              {{ catalogDate(item.created_at) }} · revisor
              {{ item.reviewer_id.slice(0, 8) }}
            </p>
            <details>
              <summary>Evidências e identificação</summary>
              <p class="catalog-hash">
                Revisor: {{ item.reviewer_id }}<br />Impressão:
                {{ item.fingerprint }}
              </p>
              <ul>
                <li v-for="right in item.rights" :key="right.questionId">
                  <p>{{ right.basis }} — {{ right.evidence }}</p>
                  <a
                    v-if="evidenceUrl(right.sourceUrl)"
                    :href="evidenceUrl(right.sourceUrl) || undefined"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Abrir referência ↗</a
                  >
                </li>
              </ul>
            </details>
            <button
              class="study-secondary-button"
              :disabled="historyBusy"
              @click="openSnapshot(item.id)"
            >
              Ver conteúdo do parecer
            </button>
          </article>
          <nav class="study-actions" aria-label="Paginação de pareceres">
            <button
              class="study-secondary-button"
              :disabled="reviewsPage <= 1 || reviews.pending.value"
              @click="reviewsPage--"
            >
              Pareceres anteriores</button
            ><button
              class="study-secondary-button"
              :disabled="!reviews.data.value?.hasMore || reviews.pending.value"
              @click="reviewsPage++"
            >
              Mais pareceres
            </button>
          </nav>
          <p v-if="historyError" class="study-error" role="alert">
            {{ historyError }}
          </p>
          <section v-if="historical" class="study-card">
            <h3>Conteúdo preservado do parecer</h3>
            <p>
              Revisão {{ historical.review.edit_revision }}. Este registro
              histórico não declara a aprovação da composição atual.
            </p>
            <CatalogQuestionPreview
              :questions="historical.review.content_snapshot.questions"
            /><button class="study-secondary-button" @click="historical = null">
              Fechar conteúdo histórico
            </button>
          </section>
          <h3>Auditoria de alterações</h3>
          <p v-if="audit.error.value" class="study-error" role="alert">
            Não foi possível carregar a auditoria.
            <button @click="audit.refresh()">Tentar novamente</button>
          </p>
          <p v-else-if="!audit.data.value?.events.length" class="study-empty">
            Nenhuma alteração registrada.
          </p>
          <ol class="catalog-audit">
            <li v-for="event in audit.data.value?.events" :key="event.id">
              <strong>{{
                event.action === 'INSERT'
                  ? 'Criação'
                  : event.action === 'DELETE'
                    ? 'Remoção'
                    : 'Atualização'
              }}</strong>
              ·
              {{
                event.table_name === 'exam_catalog_items'
                  ? 'composição'
                  : event.table_name === 'exam_catalog_versions'
                    ? 'versão'
                    : 'modelo'
              }}
              · {{ catalogDate(event.occurred_at) }}
              <p class="study-muted">
                {{
                  event.actor_id
                    ? `Conta ${event.actor_id.slice(0, 8)}`
                    : 'Operação administrativa sem revisor humano identificado'
                }}
              </p>
            </li>
          </ol>
          <nav class="study-actions" aria-label="Paginação de auditoria">
            <button
              class="study-secondary-button"
              :disabled="auditPage <= 1 || audit.pending.value"
              @click="auditPage--"
            >
              Eventos anteriores</button
            ><button
              class="study-secondary-button"
              :disabled="!audit.data.value?.hasMore || audit.pending.value"
              @click="auditPage++"
            >
              Mais eventos
            </button>
          </nav>
        </section>
      </template>
    </section>
  </div>
</template>
