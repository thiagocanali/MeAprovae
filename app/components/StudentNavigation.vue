<script setup lang="ts">
withDefaults(defineProps<{
  showLogout?: boolean
  logoutPending?: boolean
}>(), {
  showLogout: false,
  logoutPending: false,
})
defineEmits<{ logout: [] }>()
const links = [
  { to: '/app', label: 'Início' },
  { to: '/app/questoes', label: 'Questões' },
  { to: '/app/provas', label: 'Simulados' },
  { to: '/app/concursos', label: 'Concursos' },
  { to: '/app/desempenho', label: 'Desempenho' },
  { to: '/app/favoritas', label: 'Favoritas' },
  { to: '/app/historico', label: 'Histórico' },
]
</script>

<template>
  <header class="student-header student-navigation">
    <NuxtLink class="auth-brand" to="/app" aria-label="Me Aprovaê — início">Me Aprovaê</NuxtLink>
    <nav class="student-nav student-navigation-links" aria-label="Navegação principal do estudante">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        active-class="is-active"
        :exact-active-class="link.to === '/app' ? 'is-active' : undefined"
      >{{ link.label }}</NuxtLink>
    </nav>
    <button
      v-if="showLogout"
      class="logout-button"
      type="button"
      :disabled="logoutPending"
      @click="$emit('logout')"
    >{{ logoutPending ? 'Saindo…' : 'Sair' }}</button>
  </header>
</template>
