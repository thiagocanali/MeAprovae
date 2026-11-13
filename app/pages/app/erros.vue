<script setup lang="ts">
import authMiddleware from '~/middleware/auth'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Revisar questões erradas | Me Aprovaê' })

interface ReviewQuestion {
  questionId: string
  statement: string
  subjectName: string
  sourceLabel: string | null
  sourceYear: number | null
  lastAttemptAt: string
  options: Array<{ id: string; label: string; content: string; position: number }>
}
const { data, pending, error, refresh } = await useFetch<{ questions: ReviewQuestion[] }>('/api/study/questions/wrong')
</script>

<template>
  <main class="study-page">
    <StudentNavigation />
    <section class="study-content">
      <p class="auth-eyebrow">REVISÃO DE ERROS</p>
      <h1>Questões para revisar</h1>
      <p class="auth-description">Aqui aparecem questões cuja tentativa mais recente foi incorreta. Quando você acertar uma questão em uma nova tentativa, ela sai desta fila.</p>
      <p v-if="pending" class="study-state">Carregando questões para revisão…</p>
      <div v-else-if="error" class="study-state study-error" role="alert">
        Não foi possível carregar a fila de revisão. Confirme se a migração 0005 foi aplicada.
        <button class="study-secondary-button" @click="refresh()">Tentar novamente</button>
      </div>
      <div v-else-if="!data?.questions.length" class="study-empty">
        <h2>Nenhuma questão pendente de revisão.</h2>
        <p>Quando a tentativa mais recente de uma questão for incorreta, ela aparecerá aqui.</p>
        <NuxtLink class="study-link" to="/app/questoes">Resolver questões →</NuxtLink>
      </div>
      <div v-else class="study-section">
        <article v-for="question in data.questions" :key="question.questionId" class="study-card">
          <p class="study-muted">{{ question.subjectName }}<span v-if="question.sourceLabel"> · {{ question.sourceLabel }}</span><span v-if="question.sourceYear"> · {{ question.sourceYear }}</span></p>
          <h2>{{ question.statement }}</h2>
          <p class="study-muted">Último erro: {{ new Date(question.lastAttemptAt).toLocaleString('pt-BR') }}</p>
          <NuxtLink class="study-link" :to="{ path: '/app/questoes', query: { questionId: question.questionId } }">Tentar novamente →</NuxtLink>
        </article>
      </div>
    </section>
  </main>
</template>
