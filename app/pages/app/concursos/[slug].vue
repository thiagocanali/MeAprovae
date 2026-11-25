<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { officialArchiveForContest } from '~~/shared/domain/content/official-exams'
import {
  contestDate,
  noticeSource,
  type StudyContest,
} from '~~/shared/domain/contests/catalog'
definePageMeta({
  middleware: authMiddleware,
  key: (route) => String(route.params.slug),
})
const route = useRoute()
const endpoint = computed(
  () => `/api/study/contests/${String(route.params.slug)}`,
)
const { data, pending, error, refresh } = await useFetch<{
  contest: StudyContest
  isFollowed: boolean
}>(endpoint)
const {
  data: goalData,
  error: goalError,
  pending: goalPending,
  refresh: refreshGoal,
} = await useFetch<{
  goal: {
    contest_id: string
    notice_id: string | null
    position_id: string | null
  } | null
}>('/api/study/goals')
const contest = computed(() => data.value?.contest)
const officialArchive = computed(() =>
  officialArchiveForContest(contest.value?.slug || ''),
)
useSeoMeta({
  title: () => `${contest.value?.title || 'Concurso'} | Me Aprovaê`,
})
const followed = ref(false)
watch(
  () => data.value?.isFollowed,
  (value) => {
    followed.value = Boolean(value)
  },
  { immediate: true },
)
const actionPending = ref(false)
const actionError = ref('')
const actionMessage = ref('')
const noticeId = ref('')
const positionId = ref('')
const saving = ref(false)
const saveError = ref('')
const saved = ref(false)
let mounted = true
onBeforeUnmount(() => {
  mounted = false
})
const isGoal = computed(() =>
  Boolean(
    contest.value && goalData.value?.goal?.contest_id === contest.value.id,
  ),
)
watch(
  [() => goalData.value?.goal, () => contest.value?.id],
  () => {
    noticeId.value = isGoal.value ? goalData.value?.goal?.notice_id || '' : ''
    positionId.value = isGoal.value
      ? goalData.value?.goal?.position_id || ''
      : ''
  },
  { immediate: true },
)
const selectedGoalMatches = computed(
  () =>
    isGoal.value &&
    (goalData.value?.goal?.notice_id || '') === noticeId.value &&
    (goalData.value?.goal?.position_id || '') === positionId.value,
)
const notices = computed(() =>
  [...(contest.value?.study_notices ?? [])].sort(
    (a, b) =>
      (b.publication_date || '').localeCompare(a.publication_date || '') ||
      a.id.localeCompare(b.id),
  ),
)
async function toggleFollow() {
  if (!contest.value || actionPending.value) return
  actionPending.value = true
  actionError.value = ''
  actionMessage.value = ''
  try {
    const response = await $fetch<{ followed: boolean }>(
      `/api/study/contests/${contest.value.id}/follow`,
      { method: followed.value ? 'DELETE' : 'POST' },
    )
    if (mounted) {
      followed.value = response.followed
      actionMessage.value = response.followed
        ? 'Você está acompanhando este concurso.'
        : 'Você deixou de acompanhar este concurso. Seu objetivo de estudo foi mantido.'
    }
  } catch {
    if (mounted)
      actionError.value =
        'Não foi possível atualizar o acompanhamento. Tente novamente.'
  } finally {
    if (mounted) actionPending.value = false
  }
}
async function saveGoal() {
  if (
    !contest.value ||
    saving.value ||
    goalPending.value ||
    goalError.value ||
    selectedGoalMatches.value
  )
    return
  saving.value = true
  saveError.value = ''
  saved.value = false
  try {
    await $fetch('/api/study/goals', {
      method: 'POST',
      body: {
        contestId: contest.value.id,
        noticeId: noticeId.value || null,
        positionId: positionId.value || null,
      },
    })
    if (!mounted) return
    await refreshGoal()
    saved.value = true
  } catch {
    if (mounted)
      saveError.value =
        'Não foi possível salvar seu objetivo. Suas escolhas foram mantidas; tente novamente.'
  } finally {
    if (mounted) saving.value = false
  }
}
</script>
<template>
  <ContestShell>
    <nav class="contest-breadcrumb" aria-label="Caminho da página">
      <NuxtLink to="/app/concursos">Concursos</NuxtLink
      ><span aria-hidden="true">/</span><span>Detalhes do concurso</span>
    </nav>
    <div v-if="pending" class="contest-state" role="status">
      Carregando os detalhes do concurso…
    </div>
    <div v-else-if="error" class="contest-state" role="alert">
      <h1>
        {{
          error.statusCode === 404
            ? 'Concurso não encontrado.'
            : 'Não foi possível carregar este concurso.'
        }}
      </h1>
      <p>
        {{
          error.statusCode === 404
            ? 'Este concurso pode não estar mais disponível no catálogo.'
            : 'Verifique sua conexão e tente novamente.'
        }}
      </p>
      <div class="contest-actions">
        <button
          v-if="error.statusCode !== 404"
          class="contest-btn"
          @click="refresh()"
        >
          Tentar novamente</button
        ><NuxtLink class="contest-btn secondary" to="/app/concursos"
          >Voltar ao catálogo</NuxtLink
        >
      </div>
    </div>
    <template v-else-if="contest">
      <header class="contest-detail-hero">
        <span class="contest-kicker">{{
          contest.organization || 'CONCURSO PÚBLICO'
        }}</span>
        <h1>{{ contest.title }}</h1>
        <p class="contest-description">
          Seu ponto de partida para conhecer o concurso, escolher um objetivo e
          começar a praticar.
        </p>
        <div class="contest-actions">
          <button
            class="contest-btn"
            :disabled="actionPending"
            :aria-pressed="followed"
            @click="toggleFollow"
          >
            {{
              actionPending
                ? 'Salvando…'
                : followed
                  ? '✓ Deixar de acompanhar'
                  : '+ Acompanhar concurso'
            }}</button
          ><a class="contest-btn secondary" href="#contest-goal">{{
            isGoal ? 'Gerenciar meu objetivo' : 'Definir como objetivo'
          }}</a>
          <NuxtLink
            v-if="officialArchive"
            class="contest-btn secondary"
            :to="officialArchive"
            >Ver provas e gabaritos →</NuxtLink
          >
        </div>
        <dl class="contest-facts">
          <div>
            <dt>Banca organizadora</dt>
            <dd>{{ contest.exam_board || 'Não informada' }}</dd>
          </div>
          <div>
            <dt>Editais disponíveis</dt>
            <dd>{{ notices.length }}</dd>
          </div>
          <div>
            <dt>Cargos publicados</dt>
            <dd>{{ contest.study_positions.length }}</dd>
          </div>
        </dl>
      </header>
      <p v-if="actionMessage" class="contest-success" role="status">
        {{ actionMessage }}
      </p>
      <p v-if="actionError" class="contest-alert" role="alert">
        {{ actionError }}
      </p>
      <div class="contest-detail-layout">
        <div>
          <section class="contest-panel" aria-labelledby="contest-notices">
            <h2 id="contest-notices">Editais e conteúdo para estudar</h2>
            <p v-if="!notices.length">
              Ainda não há edital disponível para este concurso. Você pode
              acompanhá-lo e consultar o catálogo novamente mais tarde.
            </p>
            <article
              v-for="notice in notices"
              :key="notice.id"
              class="contest-notice"
            >
              <h3>{{ notice.title }}</h3>
              <p>
                Versão {{ notice.version }} ·
                {{ contestDate(notice.publication_date) }}
              </p>
              <a
                v-if="noticeSource(notice.source_url)"
                class="contest-text-link"
                :href="noticeSource(notice.source_url)!"
                target="_blank"
                rel="noopener noreferrer"
                >Consultar fonte do edital →
                <span class="visually-hidden">(abre em nova aba)</span></a
              >
              <p v-else>Link da fonte ainda não informado.</p>
              <h4>Disciplinas do edital</h4>
              <ul
                v-if="
                  notice.study_notice_subjects?.some(
                    (item) => item.study_subjects,
                  )
                "
                class="contest-subjects"
              >
                <template
                  v-for="item in [...(notice.study_notice_subjects ?? [])].sort(
                    (a, b) => a.position - b.position,
                  )"
                  :key="item.study_subjects?.id || item.position"
                  ><li v-if="item.study_subjects">
                    <NuxtLink
                      :to="{
                        path: '/app/questoes',
                        query: {
                          contestId: contest.id,
                          subjectId: item.study_subjects.id,
                        },
                      }"
                      >{{ item.study_subjects.name }} →</NuxtLink
                    >
                  </li></template
                >
              </ul>
              <p v-else>
                As disciplinas deste edital ainda não foram informadas.
              </p>
            </article>
          </section>
          <section class="contest-panel" aria-labelledby="contest-positions">
            <h2 id="contest-positions">Cargos publicados</h2>
            <p v-if="!contest.study_positions.length">
              Ainda não há cargos informados para este concurso.
            </p>
            <article
              v-for="position in contest.study_positions"
              :key="position.id"
              class="contest-position"
            >
              <h3>{{ position.title }}</h3>
              <p>
                {{ position.education_level || 'Escolaridade não informada'
                }}<span v-if="position.area"> · {{ position.area }}</span>
              </p>
            </article>
          </section>
          <section class="contest-panel">
            <h2>Prepare-se com as informações certas.</h2>
            <p>
              O catálogo organiza sua preparação. Acompanhar um concurso não
              ativa notificações nem significa que suas inscrições estão
              abertas. Confira datas, vagas e regras na fonte do órgão.
            </p>
          </section>
        </div>
        <aside class="contest-detail-aside" aria-label="Organizar preparação">
          <section id="contest-goal" class="contest-panel">
            <span class="contest-kicker">SUA PREPARAÇÃO</span>
            <h2 style="margin-top: 12px">
              {{
                isGoal
                  ? 'Este é seu objetivo atual'
                  : 'Dê direção aos seus estudos'
              }}
            </h2>
            <p>
              Escolha edital e cargo se já souber quais seguir. Ambos são
              opcionais.
            </p>
            <div v-if="goalError" class="contest-alert" role="alert">
              Não foi possível consultar seu objetivo atual.
              <button class="contest-btn secondary" @click="refreshGoal()">
                Consultar novamente
              </button>
            </div>
            <p v-else-if="goalPending" role="status">
              Consultando seu objetivo…
            </p>
            <form v-else class="contest-goal-form" @submit.prevent="saveGoal">
              <label for="goal-notice"
                >Edital<select
                  id="goal-notice"
                  v-model="noticeId"
                  :disabled="saving"
                >
                  <option value="">Sem edital específico</option>
                  <option
                    v-for="notice in notices"
                    :key="notice.id"
                    :value="notice.id"
                  >
                    {{ notice.title }} · {{ notice.version }}
                  </option>
                </select></label
              ><label for="goal-position"
                >Cargo<select
                  id="goal-position"
                  v-model="positionId"
                  :disabled="saving"
                >
                  <option value="">Sem cargo específico</option>
                  <option
                    v-for="position in contest.study_positions"
                    :key="position.id"
                    :value="position.id"
                  >
                    {{ position.title }}
                  </option>
                </select></label
              >
              <p v-if="goalData?.goal && !isGoal">
                Salvar substituirá seu objetivo atual. Seu histórico de estudo
                será mantido.
              </p>
              <button
                class="contest-btn"
                :disabled="saving || selectedGoalMatches"
                type="submit"
              >
                {{
                  saving
                    ? 'Salvando objetivo…'
                    : selectedGoalMatches
                      ? '✓ Objetivo definido'
                      : isGoal
                        ? 'Atualizar meu objetivo'
                        : 'Salvar como meu objetivo'
                }}
              </button>
            </form>
            <p v-if="saveError" class="contest-alert" role="alert">
              {{ saveError }}
            </p>
            <p v-if="saved" class="contest-success" role="status">
              Objetivo salvo. Você já pode começar a estudar.
            </p>
          </section>
          <section class="contest-panel">
            <h2>Seu próximo passo</h2>
            <template v-if="officialArchive"
              ><p>
                Este concurso tem um acervo de provas anteriores. Os PDFs ainda
                não são questões do modo interativo.
              </p>
              <NuxtLink class="contest-btn" :to="officialArchive"
                >Abrir acervo oficial →</NuxtLink
              ></template
            >
            <p>
              Pratique com as questões disponíveis ou monte um simulado deste
              concurso.
            </p>
            <div class="contest-goal-form">
              <NuxtLink
                class="contest-btn"
                :to="{
                  path: '/app/questoes',
                  query: { contestId: contest.id },
                }"
                >Resolver questões →</NuxtLink
              ><NuxtLink
                class="contest-btn secondary"
                :to="{ path: '/app/provas', query: { contestId: contest.id } }"
                >Montar simulado →</NuxtLink
              >
            </div>
          </section>
        </aside>
      </div>
    </template>
  </ContestShell>
</template>
