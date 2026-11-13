<script setup lang="ts">
const links = [
  { to: '/admin', label: 'Gestão' },
  { to: '/admin/revisao', label: 'Fila de revisão' },
  { to: '/admin/acervo', label: 'Acervo' },
  { to: '/admin/importar', label: 'Importar' },
  { to: '/app', label: 'Área do estudante' },
]
</script>

<template>
  <header class="student-header student-navigation">
    <NuxtLink class="auth-brand" to="/admin">Me Aprovaê · Editorial</NuxtLink>
    <nav class="student-nav student-navigation-links" aria-label="Navegação editorial">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        :active-class="link.to === '/admin' ? '' : 'is-active'"
        exact-active-class="is-active"
      >{{ link.label }}</NuxtLink>
    </nav>
  </header>
</template>
