<script setup>
import { ref } from 'vue'
import { useBoardsStore } from '@/stores/boards'

const props = defineProps({
  task:    { type: Object,  required: true },
  canEdit: { type: Boolean, default: true  },
})

const emit  = defineEmits(['edit'])
const store = useBoardsStore()
const deleting = ref(false)

async function remove(e) {
  e.stopPropagation()
  if (!confirm('Delete this task?')) return
  deleting.value = true
  try {
    await store.deleteTask(props.task.id)
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div
    class="group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm hover:border-gray-300 transition-all select-none"
    :class="canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'"
    @click="canEdit && emit('edit')"
  >
    <div class="flex items-start justify-between gap-2">
      <p class="text-sm font-medium text-gray-900 leading-snug flex-1">{{ task.title }}</p>
      <button
        v-if="canEdit"
        @click="remove"
        :disabled="deleting"
        class="shrink-0 p-0.5 rounded text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
    <p v-if="task.description" class="mt-1 text-xs text-gray-400 line-clamp-2">
      {{ task.description }}
    </p>
  </div>
</template>
