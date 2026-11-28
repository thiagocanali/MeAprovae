<script setup lang="ts">
import type { ReviewQuestion } from '~~/shared/domain/questions/exam-catalog-review'
import { evidenceUrl } from '~~/shared/domain/questions/exam-catalog-review'
defineProps<{ questions: ReviewQuestion[] }>()
</script>
<template>
  <div class="catalog-question-preview">
    <details
      v-for="question in questions"
      :key="question.questionId"
      class="study-card"
    >
      <summary>
        Questão {{ question.position }} · {{ question.subjectName }}
      </summary>
      <p class="catalog-statement">{{ question.statement }}</p>
      <ol class="catalog-options">
        <li
          v-for="option in question.options"
          :key="option.id"
          :class="{ 'catalog-correct': option.id === question.correctOptionId }"
        >
          <strong>{{ option.label }}.</strong> {{ option.content }}
          <span v-if="option.id === question.correctOptionId">— gabarito</span>
        </li>
      </ol>
      <p v-if="!question.correctOptionId" class="study-muted">
        Gabarito pendente.
      </p>
      <h3>Explicação</h3>
      <p class="catalog-statement">
        {{ question.explanation || 'Explicação pendente.' }}
      </p>
      <p class="study-muted">
        {{ question.sourceLabel || 'Origem a conferir' }} ·
        {{
          question.status === 'draft'
            ? 'Rascunho'
            : question.status === 'archived'
              ? 'Arquivada'
              : 'Publicada'
        }}
        ·
        {{
          question.difficultyReviewed
            ? 'Dificuldade revisada'
            : 'Dificuldade pendente'
        }}
      </p>
      <a
        v-if="evidenceUrl(question.sourceUrl)"
        class="study-link"
        :href="evidenceUrl(question.sourceUrl) || undefined"
        target="_blank"
        rel="noopener noreferrer"
        >Consultar fonte ↗</a
      >
    </details>
  </div>
</template>
