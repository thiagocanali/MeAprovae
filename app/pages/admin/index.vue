<script setup lang="ts">
import authMiddleware from '~/middleware/auth'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Administração editorial | Me Aprovaê' })

interface AdminOverview {
  role: 'owner' | 'editor'
  metrics: {
    contests: number
    contestDrafts: number
    notices: number
    noticeDrafts: number
    positions: number
    positionDrafts: number
    questions: number
    questionDrafts: number
    publishedQuestions: number
    subjects: number
    topics: number
  }
  recentChanges: Array<{
    id: number
    actor_id: string | null
    action: 'INSERT' | 'UPDATE' | 'DELETE'
    table_name: string
    record_id: string | null
    occurred_at: string
  }>
}

const { data, error, refresh } = await useFetch<AdminOverview>('/api/admin/overview')
const date = (value: string) => new Date(value).toLocaleString('pt-BR')
const label = (table: string) => ({
  study_contests: 'Concurso',
  study_notices: 'Edital',
  study_positions: 'Cargo',
  study_subjects: 'Disciplina',
  study_topics: 'Assunto',
  study_notice_subjects: 'Disciplina do edital',
  study_questions: 'Questão',
  study_question_options: 'Alternativa',
  study_question_answer_keys: 'Gabarito',
}[table] || table)
</script>

<template>
  <main class="student-home">
    <header class="student-header">
      <NuxtLink class="auth-brand" to="/">Me Aprovaê</NuxtLink>
      <nav class="admin-nav">
        <NuxtLink class="study-link" to="/app">Área do estudante</NuxtLink>
      </nav>
    </header>

    <section class="student-welcome">
      <p class="auth-eyebrow">PAINEL ADMINISTRATIVO · {{ data?.role === 'owner' ? 'PROPRIETÁRIO' : 'EDITOR' }}</p>
      <h1>Gestão editorial</h1>
      <p class="auth-description">Gerencie a estrutura de concursos e conteúdos de estudo. Toda alteração editorial autorizada fica registrada no histórico.</p>

      <div v-if="error" class="study-state study-error" role="alert">
        <p>Não foi possível acessar o painel. Sua conta precisa ter papel editorial e a migração 0006 precisa estar aplicada.</p>
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
        <NuxtLink class="study-link" to="/app">Voltar à área do estudante →</NuxtLink>
      </div>

      <template v-else-if="data">
        <div class="admin-metrics">
          <article class="study-card"><span class="study-muted">Concursos</span><strong>{{ data.metrics.contests }}</strong><small>{{ data.metrics.contestDrafts }} em rascunho</small></article>
          <article class="study-card"><span class="study-muted">Editais</span><strong>{{ data.metrics.notices }}</strong><small>{{ data.metrics.noticeDrafts }} em rascunho</small></article>
          <article class="study-card"><span class="study-muted">Cargos</span><strong>{{ data.metrics.positions }}</strong><small>{{ data.metrics.positionDrafts }} em rascunho</small></article>
          <article class="study-card"><span class="study-muted">Questões</span><strong>{{ data.metrics.questions }}</strong><small>{{ data.metrics.questionDrafts }} em rascunho</small></article>
          <article class="study-card"><span class="study-muted">Questões publicadas</span><strong>{{ data.metrics.publishedQuestions }}</strong><small>Disponíveis no estudo</small></article>
          <article class="study-card"><span class="study-muted">Disciplinas e assuntos</span><strong>{{ data.metrics.subjects }} / {{ data.metrics.topics }}</strong><small>Estrutura do catálogo</small></article>
        </div>

        <section class="study-section">
          <h2>Histórico editorial recente</h2>
          <div v-if="!data.recentChanges.length" class="student-empty">
            <p>Nenhuma alteração editorial registrada ainda.</p>
          </div>
          <ol v-else class="study-history">
            <li v-for="change in data.recentChanges" :key="change.id" class="study-history-item">
              <span class="study-dot-correct"></span>
              <div>
                <strong>{{ change.action }} · {{ label(change.table_name) }}</strong>
                <p class="study-muted">Registro {{ change.record_id || 'sem identificador' }} · {{ date(change.occurred_at) }}</p>
              </div>
            </li>
          </ol>
        </section>

        <section class="study-section student-empty">
          <p class="auth-eyebrow">PRÓXIMA ENTREGA</p>
          <h2>Editor de conteúdo</h2>
          <p>O controle de acesso e a auditoria estão preparados. Os formulários de criação, edição e publicação serão adicionados sobre essas permissões, sem permitir publicação de questões incompletas.</p>
        </section>
      </template>
    </section>
  </main>
</template>

<style scoped>
.admin-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-top: 28px; }
.admin-metrics .study-card { display: grid; gap: 9px; width: auto; transform: none; }
.admin-metrics strong { font-family: var(--font-display); font-size: 34px; }
.admin-metrics small { color: var(--color-muted); font-size: 12px; }
.admin-nav { display: flex; gap: 16px; }
.study-section { margin-top: 38px; }
.study-section h2 { font-family: var(--font-display); }
.study-history { display: grid; gap: 14px; padding: 0; list-style: none; }
.study-history-item { display: flex; gap: 13px; align-items: flex-start; padding: 15px; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; }
.study-history-item strong { font-size: 14px; }
.study-history-item p { margin: 5px 0 0; font-size: 12px; }
.study-dot-correct { flex: 0 0 8px; height: 8px; margin-top: 6px; border-radius: 50%; background: var(--color-primary); }
.study-muted { color: var(--color-muted); }
.student-empty { margin-top: 24px; padding: 24px; border: 1px solid rgba(255,255,255,.1); border-radius: 16px; background: rgba(255,255,255,.025); }
.study-state { margin-top: 24px; padding: 18px; border-radius: 12px; }
.study-error { border: 1px solid rgba(255,120,120,.25); color: #ffb6b6; }
.study-secondary-button { margin-right: 12px; padding: 9px 13px; border: 1px solid rgba(255,255,255,.18); border-radius: 8px; color: inherit; background: transparent; }
@media (max-width: 640px) { .student-header { align-items: flex-start; gap: 12px; } }
</style>
