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
  'declared-family-repetition':
    'Mais de uma questão pertence à mesma família declarada no lote de origem. Confira a variedade de habilidades.',
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
        <h3>Famílias declaradas e estimativas</h3>
        <p class="study-muted">
          {{ data.knownFamilyQuestions }} questão(ões) com família identificada
          no manifesto de origem; {{ data.unknownFamilyQuestions }} sem
          classificação atual utilizável. Famílias ambíguas ou de questões
          editadas não são aproveitadas. A origem declara a classificação; isso
          não comprova equivalência pedagógica.
        </p>
        <ul v-if="data.declaredFamilies.length">
          <li v-for="group in data.declaredFamilies" :key="group.source.key">
            <strong>{{ group.source.family }}</strong> ·
            {{ group.questionIds.length }} questão(ões)
            <details>
              <summary>Procedência da família</summary>
              <p>{{ group.source.releaseName }}</p>
              <code class="catalog-hash">{{ group.source.contentSha256 }}</code>
            </details>
          </li>
        </ul>
        <p v-if="!data.learningObjectivesAvailable" class="study-muted">
          Objetivos de aprendizagem não estão cadastrados com evidência
          suficiente. Não são inferidos do texto ou da família. O alerta de
          variantes numéricas é apenas uma estimativa textual.
        </p>
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
          <li v-if="!data.overlaps.length">
            Não há sobreposições por ID nesta página.
          </li>
          <li v-for="overlap in data.overlaps" :key="overlap.modelId">
            <NuxtLink
              :to="`/admin/simulados/${overlap.modelId}/${overlap.version}`"
              >{{ overlap.title }} · versão {{ overlap.version }}</NuxtLink
            >
            <p v-if="overlap.nearDuplicate" class="catalog-issues">
              Coincidência de pelo menos 80% das questões de ambas as
              composições. Confira a necessidade de manter modelos quase iguais;
              a reutilização não é bloqueada automaticamente.
            </p>
            <p>
              {{ overlap.sharedCount }} questão(ões) em comum ·
              {{ overlap.currentCoveragePercent }}% desta composição.
            </p>
          </li>
        </ul>
        <h3>Sobreposição por família de origem</h3>
        <p class="study-muted">
          Independe da igualdade dos IDs. Considera somente famílias do mesmo
          lote e matéria, com procedência identificada; não une taxonomias de
          lotes diferentes.
        </p>
        <p v-if="!data.totalFamilyMatches">
          Nenhuma família declarada compartilhada foi encontrada entre as
          classificações disponíveis. Dados ausentes não provam diversidade.
        </p>
        <ul v-else class="catalog-versions">
          <li v-for="overlap in data.familyOverlaps" :key="overlap.modelId">
            <NuxtLink
              :to="`/admin/simulados/${overlap.modelId}/${overlap.version}`"
              >{{ overlap.title }} · versão {{ overlap.version }}</NuxtLink
            >
            <p>
              {{ overlap.sharedFamilyCount }} família(s) compartilhada(s) ·
              cobre(m) {{ overlap.coveragePercent }}% das questões desta
              composição.
            </p>
            <ul>
              <li
                v-for="family in overlap.families"
                :key="family.releaseName + ':' + family.family"
              >
                {{ family.releaseName }} / {{ family.family }}
              </li>
            </ul>
          </li>
        </ul>
        <nav
          v-if="data.totalMatches || data.totalFamilyMatches"
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
          ><span
            >Página {{ page }} · {{ data.totalMatches }} por IDs /
            {{ data.totalFamilyMatches }} por famílias. As duas listas usam a
            mesma página.</span
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
