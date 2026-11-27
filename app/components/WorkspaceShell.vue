<script setup lang="ts">
const route = useRoute()
const menuOpen = ref(false)
const menuButton = ref<HTMLButtonElement | null>(null)
const isEditorial = computed(() => route.path.startsWith('/admin'))
const studyLinks = [
  { to: '/app', label: 'Visão geral', icon: 'home', aliases: [] },
  {
    to: '/app/concursos',
    label: 'Concursos',
    icon: 'target',
    aliases: ['/app/concursos/'],
  },
  {
    to: '/app/questoes',
    label: 'Banco de questões',
    icon: 'questions',
    aliases: [],
  },
  {
    to: '/app/provas',
    label: 'Simulados',
    icon: 'clock',
    aliases: ['/app/simulados/'],
  },
  {
    to: '/app/provas-oficiais',
    label: 'Provas oficiais',
    icon: 'questions',
    aliases: [],
  },
  {
    to: '/app/desempenho',
    label: 'Meu desempenho',
    icon: 'chart',
    aliases: [],
  },
  {
    to: '/app/comparar',
    label: 'Comparar minha prática',
    icon: 'chart',
    aliases: [],
  },
  { to: '/app/favoritas', label: 'Favoritas', icon: 'star', aliases: [] },
  { to: '/app/erros', label: 'Revisar erros', icon: 'review', aliases: [] },
  {
    to: '/app/historico',
    label: 'Meu histórico',
    icon: 'history',
    aliases: [],
  },
  { to: '/app/onboarding', label: 'Meu objetivo', icon: 'target', aliases: [] },
] as const
const editorialLinks = [
  {
    to: '/admin/simulados',
    label: 'Modelos de simulados',
    icon: 'clock',
    aliases: ['/admin/simulados/'],
  },
  { to: '/admin', label: 'Gestão editorial', icon: 'home', aliases: [] },
  {
    to: '/admin/revisao',
    label: 'Fila de revisão',
    icon: 'review',
    aliases: [],
  },
  {
    to: '/admin/acervo',
    label: 'Acervo em revisão',
    icon: 'questions',
    aliases: [],
  },
  {
    to: '/admin/importar',
    label: 'Importar questões',
    icon: 'upload',
    aliases: [],
  },
] as const
function active(link: { to: string; aliases: readonly string[] }) {
  return (
    route.path === link.to ||
    link.aliases.some((path) => route.path.startsWith(path))
  )
}
const currentLabel = computed(
  () =>
    [...editorialLinks, ...studyLinks].find(active)?.label ||
    'Minha preparação',
)
watch(
  () => route.fullPath,
  () => {
    menuOpen.value = false
  },
)
function closeMenu() {
  if (menuOpen.value) {
    menuOpen.value = false
    menuButton.value?.focus()
  }
}
</script>
<template>
  <div
    class="contest-hub workspace-shell"
    data-ui="workspace"
    @keydown.esc="closeMenu"
  >
    <a class="contest-skip" href="#workspace-main">Ir para o conteúdo</a>
    <aside class="contest-sidebar" aria-label="Área de estudos">
      <div class="workspace-brand-row">
        <NuxtLink class="contest-brand" to="/app"
          ><span aria-hidden="true">m.</span>Me Aprovaê</NuxtLink
        ><button
          ref="menuButton"
          type="button"
          class="workspace-menu-button"
          :aria-expanded="menuOpen"
          aria-controls="workspace-navigation"
          @click="menuOpen = !menuOpen"
        >
          {{ menuOpen ? 'Fechar menu' : 'Abrir menu' }}
          <span aria-hidden="true">{{ menuOpen ? '×' : '☰' }}</span>
        </button>
      </div>
      <div
        id="workspace-navigation"
        class="workspace-navigation"
        :class="{ 'is-open': menuOpen }"
      >
        <p class="contest-nav-label">SUA PREPARAÇÃO</p>
        <nav aria-label="Navegação principal">
          <NuxtLink
            v-for="link in studyLinks"
            :key="link.to"
            :to="link.to"
            :class="{ 'contest-nav-active': active(link) }"
            :aria-current="
              active(link)
                ? route.path === link.to
                  ? 'page'
                  : 'location'
                : undefined
            "
            ><ContestIcon :name="link.icon" />{{ link.label }}</NuxtLink
          >
        </nav>
        <template v-if="isEditorial"
          ><p class="contest-nav-label">ESPAÇO EDITORIAL</p>
          <nav aria-label="Navegação editorial">
            <NuxtLink
              v-for="link in editorialLinks"
              :key="link.to"
              :to="link.to"
              :class="{ 'contest-nav-active': active(link) }"
              :aria-current="active(link) ? 'page' : undefined"
              ><ContestIcon :name="link.icon" />{{ link.label }}</NuxtLink
            >
          </nav></template
        >
      </div>
      <div class="contest-sidebar-note">
        <span class="contest-kicker">UM PASSO POR VEZ</span>
        <p>Encontre seu objetivo.<br />Construa sua preparação.</p>
        <NuxtLink to="/app/questoes">Continuar estudando →</NuxtLink>
      </div>
    </aside>
    <div class="contest-workspace">
      <header class="contest-topbar">
        <span
          >{{ isEditorial ? 'Espaço editorial' : 'Minha preparação' }}
          <span aria-hidden="true">/</span> {{ currentLabel }}</span
        >
        <div class="workspace-topbar-actions">
          <ThemeToggle /><NuxtLink to="/app"
            >Minha área <ContestIcon name="external"
          /></NuxtLink>
        </div>
      </header>
      <main id="workspace-main" tabindex="-1"><slot /></main>
      <footer class="contest-footer">
        Me Aprovaê <span>Estude no seu ritmo. Evolua com consistência.</span>
      </footer>
    </div>
  </div>
</template>
