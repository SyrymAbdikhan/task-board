<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useBoardsStore } from '@/stores/boards'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/utils/supabase'

const route = useRoute()
const store = useBoardsStore()
const auth  = useAuthStore()

const board    = ref(null)
const tasks    = ref([])
const members  = ref([])
const loading  = ref(true)
const notFound = ref(false)

onMounted(async () => {
  try {
    board.value = await store.fetchBoardByShareToken(route.params.token)

    const [tasksRes, membersRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('*')
        .eq('board_id', board.value.id)
        .order('position', { ascending: true }),

      auth.isAuthenticated
        ? supabase
            .from('board_members')
            .select('user_id')
            .eq('board_id', board.value.id)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (tasksRes.error) throw tasksRes.error
    tasks.value = tasksRes.data

    // merge profiles separately, no direct FK between board_members and profiles
    const memberRows = membersRes.data ?? []
    if (memberRows.length) {
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', memberRows.map(r => r.user_id))
      const byId = Object.fromEntries((profileRows ?? []).map(p => [p.id, p]))
      members.value = memberRows.map(r => ({ ...r, profiles: byId[r.user_id] ?? null }))
    } else {
      members.value = []
    }
  } catch {
    notFound.value = true
  } finally {
    loading.value = false
  }
})

function getColumnTasks(colId) {
  return tasks.value
    .filter(t => t.column_id === colId)
    .sort((a, b) => a.position - b.position)
}

function memberInitials(m) {
  const src = m.profiles?.name || m.profiles?.email || ''
  return src.slice(0, 2).toUpperCase() || '?'
}

function memberLabel(m) {
  return m.profiles?.name || m.profiles?.email || 'Unknown'
}
</script>

<template>
  <div class="h-[calc(100vh-57px)] flex flex-col">

    <!-- board sub-header -->
    <div class="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3 shrink-0">
      <RouterLink to="/" class="text-gray-400 hover:text-gray-600 transition-colors">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </RouterLink>

      <h1 class="text-lg font-semibold text-gray-900 truncate">{{ board?.title ?? 'Shared Board' }}</h1>
      <span class="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-500 shrink-0">View only</span>

      <!-- editor avatars -->
      <div v-if="members.length" class="flex items-center gap-1.5 ml-auto shrink-0">
        <span class="text-xs text-gray-400 mr-1">Editors</span>
        <div
          v-for="m in members"
          :key="m.user_id"
          class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center ring-2 ring-white -ml-1 first:ml-0 cursor-default"
          :title="memberLabel(m)"
        >
          <span class="text-xs font-semibold text-indigo-600">{{ memberInitials(m) }}</span>
        </div>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="flex gap-4 p-6">
      <div v-for="i in 3" :key="i" class="w-72 shrink-0 bg-gray-100 rounded-xl h-48 animate-pulse" />
    </div>

    <!-- not found -->
    <div v-else-if="notFound" class="flex-1 flex items-center justify-center text-center px-4">
      <div>
        <p class="text-4xl mb-4">🔒</p>
        <h2 class="text-lg font-semibold text-gray-900 mb-1">Board not found</h2>
        <p class="text-sm text-gray-400">This link may have been revoked or is invalid.</p>
      </div>
    </div>

    <!-- board -->
    <div v-else class="flex gap-4 p-6 overflow-x-auto flex-1 items-start">
      <div
        v-for="col in board.columns"
        :key="col.id"
        class="w-72 shrink-0 flex flex-col bg-gray-50 rounded-xl border border-gray-200"
      >
        <!-- column header -->
        <div class="h-1 rounded-t-xl" :style="{ backgroundColor: col.color }" />
        <div class="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ backgroundColor: col.color }" />
          <span class="flex-1 text-sm font-semibold text-gray-700 truncate">{{ col.title }}</span>
          <span class="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {{ getColumnTasks(col.id).length }}
          </span>
        </div>

        <!-- tasks -->
        <div class="flex flex-col gap-2 p-3 overflow-y-auto flex-1">
          <div
            v-for="task in getColumnTasks(col.id)"
            :key="task.id"
            class="bg-white border border-gray-200 rounded-lg p-3 select-none"
          >
            <p class="text-sm font-medium text-gray-900 leading-snug">{{ task.title }}</p>
            <p v-if="task.description" class="mt-1 text-xs text-gray-400 line-clamp-2">
              {{ task.description }}
            </p>
          </div>
          <div
            v-if="getColumnTasks(col.id).length === 0"
            class="text-center text-xs text-gray-300 py-4"
          >
            No tasks
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
