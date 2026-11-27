<template>
  <div class="public-shell" data-ui="public">
    <a class="contest-skip" href="#public-main">Ir para o conteúdo</a>
    <header class="public-topbar">
      <NuxtLink class="contest-brand" to="/" aria-label="Me Aprovaê, início"
        ><span aria-hidden="true">m.</span>Me Aprovaê</NuxtLink
      >
      <nav aria-label="Acesso à plataforma">
        <ThemeToggle /><NuxtLink to="/login" class="public-login"
          >Entrar</NuxtLink
        ><NuxtLink class="contest-btn secondary" to="/cadastro"
          >Criar conta →</NuxtLink
        >
      </nav>
    </header>
    <main id="public-main" tabindex="-1"><slot /></main>
    <footer class="public-footer">
      <NuxtLink class="contest-brand" to="/"
        ><span aria-hidden="true">m.</span>Me Aprovaê</NuxtLink
      ><span>Um passo seu. Um futuro inteiro.</span
      ><span>© {{ new Date().getFullYear() }} Me Aprovaê</span>
    </footer>
  </div>
</template>
