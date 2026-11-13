<script setup lang="ts">
import { getAuthErrorMessage } from '~~/shared/domain/auth/error-message'
definePageMeta({ layout: false })
useSeoMeta({ title: 'Entrar | Me Aprovaê' })

const email = ref('')
const password = ref('')
const pending = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  pending.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await navigateTo('/app')
  } catch (error: unknown) {
    errorMessage.value = getAuthErrorMessage(error, 'Não foi possível entrar. Tente novamente.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-page">
    <NuxtLink class="auth-brand" to="/">Me Aprovaê</NuxtLink>
    <section class="auth-panel">
      <p class="auth-eyebrow">BEM-VINDO DE VOLTA</p>
      <h1>Continue sua jornada.</h1>
      <p class="auth-description">Entre para acompanhar seus estudos e sua evolução.</p>
      <form class="auth-form" @submit.prevent="submit">
        <label for="email">E-mail</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required maxlength="254">
        <label for="password">Senha</label>
        <div class="auth-password-field">
          <input id="password" v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required maxlength="72">
          <button class="auth-password-toggle" type="button" :aria-label="showPassword ? 'Ocultar senha' : 'Mostrar senha'" @click="showPassword = !showPassword">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path v-if="showPassword" d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 9 4 10 8a11.6 11.6 0 0 1-3.1 5.2M6.2 6.2A11.7 11.7 0 0 0 2 12c1 4 4.8 8 10 8 1.4 0 2.7-.3 3.9-.8"/><path v-else d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>
          </button>
        </div>
        <p v-if="errorMessage" class="auth-error" role="alert" aria-live="polite">{{ errorMessage }}</p>
        <button type="submit" :disabled="pending" :aria-busy="pending">{{ pending ? 'Entrando…' : 'Entrar' }}</button>
      </form>
      <p class="auth-switch"><NuxtLink to="/esqueci-senha">Esqueci minha senha</NuxtLink></p>
      <p class="auth-switch">Ainda não tem conta? <NuxtLink to="/cadastro">Criar conta</NuxtLink></p>
    </section>
  </main>
</template>
