<script setup lang="ts">
import authMiddleware from '~/middleware/auth'
import { federalExamArchives, federalPastExamCollections } from '~~/shared/data/federal-past-exams'

definePageMeta({ middleware: authMiddleware })
useSeoMeta({ title: 'Provas anteriores | Me Aprovaê' })
</script>

<template>
  <main class="study-page">
    <header class="study-header">
      <NuxtLink class="auth-brand" to="/app">Me Aprovaê</NuxtLink>
      <nav>
        <NuxtLink to="/app/concursos">Concursos</NuxtLink>
        <NuxtLink to="/app/questoes">Questões</NuxtLink>
        <NuxtLink to="/app/provas">Simulados</NuxtLink>
        <NuxtLink to="/app/provas-anteriores">Provas anteriores</NuxtLink>
      </nav>
    </header>

    <section class="study-content">
      <p class="auth-eyebrow">ACERVO EXTERNO · CONCURSOS FEDERAIS</p>
      <h1>Provas anteriores e gabaritos</h1>
      <p class="auth-description">
        Consulte os documentos nos sites oficiais das bancas. O Me Aprovaê não hospeda nem reproduz estes arquivos.
      </p>

      <div class="study-state study-card">
        <strong>Sobre o uso no simulado</strong>
        <p>
          Estes PDFs servem para consulta e treino diretamente na fonte. Eles não são importados para o nosso banco
          nem usados automaticamente nos simulados. Para isso, usamos questões autorais ou conteúdo com permissão
          de reprodução confirmada e revisão editorial.
        </p>
      </div>

      <section v-for="collection in federalPastExamCollections" :key="collection.title" class="study-section">
        <p class="auth-eyebrow">{{ collection.board }} · {{ collection.year }}</p>
        <h2>{{ collection.title }}</h2>
        <p class="study-muted">{{ collection.notes }}</p>
        <p>
          <a class="study-link" :href="collection.sourcePageUrl" target="_blank" rel="noopener noreferrer">
            {{ collection.sourcePageLabel }} ↗
          </a>
        </p>
        <p class="study-muted">Fontes conferidas em {{ new Date(collection.checkedAt + 'T00:00:00').toLocaleDateString('pt-BR') }}.</p>
        <div class="study-grid">
          <article v-for="document in collection.documents" :key="document.url" class="study-card">
            <span class="study-muted">{{ document.kind }}</span>
            <h3>{{ document.title }}</h3>
            <a :href="document.url" target="_blank" rel="noopener noreferrer">
              Abrir {{ document.kind.toLowerCase() }} oficial ↗
            </a>
          </article>
        </div>
      </section>

      <section class="study-section">
        <h2>Outros arquivos oficiais</h2>
        <div class="study-actions">
          <a
            v-for="archive in federalExamArchives"
            :key="archive.url"
            class="study-secondary-button"
            :href="archive.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ archive.title }} ↗
          </a>
        </div>
        <p class="study-muted">
          Os links podem mudar quando as bancas reorganizam seus arquivos. Confira o edital, o cargo, o turno e a versão
          do gabarito na página oficial antes de estudar.
        </p>
      </section>

      <div class="study-actions">
        <NuxtLink class="study-primary-button" to="/app/provas">Fazer simulado com questões do banco</NuxtLink>
        <NuxtLink class="study-secondary-button" to="/app/questoes">Resolver questões publicadas</NuxtLink>
      </div>
    </section>
  </main>
</template>

<style scoped>
.study-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
.study-grid .study-card { display: grid; align-content: start; gap: 10px; }
.study-grid h3 { margin: 0; font-size: 15px; }
.study-grid a { color: var(--color-primary); }
.study-section { margin-top: 36px; }
.study-section h2 { font-family: var(--font-display); }
.study-muted { color: var(--color-muted); }
.study-state p { margin-bottom: 0; }
.study-actions { flex-wrap: wrap; }
.study-secondary-button { text-decoration: none; }
</style>
