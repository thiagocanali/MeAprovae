<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({ title: 'Criar conta | Me Aprovaê' })

const displayName = ref('')
const email = ref('')
const password = ref('')
const pending = ref(false)
const showPassword = ref(false)
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
        <div class="auth-password-field">
          <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required minlength="8" maxlength="72">
          <button class="auth-password-toggle" type="button" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path v-if="showPassword" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 9 4 10 8a11.6 11.6 0 0 1-3.1 5.2M6.2 6.2A11.7 11.7 0 0 0 2 12c1 4 4.8 8 10 8 1.4 0 2.7-.3 3.9-.8"/><path v-else d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
          </button>
        </div>
        <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="auth-success" role="status">{{ successMessage }}</p>
        <button type="submit" :disabled="pending">{{ pending ? 'Criando conta…' : 'Criar minha conta' }}</button>
      </form>
      <p class="auth-switch">Já tem uma conta? <NuxtLink to="/login">Entrar</NuxtLink></p>
    </section>
  </main>
</template>
