<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import {
  filterOfficialExams,
  type OfficialExam,
} from '~~/shared/domain/content/official-exams'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Provas e gabaritos oficiais | Me Aprovaê' })
const route = useRoute()
const router = useRouter()
const { data, pending, error, refresh } = await useFetch<{
  verifiedAt: string
  exams: OfficialExam[]
}>('/api/study/official-exams')
const queryText = (value: unknown) => (typeof value === 'string' ? value : '')
const search = ref(queryText(route.query.q))
const selectedEvent = ref(queryText(route.query.event))
const selectedYear = ref(queryText(route.query.year))
watch(
  () => route.query,
  (query) => {
    search.value = queryText(query.q)
    selectedEvent.value = queryText(query.event)
    selectedYear.value = queryText(query.year)
  },
)
const exams = computed(() => data.value?.exams ?? [])
const events = computed(() =>
  [...new Set(exams.value.map((exam) => exam.event))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR'),
  ),
)
const years = computed(() =>
  [...new Set(exams.value.map((exam) => exam.year))].sort((a, b) => b - a),
)
const results = computed(() =>
  filterOfficialExams(
    exams.value,
    queryText(route.query.q),
    queryText(route.query.event),
    queryText(route.query.year),
  ),
)
const ready = computed(
  () => exams.value.filter((exam) => exam.downloadVerified).length,
)
const page = computed(() =>
  Math.max(
    1,
    Math.min(
      Math.ceil(results.value.length / 12) || 1,
      /^\d+$/.test(queryText(route.query.page)) ? Number(route.query.page) : 1,
    ),
  ),
)
const shown = computed(() =>
  results.value.slice((page.value - 1) * 12, page.value * 12),
)
const pages = computed(() => Math.ceil(results.value.length / 12))
function apply() {
  void router.push({
    query: {
      q: search.value.trim() || undefined,
      event: selectedEvent.value || undefined,
      year: selectedYear.value || undefined,
    },
  })
}
function clear() {
  search.value = ''
  selectedEvent.value = ''
  selectedYear.value = ''
  apply()
}
</script>
<template>
  <ContestShell>
    <nav class="contest-breadcrumb" aria-label="Caminho da página">
      <NuxtLink to="/app/concursos">Concursos</NuxtLink
      ><span aria-hidden="true">/</span><span>Provas oficiais</span>
    </nav>
    <header class="contest-heading">
      <div>
        <span class="contest-kicker">ACERVO DE PROVAS ANTERIORES</span>
        <h1>Pratique com provas oficiais.</h1>
        <p class="contest-description">
          Cadernos e gabaritos das fontes organizadoras, com identificação de
          ano, bloco ou cargo e tipo de prova. Os PDFs abrem fora do Me Aprovaê.
        </p>
      </div>
      <NuxtLink class="contest-btn secondary" to="/app/provas"
        >Montar simulado interativo →</NuxtLink
      >
    </header>
    <div class="contest-goal-banner">
      <div>
        <h2>Prova e gabarito precisam ser do mesmo caderno.</h2>
        <p>
          Confira o ano, o bloco ou cargo e o tipo. Gabaritos consolidados podem
          reunir vários cadernos e questões anuladas. O estudo em PDF não gera
          nota nem registra respostas no seu desempenho.
        </p>
      </div>
    </div>
    <form
      class="contest-toolbar"
      role="search"
      aria-label="Filtrar provas oficiais"
      @submit.prevent="apply"
    >
      <div class="contest-search-row">
        <label for="official-search"
          >Buscar prova<input
            id="official-search"
            v-model="search"
            type="search"
            placeholder="Bloco, cargo, área ou banca" /></label
        ><button class="contest-btn" type="submit">Buscar provas</button>
      </div>
      <div class="contest-filter-row">
        <label for="official-event"
          >Concurso ou avaliação<select
            id="official-event"
            v-model="selectedEvent"
          >
            <option value="">Todos</option>
            <option v-for="event in events" :key="event" :value="event">
              {{ event }}
            </option>
          </select></label
        ><label for="official-year"
          >Ano<select id="official-year" v-model="selectedYear">
            <option value="">Todos os anos</option>
            <option v-for="year in years" :key="year" :value="String(year)">
              {{ year }}
            </option>
          </select></label
        >
      </div>
      <button
        v-if="route.query.q || route.query.event || route.query.year"
        type="button"
        class="contest-clear"
        @click="clear"
      >
        Limpar filtros
      </button>
    </form>
    <p v-if="pending" class="contest-state" role="status">
      Carregando as fontes oficiais…
    </p>
    <div v-else-if="error" class="contest-state" role="alert">
      <h2>Não foi possível carregar as provas.</h2>
      <button class="contest-btn" @click="refresh()">Tentar novamente</button>
    </div>
    <template v-else
      ><div class="contest-results-heading">
        <h2>Provas e gabaritos</h2>
        <p role="status" aria-live="polite">
          {{ results.length }}
          {{
            results.length === 1
              ? 'referência encontrada'
              : 'referências encontradas'
          }}
        </p>
      </div>
      <p class="contest-description" style="margin-bottom: 22px">
        {{ ready }} pares de PDFs conferidos no acervo. Para as demais
        referências, abra a página oficial e consulte os arquivos disponíveis.
      </p>
      <div v-if="!results.length" class="contest-state">
        <h2>Nenhuma prova encontrada.</h2>
        <p>Experimente outro termo, concurso ou ano.</p>
        <button class="contest-btn secondary" @click="clear">
          Ver todas as provas
        </button>
      </div>
      <div v-else class="contest-cards">
        <article v-for="exam in shown" :key="exam.id" class="contest-card">
          <p class="contest-kicker">{{ exam.event }} · {{ exam.year }}</p>
          <h3>{{ exam.title }}</h3>
          <dl>
            <div>
              <dt>Banca / organizador</dt>
              <dd>{{ exam.board }}</dd>
            </div>
            <div>
              <dt>Caderno</dt>
              <dd>{{ exam.variant }}</dd>
            </div>
          </dl>
          <p
            class="contest-description"
            style="font-size: 12px; margin-bottom: 18px"
          >
            {{ exam.comparisonNote }}
          </p>
          <div
            v-if="exam.downloadVerified"
            class="contest-actions"
            style="margin-top: auto"
          >
            <a
              class="contest-btn"
              :href="exam.proofUrl"
              target="_blank"
              rel="noopener noreferrer"
              >Abrir prova
              <span class="visually-hidden">(PDF em nova aba)</span></a
            ><a
              class="contest-btn secondary"
              :href="exam.answerKeyUrl"
              target="_blank"
              rel="noopener noreferrer"
              >Gabarito final
              <span class="visually-hidden">(PDF em nova aba)</span></a
            >
          </div>
          <p v-else class="contest-description" style="font-size: 12px">
            A página oficial foi localizada, mas o download direto não foi
            confirmado nesta verificação.
          </p>
          <div class="contest-card-bottom" style="margin-top: 18px">
            <span class="contest-follow-label">{{
              exam.downloadVerified
                ? 'Par de PDFs conferido'
                : 'Consultar na fonte'
            }}</span
            ><a
              class="contest-text-link"
              :href="exam.sourcePage"
              target="_blank"
              rel="noopener noreferrer"
              >Página oficial →
              <span class="visually-hidden">(nova aba)</span></a
            >
          </div>
        </article>
      </div>
      <nav
        v-if="pages > 1"
        class="contest-pagination"
        aria-label="Páginas de provas"
      >
        <button
          class="contest-btn secondary"
          :disabled="page === 1"
          @click="
            router.push({ query: { ...route.query, page: String(page - 1) } })
          "
        >
          ← Anterior</button
        ><span aria-live="polite">{{ page }} de {{ pages }}</span
        ><button
          class="contest-btn secondary"
          :disabled="page === pages"
          @click="
            router.push({ query: { ...route.query, page: String(page + 1) } })
          "
        >
          Próxima →
        </button>
      </nav></template
    >
  </ContestShell>
</template>
