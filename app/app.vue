<script setup lang="ts">
const { theme, isDark } = useAppTheme()

useHead({
  meta: [{ name: 'theme-color', content: computed(() => isDark.value ? '#0d1625' : '#f7f6f1') }],
})
</script>

<template>
  <div class="app-shell" :data-theme="theme">
    <NuxtLayout><NuxtPage /></NuxtLayout>
  </div>
</template>
