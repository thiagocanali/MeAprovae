<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { COMPARISON_CONSENT_VERSION, type StudyComparison } from '~~/shared/domain/questions/comparison'
definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Comparar minha prática | Me Aprovaê' })
const { data, pending, error, refresh } = await useFetch<{ comparison: StudyComparison }>('/api/study/comparison')
const comparison = computed(() => data.value?.comparison)
const accepted = ref(false)
const saving = ref(false)
const message = ref('')
const choiceError = ref('')
const monthLabel = computed(() => comparison.value ? `${comparison.value.monthStart.slice(5, 7)}/${comparison.value.monthStart.slice(0, 4)}` : '')
async function participate(enabled: boolean) {
  if (saving.value || (enabled && !accepted.value)) return
  saving.value = true; choiceError.value = ''; message.value = ''
  try {
    await $fetch('/api/study/comparison/participation', { method: 'POST', body: { enabled, consentVersion: COMPARISON_CONSENT_VERSION } })
    accepted.value = false
    message.value = enabled ? 'Sua participação foi ativada.' : 'Sua participação foi desativada. Suas tentativas continuam no histórico privado.'
    await refresh()
  } catch { choiceError.value = 'Não foi possível salvar sua escolha. Tente novamente.' }
  finally { saving.value = false }
}
</script>

