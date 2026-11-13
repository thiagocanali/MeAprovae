<script setup lang="ts">
import authMiddleware from '~/middleware/auth'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Defina seu objetivo | Me Aprovaê' })

interface Position { id: string; title: string; education_level: string | null; area: string | null }
interface Notice { id: string; title: string; version: string; publication_date: string | null }
interface Contest {
  id: string
  slug: string
  title: string
  organization: string | null
  study_notices: Notice[]
  study_positions: Position[]
}

const { data, pending, error, refresh } = await useFetch<{ contests: Contest[] }>('/api/study/contests')
const contestId = ref('')
const noticeId = ref('')
const positionId = ref('')
const saving = ref(false)
const saveError = ref('')
const selectedContest = computed(() => data.value?.contests.find((contest) => contest.id === contestId.value) ?? null)

watch(contestId, () => {
  noticeId.value = ''
  positionId.value = ''
})

async function saveGoal() {
  if (!contestId.value || saving.value) return
  saving.value = true
  saveError.value = ''
  try {
    await $fetch('/api/study/goals', {
      method: 'POST',
      body: {
        contestId: contestId.value,
        noticeId: noticeId.value || null,
        positionId: positionId.value || null,
      },
    })
    await navigateTo('/app')
  } catch (error: unknown) {
    saveError.value = error instanceof Error ? error.message : 'Não foi possível salvar seu objetivo.'
  } finally {
    saving.value = false
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
      <p class="auth-eyebrow">PRIMEIRO PASSO</p>
      <h1>Qual é o seu objetivo?</h1>
      <p class="auth-description">Escolha o concurso que deseja acompanhar. Esta etapa é opcional: você pode começar pelas questões e definir seu objetivo depois.</p>
      <p><NuxtLink class="study-link" to="/app/questoes">Começar pelas questões sem definir objetivo →</NuxtLink></p>
      <p v-if="pending" class="study-state">Carregando concursos publicados…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar o catálogo.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <div v-else-if="!data?.contests.length" class="study-empty">
        <h2>Ainda não há concursos publicados.</h2>
        <p>O catálogo está aguardando cadastro editorial. Seu objetivo só poderá ser salvo quando houver opções reais disponíveis.</p>
        <NuxtLink class="study-link" to="/app">Voltar à área do estudante →</NuxtLink>
      </div>
      <form v-else class="study-question-card study-form" @submit.prevent="saveGoal">
        <label for="contest">Concurso</label>
        <select id="contest" v-model="contestId" required>
          <option value="" disabled>Selecione um concurso</option>
          <option v-for="contest in data.contests" :key="contest.id" :value="contest.id">{{ contest.title }}</option>
        </select>

        <template v-if="selectedContest">
          <label for="notice">Edital (opcional)</label>
          <select id="notice" v-model="noticeId">
            <option value="">Ainda não escolhi um edital</option>
            <option v-for="notice in selectedContest.study_notices" :key="notice.id" :value="notice.id">{{ notice.title }} · v{{ notice.version }}</option>
          </select>

          <label for="position">Cargo (opcional)</label>
          <select id="position" v-model="positionId">
            <option value="">Ainda não escolhi um cargo</option>
            <option v-for="position in selectedContest.study_positions" :key="position.id" :value="position.id">{{ position.title }}</option>
          </select>
        </template>

        <p v-if="saveError" class="auth-error" role="alert">{{ saveError }}</p>
        <button class="study-primary-button" type="submit" :disabled="!contestId || saving">
          {{ saving ? 'Salvando objetivo…' : 'Salvar meu objetivo' }}
        </button>
      </form>
    </section>
  </main>
</template>
