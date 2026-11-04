<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Criar conta | Me Aprovaê' })

const displayName = ref('')
const email = ref('')
const password = ref('')
const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  pending.value = true
  try {
    const result = await $fetch<{ requiresEmailConfirmation: boolean }>('/api/auth/register', {
      method: 'POST',
      body: { displayName: displayName.value, email: email.value, password: password.value },
    })
    if (result.requiresEmailConfirmation) {
      successMessage.value = 'Conta criada. Confira seu e-mail para confirmar o cadastro antes de entrar.'
      return
    }
    await navigateTo('/app')
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível criar a conta.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <NuxtLink class="auth-brand" to="/">Me Aprovaê</NuxtLink>
    <section class="auth-panel">
      <p class="auth-eyebrow">SEU PRÓXIMO PASSO</p>
      <h1>Crie sua conta.</h1>
      <p class="auth-description">Comece a organizar sua preparação para concursos.</p>
      <form class="auth-form" @submit.prevent="submit">
        <label for="displayName">Como podemos chamar você?</label>
        <input id="displayName" v-model="displayName" type="text" autocomplete="name" required minlength="2" maxlength="60">
        <label for="email">E-mail</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required maxlength="254">
        <label for="password">Senha (mínimo de 8 caracteres)</label>
        <input id="password" v-model="password" type="password" autocomplete="new-password" required minlength="8" maxlength="72">
        <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="auth-success" role="status">{{ successMessage }}</p>
        <button type="submit" :disabled="pending">{{ pending ? 'Criando conta…' : 'Criar minha conta' }}</button>
      </form>
      <p class="auth-switch">Já tem uma conta? <NuxtLink to="/login">Entrar</NuxtLink></p>
    </section>
  </main>
</template>
