<script setup lang="ts">
useSeoMeta({
  title: 'Me Aprovaê — sua jornada até a aprovação',
  description: 'Organize seus estudos para concursos públicos, acompanhe editais e evolua questão por questão.',
  ogTitle: 'Me Aprovaê',
  ogDescription: 'Estude com direção. Acompanhe sua evolução.',
})
</script>

<template>
  <main class="landing">
    <header class="topbar">
      <NuxtLink class="brand" to="/" aria-label="Me Aprovaê, início">
        <span class="brand-mark">M</span>
        <span>Me Aprovaê</span>
      </NuxtLink>
      <span class="topbar-note">EM CONSTRUÇÃO</span>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow"><span class="eyebrow-dot" /> SUA JORNADA, COM DIREÇÃO</p>
        <h1 id="hero-title">Sua aprovação começa com <span>um passo de cada vez.</span></h1>
        <p class="hero-description">
          Um espaço para organizar seus estudos, acompanhar editais, praticar com questões
          e enxergar sua evolução com clareza.
        </p>
        <div class="hero-actions">
          <a class="primary-action" href="#proposta">Conheça a proposta <span aria-hidden="true">↗</span></a>
          <a class="secondary-action" href="https://github.com/thiagocanali/MeAprovae" target="_blank" rel="noreferrer">
            Acompanhe o projeto
          </a>
        </div>
        <p class="status-note">Estamos construindo a primeira versão. Ainda não há cadastro ou dados de estudo disponíveis.</p>
      </div>

      <div class="hero-visual" aria-label="Ilustração abstrata de progresso nos estudos">
        <div class="visual-glow" />
        <div class="study-card">
          <div class="study-card-top">
            <span class="mini-label">SUA EVOLUÇÃO</span>
            <span class="live-dot" />
          </div>
          <div class="progress-number">01<span>/03</span></div>
          <p class="progress-caption">Um passo por vez.</p>
          <div class="progress-track"><span /></div>
          <div class="progress-footer"><span>Planejar</span><span>Estudar</span><span>Avançar</span></div>
          <div class="card-divider" />
          <div class="quote-mark">“</div>
          <p class="study-quote">Constância hoje.<br />Conquista amanhã.</p>
          <span class="quote-decoration">✳</span>
        </div>
        <span class="orbit orbit-one" />
        <span class="orbit orbit-two" />
        <span class="floating-star">✳</span>
      </div>
    </section>

    <section id="proposta" class="value-section">
      <div class="section-heading">
        <p class="eyebrow">MENOS DISPERSÃO. MAIS CLAREZA.</p>
        <h2>Estudar com um plano muda o caminho.</h2>
      </div>
      <div class="value-grid">
        <article class="value-card">
          <span class="value-index">01</span>
          <h3>Saiba o que estudar</h3>
          <p>Organize seu objetivo e visualize os assuntos do edital em uma estrutura clara.</p>
        </article>
        <article class="value-card">
          <span class="value-index">02</span>
          <h3>Aprenda praticando</h3>
          <p>Resolva questões, entenda seus erros e fortaleça o que ainda precisa de atenção.</p>
        </article>
        <article class="value-card">
          <span class="value-index">03</span>
          <h3>Enxergue sua evolução</h3>
          <p>Acompanhe seu progresso com indicadores construídos a partir do seu estudo real.</p>
        </article>
      </div>
    </section>

    <footer class="footer">
      <NuxtLink class="brand footer-brand" to="/"><span class="brand-mark">M</span><span>Me Aprovaê</span></NuxtLink>
      <span>Um projeto em construção, feito para quem não desistiu do seu objetivo.</span>
      <span>© {{ new Date().getFullYear() }} Me Aprovaê</span>
    </footer>
  </main>
</template>
