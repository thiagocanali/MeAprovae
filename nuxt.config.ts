const environment = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {}

export default defineNuxtConfig({
  compatibilityDate: '2026-11-04',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', '~/assets/css/auth.css'],
  runtimeConfig: {
    supabaseUrl: environment.SUPABASE_URL ?? '',
    supabaseAnonKey: environment.SUPABASE_ANON_KEY ?? '',
  },
  typescript: {
    strict: true,
    typeCheck: true,
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Me Aprovaê — sua jornada até a aprovação',
      meta: [
        {
          name: 'description',
          content: 'Organize seus estudos para concursos públicos, acompanhe editais e evolua questão por questão.',
        },
        { name: 'theme-color', content: '#101827' },
      ],
    },
  },
})
