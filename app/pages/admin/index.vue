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
const { data: contestsData, error: contestsError, refresh: refreshContests } = await useFetch<{ contests: ContestRow[] }>('/api/admin/contests')
const { data: noticesData, error: noticesError, refresh: refreshNotices } = await useFetch<{ notices: NoticeRow[] }>('/api/admin/notices')
interface SubjectRow { id: string; name: string; created_at: string }
const { data: subjectsData, error: subjectsError, refresh: refreshSubjects } = await useFetch<{ subjects: SubjectRow[] }>('/api/admin/subjects')
const subjectForm = reactive({ name: '' })
const savingSubject = ref(false)
const subjectMessage = ref('')
const subjectError = ref('')
const assignmentForm = reactive({ noticeId: '', subjectIds: [] as string[] })
const savingAssignment = ref(false)
const assignmentMessage = ref('')
const assignmentError = ref('')
const loadingAssignment = ref(false)
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
.contest-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 18px; }
.contest-form select { width: 100%; padding: 12px; border: 1px solid rgba(255,255,255,.15); border-radius: 9px; color: var(--color-text); background: var(--color-bg); font: inherit; }
.contest-form label { display: grid; gap: 7px; color: var(--color-muted); font-size: 12px; }
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
@media (max-width: 640px) { .student-header { align-items: flex-start; gap: 12px; } .contest-form { grid-template-columns: 1fr; } .admin-contest-row { align-items: flex-start; flex-direction: column; } }
</style>
