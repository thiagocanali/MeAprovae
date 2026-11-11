<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Meu desempenho | Me Aprovaê' })
const { data, pending, error, refresh } = await useFetch('/api/study/performance')
const { data: dashboard, error: subjectError, refresh: refreshSubjects } = await useFetch<{
  performanceBySubject: Array<{ subjectId: string; subjectName: string; attempts: number; accuracy: number }>
}>('/api/study/dashboard')
const total = computed(() => data.value?.days.reduce((sum, day) => sum + day.attempts, 0) ?? 0)
const correct = computed(() => data.value?.days.reduce((sum, day) => sum + day.correct, 0) ?? 0)
const accuracy = computed(() => total.value ? Math.round(correct.value / total.value * 100) : 0)
const activeDays = computed(() => data.value?.days.filter(day => day.attempts > 0).length ?? 0)
const maximum = computed(() => Math.max(1, ...data.value?.days.map(day => day.attempts) ?? []))
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav aria-label="Navegação do estudante"><NuxtLink to="/app/questoes">Questões</NuxtLink><NuxtLink to="/app/provas">Simulados</NuxtLink><NuxtLink to="/app/historico">Histórico</NuxtLink></nav>
    </header>
    <section class="study-content">
      <p class="auth-eyebrow">SUA EVOLUÇÃO</p><h1>Meu desempenho</h1>
      <p class="auth-description">Acompanhe sua prática nos últimos 30 dias. Dias calculados em UTC.</p>
      <p v-if="pending" role="status">Carregando indicadores…</p>
      <div v-else-if="error" class="study-state" role="alert">Não foi possível carregar sua evolução. <button @click="refresh()">Tentar novamente</button></div>
      <template v-else-if="data">
        <p v-if="data.sampled" role="status">Indicadores calculados sobre as {{ data.sampleSize }} tentativas mais recentes de {{ data.totalInPeriod }} no período.</p>
        <div class="study-stats">
          <article class="study-card"><span>Tentativas no período</span><strong>{{ total }}</strong></article>
          <article class="study-card"><span>Taxa de acerto</span><strong>{{ accuracy }}%</strong></article>
          <article class="study-card"><span>Dias de prática</span><strong>{{ activeDays }} / 30</strong></article>
        </div>
        <div v-if="!total" class="study-empty"><h2>Sua evolução começa com uma questão.</h2><NuxtLink to="/app/questoes" class="study-link">Começar a praticar →</NuxtLink></div>
        <figure v-else class="study-card">
          <figcaption>Volume diário de tentativas — últimos 30 dias</figcaption>
          <div class="performance-chart" role="img" aria-label="Gráfico de tentativas por dia. Valores disponíveis na tabela abaixo.">
            <div v-for="day in data.days" :key="day.date" class="performance-column" :title="`${day.date}: ${day.attempts} tentativas`">
              <span :style="{ height: `${day.attempts / maximum * 100}%` }"></span>
            </div>
          </div>
          <details><summary>Consultar valores do gráfico</summary>
            <table><caption>Tentativas e acertos por dia (UTC)</caption><thead><tr><th scope="col">Data</th><th scope="col">Tentativas</th><th scope="col">Acertos</th><th scope="col">Taxa</th></tr></thead>
              <tbody><tr v-for="day in data.days" :key="day.date"><th scope="row">{{ day.date }}</th><td>{{ day.attempts }}</td><td>{{ day.correct }}</td><td>{{ day.attempts ? `${day.accuracy}%` : '—' }}</td></tr></tbody>
            </table>
          </details>
        </figure>
      </template>
      <section class="study-section">
        <h2>Disciplinas que merecem atenção</h2><p class="study-muted">Todo o histórico, da menor para a maior taxa de acerto. Repetições contam como novas tentativas.</p>
        <p v-if="subjectError" role="alert">Não foi possível carregar disciplinas. <button @click="refreshSubjects()">Tentar novamente</button></p>
        <article v-for="subject in dashboard?.performanceBySubject" :key="subject.subjectId" class="study-card">
          <h3>{{ subject.subjectName }}</h3><p>{{ subject.accuracy }}% de acerto · {{ subject.attempts }} tentativas</p>
          <meter min="0" max="100" :value="subject.accuracy" :aria-label="`Taxa de acerto em ${subject.subjectName}`">{{ subject.accuracy }}%</meter>
          <NuxtLink :to="{ path: '/app/questoes', query: { subjectId: subject.subjectId } }" class="study-link">Praticar disciplina →</NuxtLink>
        </article>
        <NuxtLink to="/app/erros" class="study-link">Revisar minhas questões erradas →</NuxtLink>
      </section>
    </section>
  </main>
</template>

<style scoped>
.performance-chart { display: flex; align-items: end; gap: 3px; height: 180px; margin: 24px 0; }
.performance-column { flex: 1; height: 100%; display: flex; align-items: end; background: #e8eef5; }
.performance-column span { display: block; width: 100%; background: #246b67; }
meter { width: 100%; height: 24px; }
table { width: 100%; text-align: left; border-collapse: collapse; }
th, td { padding: 8px 4px; border-bottom: 1px solid #d5dde5; }
</style>
