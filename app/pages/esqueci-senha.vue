<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Recuperar senha | Me Aprovaê' })

const email = ref('')
const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  pending.value = true
  try {
    await $fetch('/api/auth/recover', { method: 'POST', body: { email: email.value } })
    successMessage.value = 'Se houver uma conta associada a esse e-mail, enviaremos as instruções de recuperação.'
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível solicitar a recuperação.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <NuxtLink class="auth-brand" to="/">Me Aprovaê</NuxtLink>
    <section class="auth-panel">
      <p class="auth-eyebrow">RECUPERAÇÃO DE ACESSO</p>
      <h1>Vamos recuperar sua conta.</h1>
      <p class="auth-description">Informe o e-mail cadastrado para receber um link seguro de redefinição.</p>
      <form class="auth-form" @submit.prevent="submit">
        <label for="email">E-mail</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required maxlength="254">
        <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="auth-success" role="status">{{ successMessage }}</p>
        <button type="submit" :disabled="pending">{{ pending ? 'Enviando…' : 'Enviar instruções' }}</button>
      </form>
      <p class="auth-switch"><NuxtLink to="/login">Voltar para entrar</NuxtLink></p>
    </section>
  </main>
</template>
