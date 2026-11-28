<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import {
  catalogKinds,
  catalogKindLabel,
  catalogStatusLabel,
  catalogUiError,
  type CatalogListResponse,
} from '~~/shared/domain/questions/exam-catalog-ui'
import {
  parseCatalogQuery,
  parseCatalogCreate,
} from '~~/shared/domain/questions/exam-catalog-editorial'
import type { ExamModelKind } from '~~/shared/domain/questions/exam-model'
definePageMeta({ layout: 'workspace', middleware: authMiddleware })
useSeoMeta({ title: 'Modelos de simulados | Me Aprovaê' })
const route = useRoute(),
  router = useRouter()
const filters = computed(() => parseCatalogQuery(route.query))
const { data, error, pending, refresh } = await useFetch<CatalogListResponse>(
  '/api/admin/exam-models',
  {
    query: computed(() =>
      filters.value
        ? {
            page: filters.value.page,
            pageSize: 20,
            status: filters.value.status,
            kind: filters.value.kind,
            search: filters.value.search,
          }
        : route.query,
    ),
  },
)
const search = ref(''),
  status = ref('all'),
  kind = ref('all')
watch(
  () => route.query,
  () => {
    search.value =
      typeof route.query.search === 'string' ? route.query.search : ''
    status.value =
      typeof route.query.status === 'string' ? route.query.status : 'all'
    kind.value = typeof route.query.kind === 'string' ? route.query.kind : 'all'
  },
  { immediate: true },
)
function apply(page = 1) {
  return router.push({
    path: route.path,
    query: {
      page: String(page),
      status: status.value,
      kind: kind.value,
      ...(search.value.trim() ? { search: search.value.trim() } : {}),
    },
  })
}
const title = ref(''),
  description = ref(''),
  newKind = ref<ExamModelKind>('subject-foundations'),
  count = ref(10),
  busy = ref(false),
  message = ref(''),
  requestId = ref('')
onBeforeRouteLeave(() => !busy.value)
async function create() {
  if (busy.value) return
  requestId.value ||= crypto.randomUUID()
  const body = parseCatalogCreate({
    modelId: requestId.value,
    title: title.value,
    description: description.value,
    kind: newKind.value,
    questionCount: count.value,
  })
  if (!body) {
    message.value = 'Informe título, descrição e quantidade de 1 a 20 questões.'
    return
  }
  busy.value = true
  message.value = ''
  try {
    const result = await $fetch<{
      version: { model_id: string; version: number }
    }>('/api/admin/exam-models', { method: 'POST', body })
    busy.value = false
    await navigateTo(
      `/admin/simulados/${result.version.model_id}/${result.version.version}`,
    )
  } catch (cause) {
    message.value = catalogUiError(cause)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <div class="workspace-page catalog-admin">
    <section class="study-content">
      <p class="auth-eyebrow">ESPAÇO EDITORIAL</p>
      <h1>Modelos de simulados</h1>
      <p class="auth-description">
        Prepare composições fixas, acompanhe versões e encaminhe para revisão. A
        publicação ainda não está disponível.
      </p>
      <form
        class="study-filters catalog-filter-grid"
        aria-label="Filtros de modelos"
        @submit.prevent="apply()"
      >
        <label
          >Buscar título<input
            v-model="search"
            type="search"
            maxlength="120"
            placeholder="Ex.: fundamentos de matemática"
        /></label>
        <label
          >Estado<select v-model="status">
            <option value="all">Todos os estados</option>
            <option value="draft">Rascunhos</option>
            <option value="in_review">Em revisão</option>
          </select></label
        >
        <label
          >Tipo<select v-model="kind">
            <option value="all">Todos os tipos</option>
            <option
              v-for="item in catalogKinds"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select></label
        >
        <button class="study-secondary-button" :disabled="pending">
          Aplicar filtros
        </button>
      </form>
      <p v-if="pending" role="status">Carregando modelos…</p>
      <div v-else-if="error || !filters" class="study-error" role="alert">
        {{
          !filters
            ? 'Filtros inválidos. Limpe os filtros para continuar.'
            : catalogUiError(error)
        }}
        <button v-if="filters" @click="refresh()">Tentar novamente</button
        ><NuxtLink v-else to="/admin/simulados">Limpar filtros</NuxtLink>
      </div>
      <template v-else-if="data">
        <p class="study-muted" aria-live="polite">
          {{ data.total }} versões encontradas · página {{ data.page }}
        </p>
        <p v-if="!data.versions.length" class="study-empty">
          Nenhum modelo corresponde aos filtros. Você pode criar um rascunho
          abaixo.
        </p>
        <div class="catalog-card-grid">
          <article
            v-for="model in data.versions"
            :key="`${model.model_id}:${model.version}`"
            class="study-card"
          >
            <p class="catalog-badge">
              {{ catalogStatusLabel(model.status) }} · versão
              {{ model.version }}
            </p>
            <h2>{{ model.title }}</h2>
            <p>{{ model.description }}</p>
            <p class="study-muted">
              {{ catalogKindLabel(model.kind) }} ·
              {{ model.question_count }} questões ·
              {{ model.duration_minutes }} minutos
            </p>
            <NuxtLink
              class="study-link"
              :to="`/admin/simulados/${model.model_id}/${model.version}`"
              >Abrir versão {{ model.version }} →</NuxtLink
            >
          </article>
        </div>
        <nav class="study-actions" aria-label="Paginação de modelos">
          <button
            class="study-secondary-button"
            :disabled="data.page <= 1 || pending"
            @click="apply(data.page - 1)"
          >
            Página anterior</button
          ><button
            class="study-secondary-button"
            :disabled="!data.hasMore || pending"
            @click="apply(data.page + 1)"
          >
            Próxima página
          </button>
        </nav>
        <section class="study-card">
          <h2>Criar um rascunho</h2>
          <p class="study-muted">
            O rascunho começa sem questões. A duração será de seis minutos por
            questão.
          </p>
          <form class="catalog-form" @submit.prevent="create">
            <label for="model-title"
              >Título<input
                id="model-title"
                v-model="title"
                required
                minlength="3"
                maxlength="120"
                :disabled="busy"
            /></label>
            <label for="model-description"
              >Descrição<textarea
                id="model-description"
                v-model="description"
                required
                minlength="3"
                maxlength="800"
                rows="3"
                :disabled="busy"
              />
            </label>
            <label for="model-kind"
              >Tipo de modelo<select
                id="model-kind"
                v-model="newKind"
                :disabled="busy"
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
            <label for="model-count"
              >Quantidade declarada<input
                id="model-count"
                v-model.number="count"
                type="number"
                min="1"
                max="20"
                required
                :disabled="busy"
            /></label>
            <p v-if="message" class="study-error" role="alert">{{ message }}</p>
            <button class="study-primary-button" :disabled="busy">
              {{ busy ? 'Criando…' : 'Criar rascunho' }}
            </button>
          </form>
        </section>
      </template>
    </section>
  </div>
</template>
