<script setup lang="ts">
const theme = useCookie<'light' | 'dark'>('meaprovae-theme', {
  default: () => 'light',
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
})
const isDark = computed(() => theme.value === 'dark')

function toggleTheme() {
  theme.value = isDark.value ? 'light' : 'dark'
}

useSeoMeta({
  title: 'Me Aprovaê — sua jornada até a aprovação',
  description: 'Organize seus estudos para concursos públicos, acompanhe editais e evolua questão por questão.',
  ogTitle: 'Me Aprovaê',
  ogDescription: 'Estude com direção. Acompanhe sua evolução.',
})

useHead({
  meta: [{ name: 'theme-color', content: computed(() => isDark.value ? '#111b17' : '#f7f6f1') }],
})
</script>

<template>
  <main class="landing" :data-theme="theme">
    <header class="topbar">
      <NuxtLink class="brand" to="/" aria-label="Me Aprovaê, início">
        <span class="brand-mark">m.</span>
        <span>me aprovaê</span>
      </NuxtLink>
      <nav class="topbar-actions" aria-label="Acesso à plataforma">
        <button class="theme-toggle" type="button" :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'" :aria-pressed="isDark" @click="toggleTheme">
          <span class="theme-switch-track" aria-hidden="true"><span /></span>
          <span>{{ isDark ? 'Escuro' : 'Claro' }}</span>
        </button>
        <NuxtLink class="topbar-login" to="/login">Entrar</NuxtLink>
        <NuxtLink class="topbar-signup" to="/cadastro">Criar conta <span aria-hidden="true">↗</span></NuxtLink>
      </nav>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="eyebrow-dot" /> SUA APROVAÇÃO, NO SEU RITMO</p>
        <h1 id="hero-title">O próximo passo<br />é <span>seu.</span></h1>
        <p class="hero-description">
          Menos ansiedade sobre por onde começar. Mais clareza para estudar, praticar e chegar cada vez mais perto da sua aprovação.
        </p>
        <div class="hero-actions">
          <NuxtLink class="primary-action" to="/cadastro">Começar a estudar <span aria-hidden="true">↗</span></NuxtLink>
          <a class="secondary-action" href="#proposta">Conheça a plataforma <span aria-hidden="true">↓</span></a>
        </div>
        <div class="hero-footnote"><span class="footnote-check">✓</span><span>Comece de onde você está. O seu ritmo é o ritmo certo.</span></div>
      </div>

      <div class="hero-visual" aria-label="Prévia do acompanhamento de estudos">
        <div class="visual-orbit orbit-one" />
        <div class="visual-orbit orbit-two" />
        <div class="dashboard-card">
          <div class="dashboard-header">
            <div><span class="dashboard-kicker">SEU ESPAÇO DE ESTUDO</span><h2>Bom dia, estudante<span>.</span></h2></div>
            <div class="avatar" aria-hidden="true">M</div>
          </div>
          <div class="daily-card">
            <div class="daily-title"><div><span class="daily-overline">UM DIA DE CADA VEZ</span><h3>Seu próximo passo</h3></div><span class="sun-icon" aria-hidden="true">+</span></div>
            <p>Escolha uma disciplina e comece com uma questão.</p>
            <div class="study-progress"><span /><span /><span /><span /><span /><span /><span /></div>
            <div class="week-labels"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span><span>DOM</span></div>
          </div>
          <div class="dashboard-bottom">
            <div class="metric-card"><span class="metric-icon" aria-hidden="true">↗</span><span class="metric-label">QUESTÕES FEITAS</span><strong>+1 <small>por vez</small></strong></div>
            <div class="metric-card metric-card-accent"><span class="metric-icon" aria-hidden="true">o</span><span class="metric-label">SUA JORNADA</span><strong>Em curso <small>no seu tempo</small></strong></div>
          </div>
          <div class="card-caption"><span class="caption-dot" /> Constância vale mais que pressa.</div>
        </div>
        <div class="floating-note"><span class="note-star" aria-hidden="true">✓</span><span>Seu futuro<br /><strong>começa hoje.</strong></span></div>
        <span class="visual-spark" aria-hidden="true">+</span>
      </div>
    </section>

    <section id="proposta" class="value-section">
      <div class="section-topline"><p class="eyebrow">UM CAMINHO MAIS LEVE</p><span class="section-aside">01 — 03</span></div>
      <div class="section-heading"><h2>Transforme intenção<br />em <span>conquista.</span></h2><p>Uma plataforma feita para ajudar você a estudar com direção — sem esquecer que cada jornada é única.</p></div>
      <div class="value-grid">
        <article class="value-card"><span class="value-index">01</span><div class="value-icon icon-plan" aria-hidden="true">↗</div><h3>Encontre seu foco</h3><p>Escolha uma disciplina para praticar e, se quiser, defina um concurso como objetivo.</p><span class="card-arrow" aria-hidden="true">↗</span></article>
        <article class="value-card"><span class="value-index">02</span><div class="value-icon icon-practice" aria-hidden="true">✓</div><h3>Aprenda fazendo</h3><p>Resolva questões, entenda seus erros e fortaleça o que ainda precisa de atenção.</p><span class="card-arrow" aria-hidden="true">↗</span></article>
        <article class="value-card"><span class="value-index">03</span><div class="value-icon icon-progress" aria-hidden="true">◎</div><h3>Veja o quanto avançou</h3><p>Acompanhe seu progresso com indicadores construídos a partir do seu estudo real.</p><span class="card-arrow" aria-hidden="true">↗</span></article>
      </div>
      <div class="disclaimer"><span class="disclaimer-mark">i</span><p><strong>Estamos começando juntos.</strong> O acervo está em fase piloto e ainda não cobre integralmente todos os editais e disciplinas.</p></div>
    </section>

    <section class="closing-cta"><div><p class="eyebrow">TODA GRANDE CONQUISTA COMEÇA ASSIM</p><h2>Um passo seu.<br /><span>Um futuro inteiro.</span></h2></div><NuxtLink class="primary-action" to="/cadastro">Dar o primeiro passo <span aria-hidden="true">↗</span></NuxtLink></section>

    <footer class="footer">
      <NuxtLink class="brand footer-brand" to="/"><span class="brand-mark">m.</span><span>me aprovaê</span></NuxtLink>
      <span>Feito para quem continua acreditando.</span>
      <span>© {{ new Date().getFullYear() }} Me Aprovaê</span>
    </footer>
  </main>
</template>
