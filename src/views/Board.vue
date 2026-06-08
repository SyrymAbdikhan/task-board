<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBoardsStore, PRESET_COLORS } from '@/stores/boards'
import { useAuthStore } from '@/stores/auth'
import Column from '@/components/Column.vue'
import ShareModal from '@/components/ShareModal.vue'

const route  = useRoute()
const router = useRouter()
const store  = useBoardsStore()
const auth   = useAuthStore()

const board = computed(() =>
  store.allBoards.find(b => b.id === route.params.id) ?? null
)

// user can edit if they own the board or are an editor member
const canEdit = computed(() => {
  if (!board.value) return false
  if (board.value.user_id === auth.user?.id) return true
  if (board.value.memberRole === 'editor') return true
  return false
})

onMounted(async () => {
  if (!store.allBoards.length) await store.fetchBoards()
  if (!board.value) { router.push({ name: 'Boards' }); return }
  store.setCurrentBoard(board.value)
  store.fetchTasks(board.value.id)
})

onUnmounted(() => {
  store.clearTasks()
  store.clearMembers()
  store.setCurrentBoard(null)
})

// add column
const addingColumn = ref(false)
const newColTitle  = ref('')
const newColColor  = ref(PRESET_COLORS[7])
const addInput     = ref(null)

async function startAdd() {
  addingColumn.value = true
  newColTitle.value  = ''
  newColColor.value  = PRESET_COLORS[7]
  await nextTick()
  addInput.value?.focus()
}

async function commitAdd() {
  const title = newColTitle.value.trim()
  if (!title) { addingColumn.value = false; return }
  await store.addColumn(board.value.id, title, newColColor.value)
  addingColumn.value = false
}

function cancelAdd() { addingColumn.value = false }

// share modal
const showShare = ref(false)
</script>

<template>
  <div class="h-[calc(100vh-57px)] flex flex-col">

    <!-- board header -->
    <div class="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0">
      <RouterLink to="/" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>

      <h1 class="text-lg font-semibold text-gray-900 flex-1 truncate">{{ board?.title }}</h1>

      <!-- view only badge -->
      <span
        v-if="board && !canEdit"
        class="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500"
      >
        View only
      </span>

      <!-- share button -->
      <button
        v-if="board && board.user_id === auth.user?.id"
        @click="showShare = true"
        class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        Share
      </button>
    </div>

    <!-- board canvas -->
    <div class="flex gap-4 p-6 overflow-x-auto flex-1 items-start">

      <template v-if="store.loading">
        <div v-for="i in 3" :key="i" class="w-72 shrink-0 bg-gray-100 rounded-xl h-48 animate-pulse" />
      </template>

      <template v-else-if="board">
        <Column
          v-for="col in board.columns"
          :key="col.id"
          :column="col"
          :board-id="board.id"
          :can-edit="canEdit"
        />

        <!-- add new column -->
        <div v-if="canEdit" class="w-72 shrink-0">
          <div
            v-if="!addingColumn"
            class="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500 cursor-pointer transition-colors select-none"
            @click="startAdd"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span class="text-sm font-medium">Add column</span>
          </div>

          <div v-else class="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <input
              ref="addInput"
              v-model="newColTitle"
              placeholder="Column name…"
              maxlength="40"
              class="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              @keydown.enter="commitAdd"
              @keydown.esc="cancelAdd"
            />
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="c in PRESET_COLORS"
                :key="c"
                class="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                :style="{ backgroundColor: c }"
                :class="newColColor === c ? 'ring-2 ring-offset-1 ring-gray-600 scale-110' : ''"
                @click="newColColor = c"
              />
            </div>
            <div class="flex gap-2">
              <button
                :disabled="!newColTitle.trim()"
                class="flex-1 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
                @click="commitAdd"
              >Add</button>
              <button class="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700" @click="cancelAdd">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <ShareModal v-if="showShare && board" :board="board" @close="showShare = false" />
  </div>
</template>
