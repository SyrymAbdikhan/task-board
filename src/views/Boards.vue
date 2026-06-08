<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useBoardsStore } from '@/stores/boards'

const store  = useBoardsStore()
const router = useRouter()

const newBoardTitle = ref('')
const creating      = ref(false)
const deleting      = ref(null)
const leaving       = ref(null)

onMounted(() => store.fetchBoards())

async function createBoard() {
  if (!newBoardTitle.value.trim()) return
  creating.value = true
  try {
    const board = await store.createBoard(newBoardTitle.value.trim())
    newBoardTitle.value = ''
    router.push({ name: 'Board', params: { id: board.id } })
  } finally {
    creating.value = false
  }
}

async function deleteBoard(board) {
  if (!confirm(`Delete "${board.title}"? All tasks will be removed.`)) return
  deleting.value = board.id
  try {
    await store.deleteBoard(board.id)
  } finally {
    deleting.value = null
  }
}

async function leaveBoard(board) {
  if (!confirm(`Leave "${board.title}"?`)) return
  leaving.value = board.id
  try {
    await store.leaveBoard(board.id)
  } finally {
    leaving.value = null
  }
}
</script>

<template>
  <div class="max-w-3xl w-full mx-auto px-6 py-10">

    <!-- page header -->
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900">My Boards</h1>
    </div>

    <!-- create board -->
    <form @submit.prevent="createBoard" class="flex gap-3 mb-10">
      <input
        v-model="newBoardTitle"
        placeholder="New board name…"
        maxlength="60"
        class="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <button
        type="submit"
        :disabled="creating || !newBoardTitle.trim()"
        class="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ creating ? 'Creating…' : 'Create' }}
      </button>
    </form>

    <!-- loading -->
    <div v-if="store.loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="h-28 bg-gray-100 rounded-xl animate-pulse" />
    </div>

    <template v-else>
      <!-- owned boards -->
      <div v-if="store.boards.length === 0" class="text-center py-16 text-gray-400">
        <svg class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
        </svg>
        <p class="text-sm">No boards yet. Create your first one above.</p>
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <div
          v-for="board in store.boards"
          :key="board.id"
          class="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
          @click="router.push({ name: 'Board', params: { id: board.id } })"
        >
          <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
            <svg class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
            </svg>
          </div>
          <h2 class="font-semibold text-gray-900 truncate">{{ board.title }}</h2>
          <p class="text-xs text-gray-400 mt-1">
            {{ new Date(board.created_at).toLocaleDateString() }}
          </p>

          <button
            @click.stop="deleteBoard(board)"
            :disabled="deleting === board.id"
            class="absolute top-3 right-3 p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- shared boards -->
      <template v-if="store.sharedBoards.length > 0">
        <h2 class="text-base font-semibold text-gray-700 mb-4">Shared with me</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="board in store.sharedBoards"
            :key="board.id"
            class="group relative bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer"
            @click="router.push({ name: 'Board', params: { id: board.id } })"
          >
            <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <svg class="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 class="font-semibold text-gray-900 truncate">{{ board.title }}</h2>
            <p class="text-xs text-gray-400 mt-1 capitalize">{{ board.memberRole }}</p>

            <button
              @click.stop="leaveBoard(board)"
              :disabled="leaving === board.id"
              class="absolute top-3 right-3 p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all text-xs font-medium"
              title="Leave board"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
