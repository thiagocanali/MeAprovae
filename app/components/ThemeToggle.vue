<script setup lang="ts">
withDefaults(defineProps<{ floating?: boolean }>(), {
  floating: false,
})

const { isDark, toggleTheme } = useAppTheme()
</script>

<template>
  <button
    class="theme-toggle"
    :class="{ 'theme-toggle-floating': floating }"
    type="button"
    :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
    :aria-pressed="isDark"
    @click="toggleTheme"
  >
    <span class="theme-switch-track" aria-hidden="true"><span /></span>
    <span>{{ isDark ? 'Escuro' : 'Claro' }}</span>
  </button>
</template>
