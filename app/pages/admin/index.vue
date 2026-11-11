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
interface ContestRow { id: string; slug: string; title: string; organization: string | null; exam_board: string | null; status: 'draft' | 'published' | 'archived'; published_at: string | null }
interface NoticeRow { id: string; contest_id: string; title: string; version: string; publication_date: string | null; source_url: string | null; status: 'draft' | 'published' | 'archived' }
interface PositionRow { id: string; contest_id: string; title: string; education_level: string | null; area: string | null; status: 'draft' | 'published' | 'archived' }
const { data: contestsData, error: contestsError, refresh: refreshContests } = await useFetch<{ contests: ContestRow[] }>('/api/admin/contests')
const { data: noticesData, error: noticesError, refresh: refreshNotices } = await useFetch<{ notices: NoticeRow[] }>('/api/admin/notices')
interface SubjectRow { id: string; name: string; created_at: string }
const { data: subjectsData, error: subjectsError, refresh: refreshSubjects } = await useFetch<{ subjects: SubjectRow[] }>('/api/admin/subjects')
const { data: positionsData, error: positionsError, refresh: refreshPositions } = await useFetch<{ positions: PositionRow[] }>('/api/admin/positions')
const positionForm = reactive({ contestId: '', title: '', educationLevel: '', area: '' })
const savingPosition = ref(false)
const positionMessage = ref('')
const positionError = ref('')

