<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number } }>()
const { theme } = useAppTheme()
const missing = computed(() => props.error.statusCode === 404)
useSeoMeta({
  title: () =>
    `${missing.value ? 'Página não encontrada' : 'Não foi possível abrir a página'} | Me Aprovaê`,
})
</script>
<template>
  <div class="app-shell" :data-theme="theme">
    <PublicShell
      ><section class="public-error">
        <p class="contest-kicker">
          {{ missing ? 'PÁGINA NÃO ENCONTRADA' : 'VAMOS TENTAR NOVAMENTE' }}
        </p>
        <h1>
          {{
            missing
              ? 'Esse caminho ainda não existe.'
              : 'Não conseguimos abrir esta página.'
          }}
        </h1>
        <p>Volte ao início para continuar sua preparação.</p>
        <button class="contest-btn" @click="clearError({ redirect: '/' })">
          Voltar ao início →
        </button>
      </section></PublicShell
    >
  </div>
</template>
