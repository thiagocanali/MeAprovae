<script setup lang="ts">
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
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível entrar.'
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
            {{ showPassword ? 'Ocultar' : 'Mostrar' }}
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
