<script setup>
import { ref, watch, nextTick, onUnmounted } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useBoardsStore, PRESET_COLORS } from '@/stores/boards'
import TaskCard from './TaskCard.vue'
import TaskModal from './TaskModal.vue'

const props = defineProps({
  column:   { type: Object,  required: true },
  boardId:  { type: String,  required: true },
  canEdit:  { type: Boolean, default: true  },
})

const store = useBoardsStore()

const localTasks = ref([])

watch(
  () => store.syncVersion,
  () => { localTasks.value = store.getTasksByColumn(props.column.id) },
  { immediate: true },
)


function syncToStore() {
  store.setColumnTasks(props.column.id, localTasks.value)
}

async function onDragEnd(evt) {
  // dropped back to exactly the same position
  if (evt.from === evt.to && evt.oldDraggableIndex === evt.newDraggableIndex) return

  const srcColId  = props.column.id
  const movedTask = store.tasks.find(t => t.id === evt.data?.id)
  const destColId = movedTask?.column_id ?? srcColId

  store.bumpSyncVersion()
  await store.persistTaskPositions([srcColId, destColId])
}

// task modal
const showTaskModal = ref(false)
const editingTask   = ref(null)

function openCreate()       { editingTask.value = null; showTaskModal.value = true }
function openEditTask(task) { editingTask.value = task; showTaskModal.value = true }

// 3 dot menu
const menuOpen = ref(false)
const menuRef  = ref(null)

function closeOnOutside(e) {
  if (!menuRef.value?.contains(e.target)) {
    menuOpen.value = false
  } else {
    document.addEventListener('click', closeOnOutside, { once: true })
  }
}
function openMenu() {
  menuOpen.value = true
  setTimeout(() => document.addEventListener('click', closeOnOutside, { once: true }), 0)
}
function toggleMenu() { menuOpen.value ? menuOpen.value = false : openMenu() }
onUnmounted(() => document.removeEventListener('click', closeOnOutside))

// edit column
const showEditModal = ref(false)
const editTitle     = ref('')
const editColor     = ref('')
const editInput     = ref(null)
const saving        = ref(false)

async function openEditCol() {
  menuOpen.value      = false
  editTitle.value     = props.column.title
  editColor.value     = props.column.color
  showEditModal.value = true
  await nextTick()
  editInput.value?.select()
}

async function saveColumn() {
  const title = editTitle.value.trim()
  if (!title || saving.value) return
  saving.value = true
  try {
    await store.updateColumn(props.boardId, props.column.id, { title, color: editColor.value })
    showEditModal.value = false
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  menuOpen.value = false
  const count = localTasks.value.length
  const msg = count > 0
    ? `Delete "${props.column.title}" and its ${count} task${count !== 1 ? 's' : ''}?`
    : `Delete column "${props.column.title}"?`
  if (!confirm(msg)) return
  await store.deleteColumn(props.boardId, props.column.id)
}
</script>

<template>
  <div class="w-72 shrink-0 flex flex-col bg-gray-50 rounded-xl border border-gray-200 max-h-full">

    <!-- color accent bar -->
    <div class="h-1 rounded-t-xl" :style="{ backgroundColor: column.color }" />

    <!-- header -->
    <div class="flex items-center gap-1 px-3 py-2.5 border-b border-gray-200">
      <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: column.color }" />
      <span class="flex-1 text-sm font-semibold text-gray-700 truncate">{{ column.title }}</span>

      <span class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
        {{ localTasks.length }}
      </span>

      <template v-if="canEdit">
        <button
          class="p-1 rounded text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 transition-colors shrink-0"
          title="Add task"
          @click="openCreate"
        >
          <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <!-- 3 dot menu -->
        <div ref="menuRef" class="relative shrink-0">
          <button
            class="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Column options"
            @click.stop="toggleMenu"
          >
            <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="4"  r="1.5"/>
              <circle cx="10" cy="10" r="1.5"/>
              <circle cx="10" cy="16" r="1.5"/>
            </svg>
          </button>

          <Transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="menuOpen"
              class="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 py-1 w-36 origin-top-right"
            >
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                @click="openEditCol"
              >
                <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z"/>
                </svg>
                Edit
              </button>
              <button
                class="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                @click="handleDelete"
              >
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4h6v3M3 7h18"/>
                </svg>
                Delete
              </button>
            </div>
          </Transition>
        </div>
      </template>
    </div>

    <!-- loading shimmer -->
    <div v-if="store.tasksLoading && localTasks.length === 0" class="flex flex-col gap-2 p-3">
      <div v-for="i in 2" :key="i" class="h-10 bg-gray-200 rounded-lg animate-pulse" />
    </div>

    <!-- task list -->
    <VueDraggable
      v-if="canEdit"
      v-model="localTasks"
      group="tasks"
      :animation="150"
      ghost-class="opacity-30"
      chosen-class="shadow-lg"
      class="flex flex-col gap-2 p-3 overflow-y-auto flex-1 min-h-12"
      @add="syncToStore"
      @update="syncToStore"
      @remove="syncToStore"
      @end="onDragEnd"
    >
      <TaskCard
        v-for="task in localTasks"
        :key="task.id"
        :task="task"
        :can-edit="canEdit"
        @edit="openEditTask(task)"
      />
    </VueDraggable>

    <!-- read only task list -->
    <div
      v-else
      class="flex flex-col gap-2 p-3 overflow-y-auto flex-1"
    >
      <TaskCard
        v-for="task in localTasks"
        :key="task.id"
        :task="task"
        :can-edit="false"
      />
    </div>

    <div
      v-if="canEdit && localTasks.length === 0 && !store.tasksLoading"
      class="px-3 pb-3 text-center text-xs text-gray-300 select-none pointer-events-none -mt-2"
    >
      Drop tasks here
    </div>

    <!-- add button -->
    <div v-if="canEdit" class="p-3 border-t border-gray-200">
      <button
        class="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        @click="openCreate"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add task
      </button>
    </div>

    <!-- task modal -->
    <TaskModal
      v-if="showTaskModal"
      :task="editingTask"
      :column-id="column.id"
      :column-title="column.title"
      :board-id="boardId"
      @close="showTaskModal = false"
    />

    <!-- edit column modal -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition ease-out duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition ease-in duration-100"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showEditModal"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          @click.self="showEditModal = false"
        >
          <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6" @click.stop>
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-base font-semibold text-gray-900">Edit column</h2>
              <button
                class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                @click="showEditModal = false"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <form class="space-y-5" @submit.prevent="saveColumn">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  ref="editInput"
                  v-model="editTitle"
                  required
                  maxlength="40"
                  class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="c in PRESET_COLORS"
                    :key="c"
                    type="button"
                    class="w-7 h-7 rounded-full transition-transform hover:scale-110 focus:outline-none"
                    :style="{ backgroundColor: c }"
                    :class="editColor === c ? 'ring-2 ring-offset-2 ring-gray-500 scale-110' : ''"
                    @click="editColor = c"
                  />
                </div>
                <div class="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <span class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: editColor }" />
                  <span class="truncate">{{ editTitle || 'Column name' }}</span>
                </div>
              </div>
              <div class="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  class="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
                  @click="showEditModal = false"
                >Cancel</button>
                <button
                  type="submit"
                  :disabled="saving || !editTitle.trim()"
                  class="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >{{ saving ? 'Saving…' : 'Save' }}</button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>
