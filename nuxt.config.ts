export default defineNuxtConfig({
  compatibilityDate: '2026-11-04',
  devtools: { enabled: false },
  css: ['~/assets/css/main.css', '~/assets/css/auth.css'],
  runtimeConfig: {
    supabaseUrl: '',
    supabaseAnonKey: '',
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
