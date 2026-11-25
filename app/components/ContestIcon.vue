<script setup lang="ts">
const props = defineProps<{
  name:
    | 'home'
    | 'target'
    | 'questions'
    | 'clock'
    | 'chart'
    | 'star'
    | 'external'
}>()
const paths = {
  home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  target:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z',
  questions: 'M4 3h16v18H4ZM8 8h8M8 12h8M8 16h5',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4v6l4 2',
  chart: 'M4 3v17h17M8 15l4-5 4 2 5-7',
  star: 'm12 2 3.1 6.3L22 9.3l-5 4.9 1.2 6.8-6.2-3.2L5.8 21 7 14.2l-5-4.9 6.9-1Z',
  external: 'M14 3h7v7m0-7L10 14M10 3H4v17h17v-6',
}
</script>
<template>
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[props.name]" />
  </svg>
</template>
