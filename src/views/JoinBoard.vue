<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBoardsStore } from '@/stores/boards'
import { useAuthStore } from '@/stores/auth'

const route  = useRoute()
const router = useRouter()
const store  = useBoardsStore()
const auth   = useAuthStore()

const status = ref('joining')  // joining, error
const error  = ref('')

onMounted(async () => {
  try {
    const board = await store.joinBoard(route.params.token)
    router.replace({ name: 'Board', params: { id: board.id } })
  } catch (e) {
    status.value = 'error'
    error.value  = e?.message ?? 'Something went wrong.'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="text-center">

      <template v-if="status === 'joining'">
        <div class="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p class="text-sm text-gray-500">Joining board…</p>
      </template>

      <template v-else>
        <p class="text-4xl mb-4">⚠️</p>
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Couldn't join</h2>
        <p class="text-sm text-gray-400 mb-4">{{ error }}</p>
        <RouterLink to="/" class="text-sm text-indigo-600 font-medium hover:text-indigo-700">
          Go to my boards →
        </RouterLink>
      </template>

    </div>
  </div>
</template>