interface QuestionRow {
  id: string; notice_id: string; subject_id: string; topic_id: string | null; difficulty: 'easy' | 'medium' | 'hard'; difficulty_reviewed: boolean
  statement: string; explanation: string; source_label: string | null; source_url: string | null
  source_year: number | null; status: 'draft' | 'published' | 'archived'
}
interface QuestionOption { id: string; question_id: string; option_label: string; content: string; position: number }
const { data: questionsData, error: questionsError, refresh: refreshQuestions } = await useFetch<{ questions: QuestionRow[] }>('/api/admin/questions')
const { data: topicsData } = await useFetch<{ topics: Array<{ id: string; subject_id: string; parent_topic_id: string | null; name: string }> }>('/api/admin/topics')
const questionForm = reactive({ noticeId: '', subjectId: '', topicId: '', difficulty: 'medium', difficultyReviewed: false, statement: '', explanation: '', sourceLabel: '', sourceUrl: '', sourceYear: '' })
const questionOptions = ref([{ label: 'A', content: '' }, { label: 'B', content: '' }, { label: 'C', content: '' }, { label: 'D', content: '' }])
const questionCorrectOption = ref('')
const editingQuestionId = ref('')
const savingQuestion = ref(false)
const savingQuestionOptions = ref(false)
const questionMessage = ref('')
const questionError = ref('')
const loadingQuestionEditor = ref(false)
const questionTopics = computed(() => topicsData.value?.topics.filter(topic => topic.subject_id === questionForm.subjectId) ?? [])
const noticeSubjectIds = ref<string[]>([])
const questionNotice = computed(() => noticesData.value?.notices.find(notice => notice.id === questionForm.noticeId) ?? null)
const questionContest = computed(() => contestsData.value?.contests.find(contest => contest.id === questionNotice.value?.contest_id) ?? null)
const selectedQuestion = computed(() => questionsData.value?.questions.find(question => question.id === editingQuestionId.value) ?? null)
const publicationChecks = computed(() => [
  { label: 'Concurso publicado', passed: questionContest.value?.status === 'published' },
  { label: 'Edital publicado', passed: questionNotice.value?.status === 'published' },
  { label: 'Disciplina vinculada ao edital', passed: noticeSubjectIds.value.includes(questionForm.subjectId) },
  { label: 'Pelo menos duas alternativas preenchidas', passed: questionOptions.value.length >= 2 && questionOptions.value.every(option => option.content.trim().length > 0) },
  { label: 'Gabarito definido', passed: Boolean(questionCorrectOption.value && questionOptions.value.some(option => option.label === questionCorrectOption.value)) },
])
const canPublishQuestion = computed(() => publicationChecks.value.every(check => check.passed))
watch(() => questionForm.noticeId, async (noticeId) => {
  noticeSubjectIds.value = []
  if (!noticeId) return
  try {
    const result = await $fetch<{ assignments: Array<{ subject_id: string }> }>('/api/admin/notices/' + noticeId + '/subjects')
    noticeSubjectIds.value = result.assignments.map(item => item.subject_id)
  } catch { noticeSubjectIds.value = [] }
})
function resetQuestionForm() {
  editingQuestionId.value = ''; questionForm.noticeId = ''; questionForm.subjectId = ''; questionForm.topicId = ''; questionForm.difficulty = 'medium'; questionForm.difficultyReviewed = false
  questionForm.statement = ''; questionForm.explanation = ''; questionForm.sourceLabel = ''; questionForm.sourceUrl = ''; questionForm.sourceYear = ''
  questionCorrectOption.value = ''
  noticeSubjectIds.value = []
  questionOptions.value = [{ label: 'A', content: '' }, { label: 'B', content: '' }, { label: 'C', content: '' }, { label: 'D', content: '' }]
}
async function editQuestion(question: QuestionRow) {
  loadingQuestionEditor.value = true; questionError.value = ''
  try {
    const result = await $fetch<{ question: QuestionRow; options: QuestionOption[]; answer: { correct_option_id: string } | null }>('/api/admin/questions/' + question.id)
    editingQuestionId.value = result.question.id; questionForm.noticeId = result.question.notice_id; questionForm.subjectId = result.question.subject_id
    questionForm.topicId = result.question.topic_id ?? ''; questionForm.difficulty = result.question.difficulty ?? 'medium'; questionForm.difficultyReviewed = result.question.difficulty_reviewed; questionForm.statement = result.question.statement; questionForm.explanation = result.question.explanation
    questionForm.sourceLabel = result.question.source_label ?? ''; questionForm.sourceUrl = result.question.source_url ?? ''; questionForm.sourceYear = result.question.source_year?.toString() ?? ''
    questionOptions.value = result.options.map(option => ({ label: option.option_label, content: option.content }))
    questionCorrectOption.value = result.answer?.correct_option_id ? (result.options.find(o => o.id === result.answer?.correct_option_id)?.option_label ?? '') : ''
  } catch (cause: unknown) { questionError.value = cause instanceof Error ? cause.message : 'Não foi possível carregar a questão.' }
  finally { loadingQuestionEditor.value = false }
}
function addQuestionOption() {
  if (questionOptions.value.length >= 10) return
  questionOptions.value.push({ label: String.fromCharCode(65 + questionOptions.value.length), content: '' })
}
function removeQuestionOption(index: number) {
  if (questionOptions.value.length <= 2) return
  questionOptions.value.splice(index, 1)
  questionOptions.value.forEach((option, position) => { option.label = String.fromCharCode(65 + position) })
  questionCorrectOption.value = ''
}
async function saveQuestion() {
  savingQuestion.value = true; questionMessage.value = ''; questionError.value = ''
  try {
    if (!editingQuestionId.value) {
      const result = await $fetch<{ question: QuestionRow }>('/api/admin/questions', { method: 'POST', body: questionForm })
      editingQuestionId.value = result.question.id
      questionMessage.value = 'Questão criada como rascunho. Agora salve as alternativas e o gabarito.'
    } else {
      await $fetch('/api/admin/questions/' + editingQuestionId.value, { method: 'PATCH', body: questionForm })
      questionMessage.value = 'Questão atualizada.'
    }
    await refreshQuestions()
  } catch (cause: unknown) { questionError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar a questão.' }
  finally { savingQuestion.value = false }
}
async function saveQuestionOptions() {
  if (!editingQuestionId.value) return
  savingQuestionOptions.value = true; questionMessage.value = ''; questionError.value = ''
  try {
    const result = await $fetch<{ options: QuestionOption[] }>('/api/admin/questions/' + editingQuestionId.value + '/options', {
      method: 'PUT',
      body: { options: questionOptions.value.map((option, position) => ({ label: option.label, content: option.content, position: position + 1 })) },
    })
    questionOptions.value = result.options.map(option => ({ label: option.option_label, content: option.content }))
    questionMessage.value = 'Alternativas salvas.'
  } catch (cause: unknown) { questionError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar as alternativas.' }
  finally { savingQuestionOptions.value = false }
}
async function saveQuestionAnswer() {
  if (!editingQuestionId.value || !questionCorrectOption.value) return
  questionError.value = ''; questionMessage.value = ''
  try {
    const result = await $fetch<{ options: QuestionOption[] }>('/api/admin/questions/' + editingQuestionId.value + '/options', { method: 'PUT', body: { options: questionOptions.value.map((option, position) => ({ label: option.label, content: option.content, position: position + 1 })) } })
    const selected = result.options.find(option => option.option_label === questionCorrectOption.value)
    if (!selected) throw new Error('Salve uma alternativa válida antes de definir o gabarito.')
    await $fetch('/api/admin/questions/' + editingQuestionId.value + '/answer', { method: 'PUT', body: { optionId: selected.id } })
    questionMessage.value = 'Gabarito salvo.'
  } catch (cause: unknown) { questionError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o gabarito.' }
}
async function changeQuestionStatus(question: QuestionRow, status: QuestionRow['status']) {
  questionError.value = ''; questionMessage.value = ''
  try {
    await $fetch('/api/admin/questions/' + question.id, { method: 'PATCH', body: { status } })
    questionMessage.value = status === 'published' ? 'Questão publicada.' : 'Status da questão atualizado.'
    await refreshQuestions()
  } catch (cause: unknown) { questionError.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar a questão.' }
}

const positionAssignmentForm = reactive({ noticeId: '', positionIds: [] as string[] })
const savingPositionAssignment = ref(false)
const positionAssignmentMessage = ref('')
const positionAssignmentError = ref('')
const loadingPositionAssignment = ref(false)
const subjectForm = reactive({ name: '' })
const savingSubject = ref(false)
const subjectMessage = ref('')
const subjectError = ref('')
const assignmentForm = reactive({ noticeId: '', subjectIds: [] as string[] })
const savingAssignment = ref(false)
const assignmentMessage = ref('')
const assignmentError = ref('')
const loadingAssignment = ref(false)
async function createPosition() {
  savingPosition.value = true
  positionMessage.value = ''
  positionError.value = ''
  try {
    await $fetch('/api/admin/positions', { method: 'POST', body: positionForm })
    positionForm.title = ''
    positionForm.educationLevel = ''
    positionForm.area = ''
    positionMessage.value = 'Cargo cadastrado como rascunho.'
    await Promise.all([refreshPositions(), refresh()])
  } catch (cause: unknown) {
    positionError.value = cause instanceof Error ? cause.message : 'Não foi possível cadastrar o cargo.'
  } finally {
    savingPosition.value = false
  }
}
async function changePositionStatus(position: PositionRow, status: PositionRow['status']) {
  positionError.value = ''
  positionMessage.value = ''
  try {
    await $fetch('/api/admin/positions/' + position.id, { method: 'PATCH', body: { status } })
    positionMessage.value = status === 'published' ? 'Cargo publicado.' : 'Status do cargo atualizado.'
    await Promise.all([refreshPositions(), refresh()])
  } catch (cause: unknown) {
    positionError.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar o cargo.'
  }
}
async function loadNoticePositions() {
  if (!positionAssignmentForm.noticeId) return
  loadingPositionAssignment.value = true
  positionAssignmentError.value = ''
  try {
    const result = await $fetch<{ assignments: Array<{ position_id: string }> }>(`/api/admin/notices/${positionAssignmentForm.noticeId}/positions`)
    positionAssignmentForm.positionIds = result.assignments.map(item => item.position_id)
  } catch (cause: unknown) {
    positionAssignmentError.value = cause instanceof Error ? cause.message : 'Não foi possível carregar os cargos do edital.'
  } finally {
    loadingPositionAssignment.value = false
  }
}
async function saveNoticePositions() {
  if (!positionAssignmentForm.noticeId) return
  savingPositionAssignment.value = true
  positionAssignmentMessage.value = ''
  positionAssignmentError.value = ''
  try {
    await $fetch(`/api/admin/notices/${positionAssignmentForm.noticeId}/positions`, {
      method: 'PUT',
      body: { positionIds: positionAssignmentForm.positionIds },
    })
    positionAssignmentMessage.value = 'Cargos do edital atualizados.'
    await refresh()
  } catch (cause: unknown) {
    positionAssignmentError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar os cargos do edital.'
  } finally {
    savingPositionAssignment.value = false
  }
}
async function createSubject() {
  savingSubject.value = true
  subjectMessage.value = ''
  subjectError.value = ''
  try {
    await $fetch('/api/admin/subjects', { method: 'POST', body: subjectForm })
    subjectForm.name = ''
    subjectMessage.value = 'Disciplina cadastrada.'
    await Promise.all([refreshSubjects(), refresh()])
  } catch (cause: unknown) {
    subjectError.value = cause instanceof Error ? cause.message : 'Não foi possível cadastrar a disciplina.'
  } finally {
    savingSubject.value = false
  }
}
async function loadNoticeSubjects() {
  if (!assignmentForm.noticeId) return
  loadingAssignment.value = true
  assignmentError.value = ''
  try {
    const result = await $fetch<{ assignments: Array<{ subject_id: string }> }>(`/api/admin/notices/${assignmentForm.noticeId}/subjects`)
    assignmentForm.subjectIds = result.assignments.map(item => item.subject_id)
  } catch (cause: unknown) {
    assignmentError.value = cause instanceof Error ? cause.message : 'Não foi possível carregar os vínculos.'
  } finally {
    loadingAssignment.value = false
  }
}
async function saveNoticeSubjects() {
  if (!assignmentForm.noticeId) return
  savingAssignment.value = true
  assignmentMessage.value = ''
  assignmentError.value = ''
  try {
    await $fetch(`/api/admin/notices/${assignmentForm.noticeId}/subjects`, {
      method: 'PUT',
      body: { subjectIds: assignmentForm.subjectIds },
    })
    assignmentMessage.value = 'Disciplinas do edital atualizadas.'
    await refresh()
  } catch (cause: unknown) {
    assignmentError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar os vínculos.'
  } finally {
    savingAssignment.value = false
  }
}
const noticeForm = reactive({ contestId: '', title: '', version: '1', publicationDate: '', sourceUrl: '' })
const savingNotice = ref(false)
const noticeMessage = ref('')
const noticeError = ref('')
const contestForm = reactive({ slug: '', title: '', organization: '', examBoard: '' })
const savingContest = ref(false)
const contestMessage = ref('')
const contestError = ref('')
async function createContest() {
  savingContest.value = true
  contestMessage.value = ''
  contestError.value = ''
  try {
    await $fetch('/api/admin/contests', { method: 'POST', body: contestForm })
    contestForm.slug = ''
    contestForm.title = ''
    contestForm.organization = ''
    contestForm.examBoard = ''
    contestMessage.value = 'Concurso salvo como rascunho.'
    await Promise.all([refresh(), refreshContests()])
  } catch (cause: unknown) {
    contestError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o concurso.'
  } finally {
    savingContest.value = false
  }
}
async function changeContestStatus(contest: ContestRow, status: ContestRow['status']) {
  contestError.value = ''
  contestMessage.value = ''
  try {
    await $fetch('/api/admin/contests/' + contest.id, { method: 'PATCH', body: { status } })
    contestMessage.value = status === 'published' ? 'Concurso publicado.' : 'Status do concurso atualizado.'
    await Promise.all([refresh(), refreshContests()])
  } catch (cause: unknown) {
    contestError.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar o concurso.'
  }
}
async function createNotice() {
  savingNotice.value = true
  noticeMessage.value = ''
  noticeError.value = ''
  try {
    await $fetch('/api/admin/notices', { method: 'POST', body: noticeForm })
    noticeForm.title = ''
    noticeForm.version = '1'
    noticeForm.publicationDate = ''
    noticeForm.sourceUrl = ''
    noticeMessage.value = 'Edital salvo como rascunho.'
    await Promise.all([refresh(), refreshNotices()])
  } catch (cause: unknown) {
    noticeError.value = cause instanceof Error ? cause.message : 'Não foi possível salvar o edital.'
  } finally {
    savingNotice.value = false
  }
}
async function changeNoticeStatus(notice: NoticeRow, status: NoticeRow['status']) {
  noticeError.value = ''
  noticeMessage.value = ''
  try {
    await $fetch('/api/admin/notices/' + notice.id, { method: 'PATCH', body: { status } })
    noticeMessage.value = status === 'published' ? 'Edital publicado.' : 'Status do edital atualizado.'
    await Promise.all([refresh(), refreshNotices()])
  } catch (cause: unknown) {
    noticeError.value = cause instanceof Error ? cause.message : 'Não foi possível atualizar o edital.'
  }
}
const contestTitle = (id: string) => contestsData.value?.contests.find(contest => contest.id === id)?.title || 'Concurso não encontrado'
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
        <NuxtLink class="study-link" to="/admin/importar">Importar questões</NuxtLink>
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

        <section class="study-section student-empty">
          <p class="auth-eyebrow">CADASTRO INICIAL</p>
          <h2>Novo concurso</h2>
          <form class="contest-form" @submit.prevent="createContest">
            <label>Nome do concurso<input v-model="contestForm.title" required minlength="3" maxlength="180" placeholder="Ex.: Concurso público — órgão"></label>
            <label>Slug<input v-model="contestForm.slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="concurso-orgao-2026"></label>
            <label>Órgão<input v-model="contestForm.organization" maxlength="160" placeholder="Órgão responsável"></label>
            <label>Banca organizadora<input v-model="contestForm.examBoard" maxlength="160" placeholder="Banca, se definida"></label>
            <button class="study-secondary-button" type="submit" :disabled="savingContest">{{ savingContest ? 'Salvando…' : 'Salvar como rascunho' }}</button>
          </form>
          <p v-if="contestMessage" class="admin-success" role="status">{{ contestMessage }}</p>
          <p v-if="contestError" class="admin-error" role="alert">{{ contestError }}</p>
        </section>

        <section class="study-section">
          <h2>Concursos cadastrados</h2>
          <p v-if="contestsError" class="admin-error" role="alert">Não foi possível carregar a lista editorial.</p>
          <div v-else-if="!contestsData?.contests.length" class="student-empty"><p>Nenhum concurso cadastrado.</p></div>
          <article v-for="contest in contestsData?.contests || []" :key="contest.id" class="admin-contest-row">
            <div>
              <strong>{{ contest.title }}</strong>
              <p class="study-muted">{{ contest.slug }} · {{ contest.organization || 'Órgão não informado' }} · {{ contest.exam_board || 'Banca não informada' }}</p>
              <span class="admin-status">{{ contest.status === 'published' ? 'Publicado' : contest.status === 'archived' ? 'Arquivado' : 'Rascunho' }}</span>
            </div>
            <div class="admin-actions">
              <button v-if="contest.status !== 'published'" class="study-secondary-button" @click="changeContestStatus(contest, 'published')">Publicar</button>
              <button v-if="contest.status !== 'archived'" class="study-secondary-button" @click="changeContestStatus(contest, 'archived')">Arquivar</button>
              <button v-if="contest.status === 'archived'" class="study-secondary-button" @click="changeContestStatus(contest, 'draft')">Reabrir</button>
            </div>
          </article>
        </section>

        <section class="study-section student-empty">
          <p class="auth-eyebrow">ESTRUTURA DO CONCURSO</p>
          <h2>Novo edital</h2>
          <form class="contest-form" @submit.prevent="createNotice">
            <label>Concurso
              <select v-model="noticeForm.contestId" required>
                <option value="" disabled>Selecione um concurso</option>
                <option v-for="contest in contestsData?.contests || []" :key="contest.id" :value="contest.id">{{ contest.title }} · {{ contest.status === 'published' ? 'Publicado' : contest.status === 'archived' ? 'Arquivado' : 'Rascunho' }}</option>
              </select>
            </label>
            <label>Título do edital<input v-model="noticeForm.title" required minlength="3" maxlength="180" placeholder="Edital de abertura"></label>
            <label>Versão<input v-model="noticeForm.version" required maxlength="40" placeholder="1.0"></label>
            <label>Data de publicação<input v-model="noticeForm.publicationDate" type="date"></label>
            <label class="form-wide">URL da fonte oficial<input v-model="noticeForm.sourceUrl" type="url" maxlength="2048" placeholder="https://site-oficial.gov.br/edital.pdf"></label>
            <button class="study-secondary-button" type="submit" :disabled="savingNotice || !contestsData?.contests.length">{{ savingNotice ? 'Salvando…' : 'Salvar edital como rascunho' }}</button>
          </form>
          <p class="study-muted">O edital será criado como rascunho. Para publicar, o concurso associado também precisa estar publicado.</p>
          <p v-if="noticeMessage" class="admin-success" role="status">{{ noticeMessage }}</p>
          <p v-if="noticeError" class="admin-error" role="alert">{{ noticeError }}</p>
        </section>

        <section class="study-section">
          <h2>Editais cadastrados</h2>
          <p v-if="noticesError" class="admin-error" role="alert">Não foi possível carregar os editais.</p>
          <div v-else-if="!noticesData?.notices.length" class="student-empty"><p>Nenhum edital cadastrado.</p></div>
          <article v-for="notice in noticesData?.notices || []" :key="notice.id" class="admin-contest-row">
            <div>
              <strong>{{ notice.title }} · v{{ notice.version }}</strong>
              <p class="study-muted">{{ contestTitle(notice.contest_id) }} · {{ notice.publication_date ? new Date(notice.publication_date + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data não informada' }}</p>
              <a v-if="notice.source_url" :href="notice.source_url" target="_blank" rel="noopener noreferrer" class="study-link">Consultar fonte oficial</a>
              <span class="admin-status">{{ notice.status === 'published' ? 'Publicado' : notice.status === 'archived' ? 'Arquivado' : 'Rascunho' }}</span>
            </div>
            <div class="admin-actions">
              <button v-if="notice.status !== 'published'" class="study-secondary-button" @click="changeNoticeStatus(notice, 'published')">Publicar</button>
              <button v-if="notice.status !== 'archived'" class="study-secondary-button" @click="changeNoticeStatus(notice, 'archived')">Arquivar</button>
              <button v-if="notice.status === 'archived'" class="study-secondary-button" @click="changeNoticeStatus(notice, 'draft')">Reabrir</button>
            </div>
          </article>
        </section>

        <section class="study-section student-empty">
          <p class="auth-eyebrow">ESTRUTURA DO CONCURSO</p>
          <h2>Cargos</h2>
          <form class="contest-form" @submit.prevent="createPosition">
            <label>Concurso
              <select v-model="positionForm.contestId" required>
                <option value="" disabled>Selecione um concurso</option>
                <option v-for="contest in contestsData?.contests || []" :key="contest.id" :value="contest.id">{{ contest.title }}</option>
              </select>
            </label>
            <label>Cargo<input v-model="positionForm.title" required minlength="2" maxlength="160" placeholder="Analista Administrativo"></label>
            <label>Escolaridade<input v-model="positionForm.educationLevel" maxlength="120" placeholder="Nível superior"></label>
            <label>Área<input v-model="positionForm.area" maxlength="120" placeholder="Administrativa"></label>
            <button class="study-secondary-button" type="submit" :disabled="savingPosition || !contestsData?.contests.length">{{ savingPosition ? 'Salvando…' : 'Cadastrar cargo' }}</button>
          </form>
          <p class="study-muted">O cargo nasce como rascunho e pode ser publicado somente depois da revisão editorial.</p>
          <p v-if="positionMessage" class="admin-success" role="status">{{ positionMessage }}</p>
          <p v-if="positionError" class="admin-error" role="alert">{{ positionError }}</p>
        </section>

        <section class="study-section">
          <h2>Cargos cadastrados</h2>
          <p v-if="positionsError" class="admin-error" role="alert">Não foi possível carregar os cargos.</p>
          <div v-else-if="!positionsData?.positions.length" class="student-empty"><p>Nenhum cargo cadastrado.</p></div>
          <article v-for="position in positionsData?.positions || []" :key="position.id" class="admin-contest-row">
            <div>
              <strong>{{ position.title }}</strong>
              <p class="study-muted">{{ contestTitle(position.contest_id) }} · {{ position.education_level || 'Escolaridade não informada' }} · {{ position.area || 'Área não informada' }}</p>
              <span class="admin-status">{{ position.status === 'published' ? 'Publicado' : position.status === 'archived' ? 'Arquivado' : 'Rascunho' }}</span>
            </div>
            <div class="admin-actions">
              <button v-if="position.status !== 'published'" class="study-secondary-button" @click="changePositionStatus(position, 'published')">Publicar</button>
              <button v-if="position.status !== 'archived'" class="study-secondary-button" @click="changePositionStatus(position, 'archived')">Arquivar</button>
              <button v-if="position.status === 'archived'" class="study-secondary-button" @click="changePositionStatus(position, 'draft')">Reabrir</button>
            </div>
          </article>
        </section>

        <section class="study-section student-empty">
          <p class="auth-eyebrow">ESTRUTURA DO EDITAL</p>
          <h2>Associar cargos a um edital</h2>
          <form class="contest-form" @submit.prevent="saveNoticePositions">
            <label class="form-wide">Edital
              <select v-model="positionAssignmentForm.noticeId" required @change="loadNoticePositions">
                <option value="" disabled>Selecione um edital</option>
                <option v-for="notice in noticesData?.notices || []" :key="notice.id" :value="notice.id">{{ notice.title }} · {{ notice.status === 'published' ? 'Publicado' : notice.status === 'archived' ? 'Arquivado' : 'Rascunho' }}</option>
              </select>
            </label>
            <label class="form-wide">Cargos
              <select v-model="positionAssignmentForm.positionIds" multiple size="6" :disabled="!positionAssignmentForm.noticeId || loadingPositionAssignment || !positionsData?.positions.length">
                <option v-for="position in positionsData?.positions || []" :key="position.id" :value="position.id">{{ position.title }} · {{ contestTitle(position.contest_id) }}</option>
              </select>
            </label>
            <button class="study-secondary-button" type="submit" :disabled="savingPositionAssignment || loadingPositionAssignment || !positionAssignmentForm.noticeId">{{ savingPositionAssignment ? 'Salvando…' : 'Salvar cargos do edital' }}</button>
          </form>
          <p class="study-muted">Somente cargos do mesmo concurso do edital podem ser associados. Editais publicados precisam ser despublicados antes de alterar sua estrutura.</p>
          <p v-if="positionAssignmentMessage" class="admin-success" role="status">{{ positionAssignmentMessage }}</p>
          <p v-if="positionAssignmentError" class="admin-error" role="alert">{{ positionAssignmentError }}</p>
        </section>

        <section class="study-section student-empty">
          <p class="auth-eyebrow">CATÁLOGO DE ESTUDO</p>
          <h2>Disciplinas</h2>
          <form class="contest-form" @submit.prevent="createSubject">
            <label class="form-wide">Nome da disciplina<input v-model="subjectForm.name" required minlength="2" maxlength="100" placeholder="Direito Constitucional"></label>
            <button class="study-secondary-button" type="submit" :disabled="savingSubject">{{ savingSubject ? 'Salvando…' : 'Cadastrar disciplina' }}</button>
          </form>
          <p v-if="subjectMessage" class="admin-success" role="status">{{ subjectMessage }}</p>
          <p v-if="subjectError || subjectsError" class="admin-error" role="alert">{{ subjectError || 'Não foi possível carregar as disciplinas.' }}</p>
          <ul v-if="subjectsData?.subjects.length" class="admin-subject-list">
            <li v-for="subject in subjectsData.subjects" :key="subject.id">{{ subject.name }}</li>
          </ul>
          <p v-else-if="!subjectsError" class="study-muted">Nenhuma disciplina cadastrada.</p>
        </section>

        <section class="study-section student-empty">
          <p class="auth-eyebrow">ESTRUTURA DO EDITAL</p>
          <h2>Associar disciplinas a um edital</h2>
          <form class="contest-form" @submit.prevent="saveNoticeSubjects">
            <label class="form-wide">Edital
              <select v-model="assignmentForm.noticeId" required @change="loadNoticeSubjects">
                <option value="" disabled>Selecione um edital</option>
                <option v-for="notice in noticesData?.notices || []" :key="notice.id" :value="notice.id">{{ notice.title }} · {{ notice.status === 'published' ? 'Publicado' : notice.status === 'archived' ? 'Arquivado' : 'Rascunho' }}</option>
              </select>
            </label>
            <label class="form-wide">Disciplinas
              <select v-model="assignmentForm.subjectIds" multiple size="6" :disabled="!assignmentForm.noticeId || loadingAssignment || !subjectsData?.subjects.length">
                <option v-for="subject in subjectsData?.subjects || []" :key="subject.id" :value="subject.id">{{ subject.name }}</option>
              </select>
            </label>
            <button class="study-secondary-button" type="submit" :disabled="savingAssignment || loadingAssignment || !assignmentForm.noticeId">{{ savingAssignment ? 'Salvando…' : 'Salvar disciplinas do edital' }}</button>
          </form>
          <p class="study-muted">Use Ctrl (ou ⌘ no Mac) para selecionar mais de uma disciplina. Editais publicados precisam ser despublicados antes de alterar a estrutura.</p>
          <p v-if="assignmentMessage" class="admin-success" role="status">{{ assignmentMessage }}</p>
          <p v-if="assignmentError" class="admin-error" role="alert">{{ assignmentError }}</p>
        </section>


        <section class="study-section student-empty">
          <p class="auth-eyebrow">BANCO DE QUESTÕES</p>
          <h2>{{ editingQuestionId ? 'Editar questão' : 'Nova questão' }}</h2>
          <form class="contest-form" @submit.prevent="saveQuestion">
            <label>Edital<select v-model="questionForm.noticeId" required><option value="" disabled>Selecione um edital</option><option v-for="notice in noticesData?.notices || []" :key="notice.id" :value="notice.id">{{ notice.title }}</option></select></label>
            <label>Disciplina<select v-model="questionForm.subjectId" required @change="questionForm.topicId = ''"><option value="" disabled>Selecione uma disciplina</option><option v-for="subject in subjectsData?.subjects || []" :key="subject.id" :value="subject.id">{{ subject.name }}</option></select></label>
            <label>Assunto/subassunto<select v-model="questionForm.topicId" :disabled="!questionForm.subjectId"><option value="">Sem assunto específico</option><option v-for="topic in questionTopics" :key="topic.id" :value="topic.id">{{ topic.parent_topic_id ? '↳ ' : '' }}{{ topic.name }}</option></select></label>
            <label>Dificuldade<select v-model="questionForm.difficulty" required><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Difícil</option></select></label>
            <label class="form-wide" style="display:flex;align-items:center;gap:10px"><input v-model="questionForm.difficultyReviewed" type="checkbox"> Classificação de dificuldade revisada; somente classificações revisadas aparecem para estudantes.</label>
            <label>Ano da fonte<input v-model="questionForm.sourceYear" inputmode="numeric" maxlength="4" placeholder="2026"></label>
            <label class="form-wide">Enunciado<textarea v-model="questionForm.statement" required minlength="10" maxlength="20000" rows="7" placeholder="Digite o enunciado da questão..."></textarea></label>
            <label>Fonte<input v-model="questionForm.sourceLabel" maxlength="200" placeholder="Prova oficial, banca, legislação..."></label>
            <label>URL da fonte<input v-model="questionForm.sourceUrl" type="url" maxlength="2048" placeholder="https://..."></label>
            <label class="form-wide">Explicação/comentário<textarea v-model="questionForm.explanation" maxlength="12000" rows="5" placeholder="Explique o raciocínio da resposta..."></textarea></label>
            <div class="form-wide admin-actions"><button class="study-secondary-button" type="submit" :disabled="savingQuestion">{{ savingQuestion ? 'Salvando…' : editingQuestionId ? 'Atualizar questão' : 'Criar questão' }}</button><button v-if="editingQuestionId" class="study-secondary-button" type="button" @click="resetQuestionForm">Nova questão</button></div>
          </form>
          <p v-if="loadingQuestionEditor" class="study-muted">Carregando editor…</p>
          <p v-if="questionMessage" class="admin-success" role="status">{{ questionMessage }}</p>
          <p v-if="questionError" class="admin-error" role="alert">{{ questionError }}</p>
          <div v-if="editingQuestionId" class="question-editor-options">
            <h3>Alternativas e gabarito</h3>
            <article v-for="(option, index) in questionOptions" :key="index" class="question-option-editor">
              <input v-model="option.label" maxlength="4" aria-label="Rótulo da alternativa" :disabled="selectedQuestion?.status === 'published'">
              <textarea v-model="option.content" rows="3" maxlength="5000" :placeholder="'Alternativa ' + option.label" :disabled="selectedQuestion?.status === 'published'"></textarea>
              <button v-if="questionOptions.length > 2" class="study-secondary-button" type="button" :disabled="selectedQuestion?.status === 'published'" @click="removeQuestionOption(index)">Remover</button>
            </article>
            <div class="admin-actions"><button v-if="questionOptions.length < 10" class="study-secondary-button" type="button" :disabled="selectedQuestion?.status === 'published'" @click="addQuestionOption">Adicionar alternativa</button><button class="study-secondary-button" type="button" :disabled="savingQuestionOptions || selectedQuestion?.status === 'published'" @click="saveQuestionOptions">{{ savingQuestionOptions ? 'Salvando…' : 'Salvar alternativas' }}</button></div>
            <label class="form-wide">Gabarito<select v-model="questionCorrectOption" :disabled="selectedQuestion?.status === 'published'"><option value="">Selecione a alternativa correta</option><option v-for="option in questionOptions" :key="option.label" :value="option.label">Alternativa {{ option.label }}</option></select></label>
            <button class="study-secondary-button" type="button" :disabled="!questionCorrectOption || selectedQuestion?.status === 'published'" @click="saveQuestionAnswer">Salvar gabarito</button>
            <div class="publication-checklist">
              <h4>Checklist de publicação</h4>
              <ul><li v-for="check in publicationChecks" :key="check.label" :class="{ 'check-passed': check.passed }"><span>{{ check.passed ? '✓' : '○' }}</span>{{ check.label }}</li></ul>
              <p class="study-muted">A validação final também é aplicada pelo banco de dados.</p>
              <button v-if="selectedQuestion && selectedQuestion.status === 'published'" class="study-secondary-button" type="button" @click="changeQuestionStatus(selectedQuestion, 'draft')">Despublicar para edição</button>
              <button v-else-if="selectedQuestion && selectedQuestion.status !== 'published'" class="study-secondary-button" type="button" :disabled="!canPublishQuestion" @click="changeQuestionStatus(selectedQuestion, 'published')">Publicar questão</button>
            </div>
          </div>
        </section>

        <section class="study-section">
          <h2>Questões cadastradas</h2>
          <p v-if="questionsError" class="admin-error" role="alert">Não foi possível carregar as questões.</p>
          <div v-else-if="!questionsData?.questions.length" class="student-empty"><p>Nenhuma questão cadastrada.</p></div>
          <article v-for="question in questionsData?.questions || []" :key="question.id" class="admin-contest-row">
            <div><strong>{{ question.statement.slice(0, 150) }}{{ question.statement.length > 150 ? '…' : '' }}</strong><p class="study-muted">{{ contestTitle(noticesData?.notices.find(notice => notice.id === question.notice_id)?.contest_id || '') }} · {{ subjectsData?.subjects.find(subject => subject.id === question.subject_id)?.name || 'Disciplina não encontrada' }}</p><span class="admin-status">{{ question.status === 'published' ? 'Publicado' : question.status === 'archived' ? 'Arquivado' : 'Rascunho' }}</span></div>
            <div class="admin-actions"><button class="study-secondary-button" @click="editQuestion(question)">Editar</button><button v-if="question.status !== 'archived'" class="study-secondary-button" @click="changeQuestionStatus(question, 'archived')">Arquivar</button><button v-if="question.status === 'archived'" class="study-secondary-button" @click="changeQuestionStatus(question, 'draft')">Reabrir</button></div>
          </article>
        </section>

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

      </template>
    </section>
  </main>
</template>

<style scoped>
.contest-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
.contest-form select { width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,.15); border-radius: 9px; color: var(--color-text); background: var(--color-bg); font: inherit; }
.contest-form label { display: grid; gap: 7px; color: var(--color-muted); font-size: 12px; }
.contest-form textarea { width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,.15); border-radius: 9px; color: var(--color-text); background: var(--color-bg); font: inherit; resize: vertical; }
.contest-form input { width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,.15); border-radius: 9px; color: var(--color-text); background: var(--color-bg); font: inherit; }
.contest-form button { justify-self: start; }
.form-wide { grid-column: 1 / -1; }
.contest-form select[multiple] { min-height: 150px; }
.admin-subject-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; list-style: none; }
.admin-subject-list li { padding: 7px 10px; border: 1px solid rgba(255,255,255,.12); border-radius: 8px; color: var(--color-muted); font-size: 12px; }
.admin-contest-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 12px; padding: 17px; border: 1px solid rgba(255,255,255,.08); border-radius: 12px; }
.admin-contest-row p { margin: 6px 0; font-size: 12px; }
.admin-status { color: var(--color-primary); font-size: 11px; }
.admin-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.question-editor-options { display: grid; gap: 14px; margin-top: 24px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.08); }
.question-option-editor { display: grid; grid-template-columns: 55px minmax(0, 1fr) auto; gap: 10px; align-items: start; }
.question-option-editor input, .question-option-editor textarea { width: 100%; padding: 10px; border: 1px solid rgba(255,255,255,.15); border-radius: 8px; color: var(--color-text); background: var(--color-bg); font: inherit; }
.publication-checklist { display: grid; gap: 10px; padding: 16px; border: 1px solid rgba(255,255,255,.12); border-radius: 12px; }
.publication-checklist h4, .publication-checklist p { margin: 0; }
.publication-checklist ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.publication-checklist li { display: flex; gap: 9px; color: var(--color-muted); font-size: 13px; }
.publication-checklist li.check-passed { color: var(--color-primary); }
.admin-success { color: var(--color-primary); }
.admin-error { color: #ffb6b6; }
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
@media (max-width: 640px) { .question-option-editor { grid-template-columns: 1fr; } .student-header { align-items: flex-start; gap: 12px; } .contest-form { grid-template-columns: 1fr; } .admin-contest-row { align-items: flex-start; flex-direction: column; } }
</style>
