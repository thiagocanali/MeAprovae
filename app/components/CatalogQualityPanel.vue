<script setup lang="ts">
import type { CatalogQualityResponse } from '~~/shared/domain/questions/exam-catalog-quality'
import { catalogUiError } from '~~/shared/domain/questions/exam-catalog-ui'
const props = defineProps<{ endpoint: string; refreshKey: number }>(),
  page = ref(1)
const { data, error, pending, refresh } =
  await useFetch<CatalogQualityResponse>(() => props.endpoint, {
    query: computed(() => ({ page: page.value, pageSize: 10 })),
  })
watch(
  () => props.refreshKey,
  () => refresh(),
)
const labels: Record<string, string> = {
  'numeric-variants':
    'Há enunciados com estrutura semelhante e variações numéricas. Confira se treinam habilidades diferentes.',
  'missing-topics': 'Há questões sem assunto informado.',
  'topic-concentration':
    'Pelo menos 75% das questões se concentram em um único assunto.',
  'target-mismatch': 'A composição diverge das metas por matéria.',
}
</script>
<template>
  <section class="study-card" aria-label="Qualidade do catálogo">
    <h2>Diversidade e repetição</h2>
    <p class="study-muted">
      Análise da composição salva. Os alertas ajudam a revisão editorial; não
      comprovam equivalência pedagógica, dificuldade ou direitos.
    </p>
    <p v-if="pending" role="status">Analisando composição…</p>
    <p v-else-if="error" class="study-error" role="alert">
      {{ catalogUiError(error) }}
      <button type="button" @click="refresh()">Repetir análise</button>
    </p>
    <template v-else-if="data">
      <p v-if="!data.questionCount">
        Adicione e salve questões para analisar diversidade e sobreposição.
      </p>
      <template v-else>
        <p v-if="!data.hasExplicitTargets" class="study-muted">
          Sem metas explícitas por matéria. Planeje a distribuição para conferir
          a cobertura pretendida.
        </p>
        <ul v-if="data.alerts.length" class="catalog-issues">
          <li v-for="alert in data.alerts" :key="alert">
            {{ labels[alert] || alert }}
          </li>
        </ul>
        <p v-else>
          Nenhum alerta pelas regras atuais. Isso não substitui revisão
          editorial.
        </p>
        <ul>
          <li v-for="subject in data.diversity" :key="subject.subjectId">
            {{ subject.name }}: {{ subject.questionCount }} questão(ões)
            <ul>
              <li
                v-for="topic in subject.topics"
                :key="topic.topicId ?? 'missing'"
              >
                {{ topic.name }}: {{ topic.questionCount }}
              </li>
            </ul>
          </li>
        </ul>
        <h3>Sobreposição com outros modelos</h3>
        <p class="study-muted">
          Comparação por UUID de questão com a versão mais recente de cada outro
          modelo ({{ data.comparedModels }}). Versões anteriores e a própria
          linhagem são excluídas. A porcentagem usa as questões salvas desta
          versão.
        </p>
        <p v-if="!data.totalMatches">
          Nenhuma questão idêntica nos modelos comparados. Isso não exclui
          repetição de habilidades.
        </p>
        <ul v-else class="catalog-versions">
          <li v-for="overlap in data.overlaps" :key="overlap.modelId">
            <NuxtLink
              :to="`/admin/simulados/${overlap.modelId}/${overlap.version}`"
              >{{ overlap.title }} · versão {{ overlap.version }}</NuxtLink
            >
            <p>
              {{ overlap.sharedCount }} questão(ões) em comum ·
              {{ overlap.currentCoveragePercent }}% desta composição.
            </p>
          </li>
        </ul>
        <nav
          v-if="data.totalMatches"
          class="study-actions"
          aria-label="Paginação de sobreposição"
        >
          <button
            type="button"
            class="study-secondary-button"
            :disabled="page === 1"
            @click="page--"
          >
            Sobreposições anteriores</button
          ><span>Página {{ page }} · {{ data.totalMatches }} modelo(s)</span
          ><button
            type="button"
            class="study-secondary-button"
            :disabled="!data.hasMore"
            @click="page++"
          >
            Mais sobreposições
          </button>
        </nav>
      </template>
    </template>
  </section>
</template>
