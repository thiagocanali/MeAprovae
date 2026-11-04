<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
useSeoMeta({ title: 'Minha área | Me Aprovaê' })

const { data } = await useFetch<{ user: { id: string; email?: string } | null }>('/api/auth/me')
const pending = ref(false)
const errorMessage = ref('')

async function logout() {
  pending.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/auth/logout', { method: 'POST' })
    await navigateTo('/login')
  } catch {
    errorMessage.value = 'Não foi possível encerrar a sessão. Tente novamente.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="student-home">
    <header class="student-header">
      <NuxtLink class="auth-brand" to="/">Me Aprovaê</NuxtLink>
      <button class="logout-button" :disabled="pending" @click="logout">{{ pending ? 'Saindo…' : 'Sair' }}</button>
    </header>
    <section class="student-welcome">
      <p class="auth-eyebrow">ÁREA DO ESTUDANTE</p>
      <h1>Seu próximo passo começa aqui.</h1>
      <p v-if="data?.user?.email" class="auth-description">Sessão autenticada: {{ data.user.email }}</p>
      <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
      <div class="student-empty">
        <h2>Vamos organizar seus estudos.</h2>
        <p>Sua conta está conectada. O próximo módulo será a seleção de concurso e o acompanhamento do edital. Nenhum indicador fictício será exibido aqui.</p>
        <span>Preparação do ambiente de estudos</span>
      </div>
    </section>
  </main>
</template>
