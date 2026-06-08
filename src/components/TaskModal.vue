<script setup>
import { ref, watch } from 'vue'
import { useBoardsStore } from '@/stores/boards'

const props = defineProps({
  task:        { type: Object, default: null  },
  columnId:    { type: String, required: true },
  columnTitle: { type: String, default: ''    },
  boardId:     { type: String, required: true },
})

const emit = defineEmits(['close'])
const store = useBoardsStore()

const title       = ref('')
const description = ref('')
const saving      = ref(false)

watch(
  () => props.task,
  (t) => {
    title.value       = t?.title       ?? ''
    description.value = t?.description ?? ''
  },
  { immediate: true }
)

async function save() {
  if (!title.value.trim()) return
  saving.value = true
  try {
    if (props.task) {
      await store.updateTask(props.task.id, {
        title:       title.value.trim(),
        description: description.value.trim(),
      })
    } else {
      await store.createTask({
        boardId:     props.boardId,
        columnId:    props.columnId,
        title:       title.value.trim(),
        description: description.value.trim(),
      })
    }
    emit('close')
  } finally {
    saving.value = false
  }
}

function onOverlayClick(e) {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      @click="onOverlayClick"
    >
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <div class="flex items-center justify-between mb-5">
          <h2 class="text-base font-semibold text-gray-900">
            {{ task ? 'Edit task' : `Add task · ${columnTitle}` }}
          </h2>
          <button
            @click="emit('close')"
            class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="save" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              v-model="title"
              required
              autofocus
              placeholder="Task title"
              maxlength="120"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Description <span class="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              v-model="description"
              rows="3"
              placeholder="Add a description…"
              maxlength="500"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div class="flex justify-end gap-3 pt-1">
            <button
              type="button"
              @click="emit('close')"
              class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="saving || !title.trim()"
              class="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ saving ? 'Saving…' : (task ? 'Save changes' : 'Create task') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>