<template>
  <main class="study-page">
    <header class="study-header"><NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink><nav><NuxtLink to="/app/desempenho">Meu desempenho</NuxtLink><NuxtLink to="/app/questoes">Questões</NuxtLink></nav></header>
    <section class="study-content">
      <p class="auth-eyebrow">REFERÊNCIA DE PRÁTICA</p><h1>Comparar minha prática</h1>
      <p class="auth-description">Uma referência agregada de perfis que escolheram o mesmo concurso e responderam às mesmas 20 questões no mês. Não há nomes, posições individuais ou previsão de aprovação.</p>
      <p v-if="pending" role="status">Carregando sua participação…</p>
      <p v-else-if="error" class="study-error" role="alert">Não foi possível consultar a comparação. <button @click="refresh()">Tentar novamente</button></p>
      <template v-else-if="comparison">
        <article class="study-card"><h2>Como funciona</h2><ul><li>O caderno mensal usa 20 questões publicadas do concurso do seu objetivo, iguais para todos os participantes desse concurso. Não é uma prova específica de cargo.</li><li>Conta somente a primeira tentativa de cada questão no mês, pelo horário de São Paulo. Repetições no mesmo mês não substituem essa resposta.</li><li>A média só aparece com pelo menos {{ comparison.minimumPeers }} outros participantes que aderiram e completaram o mesmo caderno.</li><li>A média do grupo é arredondada para múltiplos de 5 pontos percentuais. A quantidade exata de participantes e resultados individuais não são exibidos.</li></ul><p>Participação opcional. Sair impede sua inclusão nas consultas seguintes, sem apagar seu histórico pessoal. A referência descreve prática; não é uma avaliação padronizada ou ranking competitivo.</p></article>
        <article v-if="!comparison.enabled" class="study-card">
          <h2>Você ainda não participa</h2><label class="consent-choice"><input v-model="accepted" type="checkbox" :disabled="saving"><span>Quero participar e permitir que minhas primeiras respostas de cada mês ao caderno de referência contribuam para a média agregada do mesmo concurso, inclusive as já registradas no mês atual. A participação continua até eu sair por este painel.</span></label><button class="study-primary-button" :disabled="!accepted || saving" @click="participate(true)">{{ saving ? 'Salvando…' : 'Participar da comparação' }}</button>
        </article>
        <template v-else>
          <article class="study-card"><h2>Participação ativa · {{ monthLabel }}</h2><p v-if="comparison.contestTitle">Objetivo: {{ comparison.contestTitle }}</p><button class="study-secondary-button" :disabled="saving" @click="participate(false)">{{ saving ? 'Salvando…' : 'Sair da comparação' }}</button><button class="study-secondary-button" :disabled="saving || pending" @click="refresh()">Atualizar referência</button></article>
          <div v-if="comparison.status === 'missing_goal'" class="study-empty"><h2>Defina seu objetivo</h2><p>A comparação depende de um objetivo ativo com concurso publicado.</p><NuxtLink class="study-link" to="/app/onboarding">Escolher objetivo →</NuxtLink></div>
          <div v-else-if="comparison.status === 'insufficient_questions'" class="study-empty"><h2>Caderno ainda indisponível</h2><p>Este objetivo precisa de pelo menos 20 questões publicadas com gabarito para formar a referência do mês.</p><NuxtLink class="study-link" to="/app/questoes">Continuar praticando →</NuxtLink></div>
          <div v-else-if="comparison.status === 'reference_unavailable'" class="study-empty"><h2>Referência temporariamente indisponível</h2><p>Uma questão do caderno deixou de estar publicada. A comparação está oculta para preservar o mesmo conjunto de questões; consulte novamente mais tarde.</p></div>
          <template v-else>
            <article class="study-card"><h2>Seu caderno no mês</h2><p>{{ comparison.yourAnswered }} de {{ comparison.requiredQuestions }} questões respondidas pela primeira vez no período.</p><progress :value="comparison.yourAnswered" :max="comparison.requiredQuestions" aria-label="Questões de referência respondidas"></progress><p v-if="comparison.yourAccuracy !== null">Sua taxa de acerto nessas primeiras respostas: <strong>{{ comparison.yourAccuracy }}%</strong>.</p></article>
            <p v-if="comparison.status === 'incomplete_reference'" class="study-state">Complete o caderno de referência para consultar a média, quando houver grupo suficiente.</p>
            <p v-else-if="comparison.status === 'insufficient_group'" class="study-state">Seu caderno está completo, mas ainda não há grupo suficiente. A referência aparecerá quando houver pelo menos {{ comparison.minimumPeers }} outros participantes aptos. Nenhuma média foi estimada.</p>
            <section v-else-if="comparison.status === 'ready'" class="study-section"><h2>Você e o grupo de referência</h2><article class="study-card"><h3>Suas primeiras respostas</h3><strong>{{ comparison.yourAccuracy }}%</strong><meter min="0" max="100" :value="comparison.yourAccuracy ?? 0" aria-label="Sua taxa de acerto"></meter></article><article class="study-card"><h3>Média agregada do grupo</h3><strong>{{ comparison.peerAverage }}%</strong><meter min="0" max="100" :value="comparison.peerAverage ?? 0" aria-label="Média arredondada do grupo"></meter><p class="study-muted">Arredondada para múltiplos de 5 pontos percentuais, sem incluir você e sem divulgar resultados individuais.</p></article></section>
            <details class="study-card"><summary>Ver as 20 questões de referência</summary><ol class="reference-list"><li v-for="question in comparison.questions" :key="question.id"><p>{{ question.statementPreview }}</p><p>{{ question.answered ? 'Primeira resposta registrada neste mês' : 'Pendente neste mês' }}</p><NuxtLink class="study-link" :to="{ path: '/app/questoes', query: { questionId: question.id } }">{{ question.answered ? 'Praticar novamente' : 'Responder questão' }} →</NuxtLink></li></ol></details>
          </template>
        </template>
      </template>
      <p v-if="message" role="status">{{ message }}</p><p v-if="choiceError" class="study-error" role="alert">{{ choiceError }}</p>
    </section>
  </main>
</template>
<style scoped>
.consent-choice { display: flex; align-items: flex-start; gap: 12px; margin: 20px 0; line-height: 1.6; }.consent-choice input { flex: 0 0 auto; margin-top: 6px; }
progress, meter { display: block; width: 100%; height: 24px; margin-top: 12px; }
.reference-list { padding-left: 20px; }.reference-list li { margin: 20px 0; }
.study-section, .study-card { min-width: 0; }.study-card ul { padding-left: 20px; line-height: 1.6; }
</style>
