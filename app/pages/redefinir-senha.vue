<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'auth' })
useSeoMeta({ title: 'Definir nova senha | Me Aprovaê' })

const password = ref('')
const confirmPassword = ref('')
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
    errorMessage.value = error instanceof Error ? error.message : 'Não foi possível atualizar a senha.'
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
        <input id="password" v-model="password" type="password" autocomplete="new-password" required minlength="8" maxlength="72">
        <label for="confirmPassword">Confirme a nova senha</label>
        <input id="confirmPassword" v-model="confirmPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="72">
        <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>
        <p v-if="successMessage" class="auth-success" role="status">{{ successMessage }}</p>
        <button type="submit" :disabled="pending">{{ pending ? 'Atualizando…' : 'Atualizar senha' }}</button>
      </form>
      <p class="auth-switch"><NuxtLink to="/login">Voltar para entrar</NuxtLink></p>
    </section>
  </main>
</template>
