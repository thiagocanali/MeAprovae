<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import {
  filterContests,
  type StudyContest,
} from '~~/shared/domain/contests/catalog'
definePageMeta({ layout: 'workspace', middleware: authMiddleware })
useSeoMeta({ title: 'Encontre seu concurso | Me Aprovaê' })
const route = useRoute()
const router = useRouter()
const { data, pending, error, refresh } = await useFetch<{
  contests: StudyContest[]
  followedContestIds: string[]
}>('/api/study/contests')
const {
  data: goalData,
  error: goalError,
  pending: goalPending,
  refresh: refreshGoal,
} = await useFetch<{ goal: { contest_id: string } | null }>('/api/study/goals')
const text = (value: unknown) => (typeof value === 'string' ? value : '')
const filters = computed(() => ({
  search: text(route.query.q),
  board: text(route.query.board),
  education: text(route.query.education),
  followedOnly: route.query.view === 'following',
  sort: route.query.sort === 'title' ? 'title' : 'recent',
}))
const draft = reactive({
  search: filters.value.search,
  board: filters.value.board,
  education: filters.value.education,
  followedOnly: filters.value.followedOnly,
  sort: filters.value.sort,
})
watch(filters, (value) => Object.assign(draft, value))
const contests = computed(() => data.value?.contests ?? [])
const followedIds = computed(() => data.value?.followedContestIds ?? [])
const results = computed(() =>
  filterContests(contests.value, followedIds.value, filters.value),
)
const boards = computed(() =>
  [
    ...new Set(
      contests.value
        .map((c) => c.exam_board)
        .filter((v): v is string => Boolean(v)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
)
const educations = computed(() =>
  [
    ...new Set(
      contests.value
        .flatMap((c) => c.study_positions.map((p) => p.education_level))
        .filter((v): v is string => Boolean(v)),
    ),
  ].sort((a, b) => a.localeCompare(b, 'pt-BR')),
)
const totalPages = computed(() =>
  Math.max(1, Math.ceil(results.value.length / 12)),
)
const currentPage = computed(() =>
  Math.min(
    totalPages.value,
    /^\d+$/.test(text(route.query.page))
      ? Math.max(1, Number(route.query.page))
      : 1,
  ),
)
const visible = computed(() =>
  results.value.slice((currentPage.value - 1) * 12, currentPage.value * 12),
)
const hasFilters = computed(() =>
  Boolean(
    filters.value.search ||
      filters.value.board ||
      filters.value.education ||
      filters.value.followedOnly,
  ),
)
const activeContest = computed(() =>
  contests.value.find((c) => c.id === goalData.value?.goal?.contest_id),
)
function applyFilters() {
  void router.push({
    query: {
      ...route.query,
      q: draft.search.trim() || undefined,
      board: draft.board || undefined,
      education: draft.education || undefined,
      view: draft.followedOnly ? 'following' : undefined,
      sort: draft.sort === 'title' ? 'title' : undefined,
      page: undefined,
    },
  })
}
function clearFilters() {
  Object.assign(draft, {
    search: '',
    board: '',
    education: '',
    followedOnly: false,
    sort: 'recent',
  })
  applyFilters()
}
function changePage(page: number) {
  void router.push({
    query: { ...route.query, page: page > 1 ? String(page) : undefined },
  })
}
</script>
<template>
  <div class="workspace-page">
    <nav class="contest-breadcrumb" aria-label="Caminho da página">
      <NuxtLink to="/app">Minha área</NuxtLink><span aria-hidden="true">/</span
      ><span>Concursos</span>
    </nav>
    <header class="contest-heading">
      <div>
        <span class="contest-kicker">SEU PRÓXIMO OBJETIVO</span>
        <h1>Encontre seu concurso.</h1>
        <p class="contest-description">
          Explore editais, conheça os cargos e transforme um objetivo em um
          plano de estudo.
        </p>
      </div>
      <span class="contest-label-pill">Catálogo de preparação</span>
    </header>
    <p v-if="goalPending" role="status" class="contest-description">
      Consultando seu objetivo…
    </p>
    <div v-else-if="goalError" class="contest-alert" role="alert">
      Não foi possível consultar seu objetivo.
      <button class="contest-btn secondary" @click="refreshGoal()">
        Tentar novamente
      </button>
    </div>
    <section
      v-else-if="activeContest"
      class="contest-goal-banner"
      aria-label="Seu objetivo atual"
    >
      <div>
        <span class="contest-kicker">SEU FOCO ATUAL</span>
        <h2>{{ activeContest.title }}</h2>
        <p>Seu objetivo está definido. Continue de onde parou.</p>
      </div>
      <NuxtLink
        class="contest-btn"
        :to="{ path: '/app/questoes', query: { contestId: activeContest.id } }"
        >Continuar praticando →</NuxtLink
      >
    </section>
    <section
      v-else-if="!goalData?.goal"
      class="contest-goal-banner"
      aria-label="Escolha seu objetivo"
    >
      <div>
        <span class="contest-kicker">PREPARAÇÃO COM DIREÇÃO</span>
        <h2>Um objetivo deixa o próximo passo mais claro.</h2>
        <p>
          Abra um concurso para escolher seu edital e cargo. Você também pode
          praticar antes de decidir.
        </p>
      </div>
      <NuxtLink class="contest-btn secondary" to="/app/questoes"
        >Explorar questões →</NuxtLink
      >
    </section>
    <form
      class="contest-toolbar"
      role="search"
      aria-label="Buscar e filtrar concursos"
      @submit.prevent="applyFilters"
    >
      <div class="contest-search-row">
        <label for="contest-search"
          >Qual concurso você procura?<input
            id="contest-search"
            v-model="draft.search"
            type="search"
            maxlength="180"
            placeholder="Busque por concurso, órgão, banca ou cargo" /></label
        ><button class="contest-btn" type="submit">
          Buscar concursos <span aria-hidden="true">→</span>
        </button>
      </div>
      <div class="contest-filter-row">
        <label for="contest-board"
          >Banca organizadora<select id="contest-board" v-model="draft.board">
            <option value="">Todas as bancas</option>
            <option v-for="board in boards" :key="board" :value="board">
              {{ board }}
            </option>
          </select></label
        ><label for="contest-education"
          >Escolaridade<select id="contest-education" v-model="draft.education">
            <option value="">Todos os níveis</option>
            <option
              v-for="education in educations"
              :key="education"
              :value="education"
            >
              {{ education }}
            </option>
          </select></label
        ><label for="contest-sort"
          >Ordenar por<select id="contest-sort" v-model="draft.sort">
            <option value="recent">Publicação no catálogo</option>
            <option value="title">Nome do concurso</option>
          </select></label
        ><label class="contest-check"
          ><input v-model="draft.followedOnly" type="checkbox" />Só os que
          acompanho</label
        >
      </div>
      <button
        v-if="hasFilters"
        class="contest-clear"
        type="button"
        @click="clearFilters"
      >
        Limpar filtros
      </button>
    </form>
    <div class="contest-results-heading">
      <h2>Explore os concursos</h2>
      <p v-if="!pending && !error" role="status" aria-live="polite">
        {{ results.length }}
        {{
          results.length === 1 ? 'concurso encontrado' : 'concursos encontrados'
        }}
      </p>
    </div>
    <div v-if="pending" class="contest-state" role="status">
      Carregando o catálogo de concursos…
    </div>
    <div v-else-if="error" class="contest-state" role="alert">
      <h2>Não conseguimos carregar o catálogo.</h2>
      <p>Verifique sua conexão e tente novamente.</p>
      <button class="contest-btn" @click="refresh()">
        Tentar carregar novamente
      </button>
    </div>
    <div v-else-if="!contests.length" class="contest-state">
      <h2>Novos objetivos estão a caminho.</h2>
      <p>
        Ainda não há concursos disponíveis no catálogo. Você pode continuar seus
        estudos pelo banco de questões.
      </p>
      <NuxtLink class="contest-btn" to="/app/questoes"
        >Ir para questões →</NuxtLink
      >
    </div>
    <div v-else-if="!results.length" class="contest-state">
      <h2>
        {{
          filters.followedOnly
            ? 'Nenhum concurso acompanhado nesta seleção.'
            : 'Nenhum concurso encontrado.'
        }}
      </h2>
      <p>
        Experimente outro termo ou remova os filtros para explorar o catálogo.
      </p>
      <button class="contest-btn secondary" @click="clearFilters">
        Ver todos os concursos
      </button>
    </div>
    <div v-else class="contest-cards">
      <article
        v-for="contest in visible"
        :key="contest.id"
        class="contest-card"
      >
        <div class="contest-card-top">
          <span class="contest-org-mark" aria-hidden="true">{{
            (contest.organization || contest.title)
              .slice(0, 2)
              .toLocaleUpperCase('pt-BR')
          }}</span
          ><span
            v-if="followedIds.includes(contest.id)"
            class="contest-follow-label"
            >✓ Acompanhando</span
          ><span
            v-else-if="goalData?.goal?.contest_id === contest.id"
            class="contest-follow-label"
            >Seu objetivo</span
          >
        </div>
        <p class="contest-org">
          {{ contest.organization || 'Órgão não informado' }}
        </p>
        <h3>
          <NuxtLink :to="`/app/concursos/${contest.slug}`">{{
            contest.title
          }}</NuxtLink>
        </h3>
        <dl>
          <div>
            <dt>Banca organizadora</dt>
            <dd>{{ contest.exam_board || 'Não informada' }}</dd>
          </div>
          <div>
            <dt>Cargos no catálogo</dt>
            <dd>
              {{ contest.study_positions.length || 'Ainda não informados' }}
            </dd>
          </div>
        </dl>
        <div class="contest-card-bottom">
          <p>
            {{ contest.study_notices.length }}
            {{
              contest.study_notices.length === 1
                ? 'edital disponível'
                : 'editais disponíveis'
            }}
          </p>
          <NuxtLink
            class="contest-text-link"
            :to="`/app/concursos/${contest.slug}`"
            :aria-label="`Ver detalhes de ${contest.title}`"
            >Ver concurso →</NuxtLink
          >
        </div>
      </article>
    </div>
    <nav
      v-if="totalPages > 1 && !error && !pending"
      class="contest-pagination"
      aria-label="Páginas de concursos"
    >
      <button
        class="contest-btn secondary"
        :disabled="currentPage === 1"
        @click="changePage(currentPage - 1)"
      >
        ← Anterior</button
      ><span aria-live="polite">{{ currentPage }} de {{ totalPages }}</span
      ><button
        class="contest-btn secondary"
        :disabled="currentPage === totalPages"
        @click="changePage(currentPage + 1)"
      >
        Próxima →
      </button>
    </nav>
    <p class="contest-description" style="margin-top: 26px; font-size: 12px">
      A presença no catálogo não indica inscrições abertas. Confira prazos,
      vagas e regras na fonte do órgão.
    </p>
  </div>
</template>
