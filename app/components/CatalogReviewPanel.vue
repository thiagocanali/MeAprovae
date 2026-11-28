<script setup lang="ts">
import {
  catalogUiError,
  catalogIssueLabels,
} from '~~/shared/domain/questions/exam-catalog-ui'
import {
  parseCatalogReview,
  REVIEW_ATTESTATION_VERSION,
  type ReviewContext,
  type ReviewInput,
  type ReviewRights,
  type RightsBasis,
} from '~~/shared/domain/questions/exam-catalog-review'
const props = defineProps<{
  context: ReviewContext
  endpoint: string
  blocked?: boolean
}>()
const emit = defineEmits<{ saved: []; busy: [boolean]; dirty: [boolean] }>()
const notes = ref(''),
  decision = ref<ReviewInput['decision']>('changes_requested'),
  rights = ref<ReviewRights[]>([]),
  message = ref(''),
  success = ref(''),
  busy = ref(false),
  requestId = ref('')
const checks = reactive({
  content: false,
  answers: false,
  explanations: false,
  rights: false,
  independent: false,
})
const declarations = [
  { key: 'content', label: 'Conferi enunciados e composição desta versão.' },
  {
    key: 'answers',
    label: 'Conferi alternativas e gabaritos de todas as questões.',
  },
  {
    key: 'explanations',
    label: 'Conferi as explicações e sua coerência com os gabaritos.',
  },
  {
    key: 'rights',
    label: 'Conferi e registrei a base de direitos de cada questão.',
  },
  {
    key: 'independent',
    label:
      'Realizei pessoalmente esta revisão e não participei da edição do conteúdo.',
  },
] as const
const bases: Array<{ value: RightsBasis; label: string }> = [
  { value: 'unverified', label: 'Direitos ainda não verificados' },
  { value: 'original', label: 'Autoral original' },
  { value: 'licensed', label: 'Uso licenciado' },
  { value: 'public-domain', label: 'Domínio público fundamentado' },
]
function reset() {
  notes.value = ''
  decision.value = 'changes_requested'
  requestId.value = ''
  Object.assign(checks, {
    content: false,
    answers: false,
    explanations: false,
    rights: false,
    independent: false,
  })
  rights.value = props.context.snapshot.questions.map((q) => ({
    questionId: q.questionId,
    basis: 'unverified',
    evidence: '',
    sourceUrl: q.sourceUrl ?? null,
  }))
}
watch(
  () => props.context.fingerprint,
  () => {
    reset()
    message.value = ''
    success.value = ''
  },
  { immediate: true },
)
const dirty = computed(
  () =>
    !!notes.value ||
    Object.values(checks).some(Boolean) ||
    rights.value.some(
      (item, index) =>
        !!item.evidence ||
        item.basis !== 'unverified' ||
        (item.sourceUrl || '') !==
          (props.context.snapshot.questions[index]?.sourceUrl || ''),
    ),
)
watch(dirty, (value) => emit('dirty', value), { immediate: true })
const enabled = computed(
  () =>
    !props.blocked &&
    props.context.independentReviewer &&
    props.context.snapshot.status === 'in_review',
)
async function submit() {
  if (busy.value || !enabled.value) return
  requestId.value ||= crypto.randomUUID()
  const body = parseCatalogReview({
    requestId: requestId.value,
    expectedRevision: props.context.snapshot.editRevision,
    expectedFingerprint: props.context.fingerprint,
    decision: decision.value,
    notes: notes.value,
    rights: rights.value,
    attestations: { ...checks },
    attestationVersion: REVIEW_ATTESTATION_VERSION,
  })
  if (!body) {
    message.value =
      'Registre notas e evidências por questão. Uma aprovação exige todas as declarações e direitos verificados; uso licenciado ou domínio público exige URL.'
    return
  }
  busy.value = true
  emit('busy', true)
  message.value = ''
  success.value = ''
  try {
    await $fetch(props.endpoint, { method: 'POST', body })
    reset()
    success.value = 'Parecer registrado. Nenhum conteúdo foi publicado.'
    emit('saved')
  } catch (cause) {
    message.value = catalogUiError(cause)
  } finally {
    busy.value = false
    emit('busy', false)
  }
}
</script>
<template>
  <div>
    <p v-if="context.snapshot.status !== 'in_review'" class="study-state">
      Salve a composição e solicite revisão antes de registrar um parecer.
    </p>
    <p v-else-if="!context.independentReviewer" class="study-state">
      O parecer exige um revisor independente dos autores e editores
      identificados no banco. Você pode consultar o conteúdo abaixo.
    </p>
    <div v-if="context.latestReview" class="study-card">
      <h3>
        Último parecer:
        {{
          context.latestReview.decision === 'approved'
            ? 'aprovado editorialmente'
            : 'ajustes solicitados'
        }}
      </h3>
      <p>{{ context.latestReview.notes }}</p>
      <p class="study-muted">
        {{
          context.latestReview.isCurrent && !blocked
            ? 'Corresponde ao conteúdo atual.'
            : 'Parecer histórico: não corresponde à revisão atual ou perdeu elegibilidade.'
        }}
        Publicação indisponível.
      </p>
    </div>
    <h3>Conteúdo para conferência</h3>
    <p class="study-muted">
      Confira cada questão, gabarito e explicação antes de declarar sua revisão.
      A fonte consultada, por si só, não comprova permissão de reprodução.
    </p>
    <ul v-if="context.issues.length" class="catalog-issues">
      <li v-for="issue in context.issues" :key="issue">
        {{ catalogIssueLabels[issue] || issue }}
      </li>
    </ul>
    <CatalogQuestionPreview :questions="context.snapshot.questions" />
    <form
      class="study-card catalog-form"
      aria-label="Parecer humano e direitos"
      @submit.prevent="submit"
    >
      <h3>Registrar parecer e direitos</h3>
      <p class="study-muted">
        O registro identifica sua conta e o conteúdo conferido. Não comprova
        automaticamente titularidade ou validade jurídica e não publica o
        modelo.
      </p>
      <fieldset :disabled="busy || !enabled">
        <legend>Evidências por questão</legend>
        <div
          v-for="(item, index) in rights"
          :key="item.questionId"
          class="catalog-rights-item"
        >
          <h4>Questão {{ index + 1 }}</h4>
          <label :for="`rights-basis-${index}`"
            >Base de direitos<select
              :id="`rights-basis-${index}`"
              v-model="item.basis"
            >
              <option
                v-for="basis in bases"
                :key="basis.value"
                :value="basis.value"
              >
                {{ basis.label }}
              </option>
            </select></label
          >
          <label :for="`rights-evidence-${index}`"
            >Evidência e justificativa<textarea
              :id="`rights-evidence-${index}`"
              v-model="item.evidence"
              minlength="20"
              maxlength="1200"
              rows="3"
              required
              placeholder="Informe autoria, licença ou fundamento verificável, com referência específica."
            />
          </label>
          <label :for="`rights-url-${index}`"
            >URL da evidência
            <span>(obrigatória para licença ou domínio público)</span
            ><input
              :id="`rights-url-${index}`"
              v-model="item.sourceUrl"
              type="url"
              maxlength="1200"
              :required="
                item.basis === 'licensed' || item.basis === 'public-domain'
              "
              placeholder="https://fonte.oficial/documento"
          /></label>
        </div>
      </fieldset>
      <fieldset :disabled="busy || !enabled">
        <legend>Declarações do revisor</legend>
        <label
          v-for="item in declarations"
          :key="item.key"
          class="catalog-check"
          ><input
            v-model="checks[item.key]"
            type="checkbox"
            :required="item.key === 'independent' || decision === 'approved'"
          />{{ item.label }}</label
        >
      </fieldset>
      <label for="review-decision"
        >Decisão<select
          id="review-decision"
          v-model="decision"
          :disabled="busy || !enabled"
        >
          <option value="changes_requested">Solicitar ajustes</option>
          <option value="approved" :disabled="context.issues.length > 0">
            Aprovar editorialmente, sem publicar
          </option>
        </select></label
      >
      <label for="review-notes"
        >Notas do parecer<textarea
          id="review-notes"
          v-model="notes"
          required
          minlength="20"
          maxlength="4000"
          rows="4"
          :disabled="busy || !enabled"
        />
      </label>
      <p v-if="message" class="study-error" role="alert">{{ message }}</p>
      <p v-if="success" class="auth-success" role="status">{{ success }}</p>
      <button class="study-primary-button" :disabled="busy || !enabled">
        {{ busy ? 'Registrando…' : 'Registrar parecer' }}
      </button>
    </form>
  </div>
</template>
