<script setup lang="ts">
import { getAuthErrorMessage } from '~~/shared/domain/auth/error-message'
import authMiddleware from '~/middleware/auth'

definePageMeta({ layout: false, middleware: authMiddleware })
useSeoMeta({ title: 'Definir nova senha | Me Aprovaê' })

const password = ref('')
const confirmPassword = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const pending = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

async function submit() {
  errorMessage.value = ''
  successMessage.value = ''
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'As senhas não coincidem.'
    return
  }

  pending.value = true
  try {
    await $fetch('/api/auth/update-password', {
      method: 'POST',
      body: { password: password.value },
    })
    successMessage.value = 'Senha atualizada. Você já pode continuar seus estudos.'
    password.value = ''
    confirmPassword.value = ''
  } catch (error: unknown) {
    errorMessage.value = getAuthErrorMessage(error, 'Não foi possível atualizar a senha. Tente novamente.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <NuxtLink class="auth-brand" to="/">Me Aprovaê</NuxtLink>
    <section class="auth-panel">
      <p class="auth-eyebrow">NOVA SENHA</p>
      <h1>Escolha uma nova senha.</h1>
      <p class="auth-description">Use pelo menos 8 caracteres. O link de recuperação é temporário.</p>
      <form class="auth-form" @submit.prevent="submit">
        <label for="password">Nova senha</label>
        <div class="auth-password-field">
          <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" required minlength="8" maxlength="72">
          <button class="auth-password-toggle" type="button" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path v-if="showPassword" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 9 4 10 8a11.6 11.6 0 0 1-3.1 5.2M6.2 6.2A11.7 11.7 0 0 0 2 12c1 4 4.8 8 10 8 1.4 0 2.7-.3 3.9-.8"/><path v-else d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
          </button>
        </div>
        <label for="confirmPassword">Confirme a nova senha</label>
        <div class="auth-password-field">
          <input id="confirmPassword" v-model="confirmPassword" :type="showConfirmPassword ? 'text' : 'password'" autocomplete="new-password" required minlength="8" maxlength="72">
          <button class="auth-password-toggle" type="button" :aria-label="showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showConfirmPassword = !showConfirmPassword">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path v-if="showConfirmPassword" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 9 4 10 8a11.6 11.6 0 0 1-3.1 5.2M6.2 6.2A11.7 11.7 0 0 0 2 12c1 4 4.8 8 10 8 1.4 0 2.7-.3 3.9-.8"/><path v-else d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
          </button>
        </div>
        <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="auth-success" role="status">{{ successMessage }}</p>
        <button type="submit" :disabled="pending">{{ pending ? 'Atualizando…' : 'Atualizar senha' }}</button>
      </form>
      <p class="auth-switch"><NuxtLink to="/login">Voltar para entrar</NuxtLink></p>
    </section>
  </main>
</template>
