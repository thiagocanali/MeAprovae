<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { examChartPoints, type PerformanceFilters, type PerformanceOverview } from '~~/shared/domain/questions/performance'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Meu desempenho | Me Aprovaê' })
const period = ref<PerformanceFilters['days']>(30)
const timezone = ref<PerformanceFilters['timezone']>('America/Sao_Paulo')
const { data, pending, error, refresh } = await useFetch<PerformanceOverview>('/api/study/performance', {
  query: computed(() => ({ days: period.value, timezone: timezone.value })),
})
const maximum = computed(() => Math.max(1, ...(data.value?.days.map(day => day.attempts) ?? [])))
const examPoints = computed(() => examChartPoints(data.value?.recentExams ?? []))
const polyline = computed(() => examPoints.value.map(point => `${point.x},${point.y}`).join(' '))
const calendarLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
function examDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: data.value?.timezone ?? timezone.value }).format(new Date(date))
}
</script>

<template>
  <main class="study-page">
    <StudentNavigation />
    <section class="study-content">
      <p class="auth-eyebrow">SUA EVOLUÇÃO</p><h1>Meu desempenho</h1>
      <p class="auth-description">Acompanhe sua prática e os simulados encerrados no período escolhido. Todos os indicadores abaixo usam o mesmo período.</p>
      <div class="study-card performance-filters">
        <label for="performance-period">Período</label><select id="performance-period" v-model.number="period" :disabled="pending"><option :value="7">Últimos 7 dias</option><option :value="30">Últimos 30 dias</option><option :value="90">Últimos 90 dias</option></select>
        <label for="performance-timezone">Fuso dos dias</label><select id="performance-timezone" v-model="timezone" :disabled="pending"><option value="America/Sao_Paulo">Horário de São Paulo</option><option value="UTC">UTC</option></select>
        <button class="study-secondary-button" :disabled="pending" @click="refresh()">Atualizar indicadores</button>
      </div>
      <p v-if="pending" role="status">Carregando indicadores…</p>
      <div v-else-if="error" class="study-state" role="alert">Não foi possível carregar sua evolução. <button @click="refresh()">Tentar novamente</button></div>
      <template v-else-if="data">
        <div class="study-stats">
          <article class="study-card"><span>Tentativas no período</span><strong>{{ data.totals.attempts }}</strong></article>
          <article class="study-card"><span>Taxa de acerto</span><strong>{{ data.totals.attempts ? `${data.totals.accuracy}%` : '—' }}</strong></article>
          <article class="study-card"><span>Dias de prática</span><strong>{{ data.totals.activeDays }} / {{ data.periodDays }}</strong></article>
        </div>
        <p class="study-muted">Inclui todas as tentativas registradas no período, inclusive repetições e respostas de simulados. O dia atual ainda está em andamento.</p>
        <div v-if="!data.totals.attempts" class="study-empty"><h2>Sua evolução começa com uma questão.</h2><NuxtLink to="/app/questoes" class="study-link">Começar a praticar →</NuxtLink></div>
        <figure v-else class="study-card">
          <figcaption>Prática diária — últimos {{ data.periodDays }} dias</figcaption>
          <p class="study-muted">Verde: acertos · Amarelo: erros. Maior volume diário: {{ maximum }} tentativas.</p>
          <div class="performance-chart" :style="{ gap: data.periodDays > 30 ? '1px' : '3px' }" role="img" aria-label="Gráfico diário de acertos e erros. Valores completos na tabela abaixo.">
            <div v-for="day in data.days" :key="day.date" class="performance-column" :title="`${day.date}: ${day.attempts} tentativas, ${day.correct} acertos`">
              <span class="wrong-volume" :style="{ height: `${(day.attempts - day.correct) / maximum * 100}%` }"></span><span class="correct-volume" :style="{ height: `${day.correct / maximum * 100}%` }"></span>
            </div>
          </div>
          <div class="chart-range" aria-hidden="true"><span>{{ calendarLabel(data.days[0]?.date ?? '') }}</span><span>{{ calendarLabel(data.days.at(-1)?.date ?? '') }}</span></div>
          <details><summary>Consultar valores da prática diária</summary><div class="table-scroll" tabindex="0" role="region" aria-label="Tabela da prática diária"><table><caption>Tentativas por dia — {{ data.timezone === 'UTC' ? 'UTC' : 'São Paulo' }}</caption><thead><tr><th scope="col">Data</th><th scope="col">Tentativas</th><th scope="col">Acertos</th><th scope="col">Taxa</th></tr></thead><tbody><tr v-for="day in data.days" :key="day.date"><th scope="row">{{ day.date }}</th><td>{{ day.attempts }}</td><td>{{ day.correct }}</td><td>{{ day.attempts ? `${day.accuracy}%` : '—' }}</td></tr></tbody></table></div></details>
        </figure>
        <section class="study-section">
          <h2>Evolução nos simulados</h2>
          <p class="study-muted">Resultados concluídos ou com prazo encerrado dentro do período. Simulados em andamento não entram na média.</p>
          <div class="study-stats"><article class="study-card"><span>Simulados encerrados</span><strong>{{ data.examSummary.count }}</strong></article><article class="study-card"><span>Média das notas</span><strong>{{ data.examSummary.averageScore === null ? '—' : `${data.examSummary.averageScore}%` }}</strong></article><article class="study-card"><span>Melhor nota</span><strong>{{ data.examSummary.bestScore === null ? '—' : `${data.examSummary.bestScore}%` }}</strong></article></div>
          <div v-if="!data.examSummary.count" class="study-empty"><p>Nenhum simulado encerrado neste período.</p><NuxtLink to="/app/provas" class="study-link">Escolher um simulado →</NuxtLink></div>
          <figure v-else class="study-card">
            <figcaption>Até 20 resultados mais recentes, do mais antigo para o mais novo</figcaption>
            <svg class="exam-chart" viewBox="0 0 600 220" role="img" aria-labelledby="exam-chart-title">
              <title id="exam-chart-title">Notas dos simulados numa escala fixa de zero a cem por cento. Consulte os valores na tabela.</title>
              <line x1="36" y1="20" x2="585" y2="20" class="chart-guide"/><line x1="36" y1="100" x2="585" y2="100" class="chart-guide"/><line x1="36" y1="180" x2="585" y2="180" class="chart-guide"/>
              <text x="0" y="24">100%</text><text x="4" y="104">50%</text><text x="10" y="184">0%</text>
              <polyline v-if="examPoints.length > 1" :points="polyline" fill="none" stroke="#8ee6ba" stroke-width="3"/>
              <circle v-for="point in examPoints" :key="point.id" :cx="point.x" :cy="point.y" r="4" fill="#8ee6ba"><title>{{ point.score }}%</title></circle>
            </svg>
            <p v-if="data.recentExams.length === 1" class="study-muted">Há um resultado disponível. Mais simulados permitirão acompanhar a evolução ao longo do tempo.</p>
            <p class="study-muted">A média dá o mesmo peso a cada simulado. As notas incluem questões não respondidas; conteúdo e dificuldade podem variar entre sessões.</p>
            <details open><summary>Consultar resultados e abrir a revisão</summary><div class="table-scroll" tabindex="0" role="region" aria-label="Tabela dos resultados de simulados"><table><caption>Últimos resultados do período</caption><thead><tr><th scope="col">Encerramento</th><th scope="col">Nota</th><th scope="col">Respostas</th><th scope="col">Revisão</th></tr></thead><tbody><tr v-for="exam in data.recentExams" :key="exam.id"><th scope="row">{{ examDate(exam.finishedAt) }}</th><td>{{ exam.score }}%</td><td>{{ exam.answeredCount }}/{{ exam.questionCount }}</td><td><NuxtLink :to="`/app/simulados/${exam.id}`">Ver resultado</NuxtLink></td></tr></tbody></table></div></details>
          </figure>
        </section>
        <section class="study-section">
          <h2>Disciplinas que merecem atenção</h2><p class="study-muted">Tentativas do período, da menor para a maior taxa de acerto. Repetições contam como novas tentativas.</p>
          <p v-if="!data.performanceBySubject.length">Nenhuma disciplina com tentativas neste período.</p>
          <article v-for="subject in data.performanceBySubject" :key="subject.subjectId ?? 'unavailable'" class="study-card">
            <h3>{{ subject.subjectName }}</h3><p>{{ subject.accuracy }}% de acerto · {{ subject.correctAnswers }} acertos em {{ subject.attempts }} tentativas</p><meter min="0" max="100" :value="subject.accuracy" :aria-label="`Taxa de acerto em ${subject.subjectName}`">{{ subject.accuracy }}%</meter>
            <NuxtLink v-if="subject.subjectId" :to="{ path: '/app/questoes', query: { subjectId: subject.subjectId } }" class="study-link">Praticar disciplina →</NuxtLink><p v-else class="study-muted">Tentativas preservadas de questões cujo conteúdo não está mais disponível no catálogo.</p>
          </article>
          <NuxtLink to="/app/erros" class="study-link">Revisar minhas questões erradas →</NuxtLink>
        </section>
      </template>
    </section>
  </main>
</template>
<style scoped>
figure.study-card { margin: 0; min-width: 0; }
.study-section { min-width: 0; }
.table-scroll { max-width: 100%; overflow-x: auto; }
.performance-filters { display: grid; gap: 10px; }
.performance-filters select { width: 100%; min-width: 0; padding: 10px; font: inherit; }
.performance-chart { display: flex; height: 180px; margin: 24px 0 8px; }
.performance-column { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; background: rgba(255,255,255,.04); }
.performance-column span { display: block; width: 100%; }
.correct-volume { background: #8ee6ba; }.wrong-volume { background: #e8bc68; }
.chart-range { display: flex; justify-content: space-between; margin-bottom: 16px; }
.exam-chart { width: 100%; height: auto; margin: 20px 0; }.exam-chart text { fill: #b8c5d8; font-size: 12px; }.chart-guide { stroke: #78899d; stroke-opacity: .4; }
meter { width: 100%; height: 24px; }
table { width: 100%; text-align: left; border-collapse: collapse; }th, td { padding: 8px 4px; border-bottom: 1px solid #78899d; }
</style>
