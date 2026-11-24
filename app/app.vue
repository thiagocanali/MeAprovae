<script setup lang="ts">
const route = useRoute()
const { theme, isDark } = useAppTheme()

useHead({
  meta: [{ name: 'theme-color', content: computed(() => isDark.value ? '#111b17' : '#f7f6f1') }],
})
</script>

<template>
  <div class="app-shell" :data-theme="theme">
    <NuxtPage />
    <ThemeToggle v-if="route.path !== '/'" :floating="true" />
  </div>
</template>
