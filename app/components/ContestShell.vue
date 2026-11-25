<script setup lang="ts">
import '~/assets/css/contests.css'
</script>
<template>
  <div class="contest-hub">
    <a class="contest-skip" href="#contest-main">Ir para o conteúdo</a>
    <aside class="contest-sidebar" aria-label="Área de estudos">
      <NuxtLink class="contest-brand" to="/app"
        ><span aria-hidden="true">m.</span>Me Aprovaê</NuxtLink
      >
      <p class="contest-nav-label">SUA PREPARAÇÃO</p>
      <nav aria-label="Navegação principal">
        <NuxtLink to="/app"><ContestIcon name="home" />Visão geral</NuxtLink>
        <NuxtLink
          to="/app/concursos"
          class="contest-nav-active"
          aria-current="page"
          ><ContestIcon name="target" />Concursos</NuxtLink
        >
        <NuxtLink to="/app/questoes"
          ><ContestIcon name="questions" />Banco de questões</NuxtLink
        >
        <NuxtLink to="/app/provas"
          ><ContestIcon name="clock" />Simulados</NuxtLink
        >
        <NuxtLink to="/app/desempenho"
          ><ContestIcon name="chart" />Meu desempenho</NuxtLink
        >
        <NuxtLink to="/app/provas-oficiais"
          ><ContestIcon name="questions" />Provas oficiais</NuxtLink
        >
        <NuxtLink to="/app/favoritas"
          ><ContestIcon name="star" />Favoritas</NuxtLink
        >
      </nav>
      <div class="contest-sidebar-note">
        <span class="contest-kicker">UM PASSO POR VEZ</span>
        <p>Encontre seu objetivo.<br />Construa sua preparação.</p>
        <NuxtLink to="/app/questoes">Continuar estudando →</NuxtLink>
      </div>
    </aside>
    <div class="contest-workspace">
      <header class="contest-topbar">
        <span>Seu espaço de preparação</span
        ><NuxtLink to="/app"
          >Minha área <ContestIcon name="external"
        /></NuxtLink>
      </header>
      <main id="contest-main" tabindex="-1"><slot /></main>
      <footer class="contest-footer">
        Me Aprovaê
        <span
          >Consulte o edital e a fonte do órgão para informações oficiais.</span
        >
      </footer>
    </div>
  </div>
</template>
