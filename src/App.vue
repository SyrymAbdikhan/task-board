<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppHeader from '@/components/AppHeader.vue'

const auth  = useAuthStore()
const route = useRoute()

// hide the header on login and register
const showHeader = computed(() => !route.meta.guest)

auth.init()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader v-if="showHeader" />
    <main class="flex-1 flex flex-col">
      <RouterView />
    </main>
  </div>
</template>
