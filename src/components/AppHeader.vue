<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import ProfileModal from '@/components/ProfileModal.vue'

const auth   = useAuthStore()
const router = useRouter()

const showProfile = ref(false)

const displayName = computed(() =>
  auth.profile?.name || auth.profile?.email || auth.user?.email || ''
)

const initials = computed(() =>
  displayName.value.slice(0, 2).toUpperCase()
)

async function logout() {
  await auth.signOut()
  router.push({ name: 'Login' })
}
</script>

<template>
  <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
    <RouterLink to="/" class="text-xl font-bold text-indigo-600 tracking-tight">TaskBoard</RouterLink>

    <div class="flex items-center gap-3">
      <template v-if="auth.isAuthenticated">
        <button
          @click="showProfile = true"
          class="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          title="Edit profile"
        >
          <div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
            <span class="text-xs font-bold text-white">{{ initials }}</span>
          </div>
          <span class="text-sm text-gray-600 hidden sm:block truncate max-w-[160px]">
            {{ displayName }}
          </span>
        </button>
        <button
          @click="logout"
          class="text-sm text-gray-500 hover:text-red-500 transition-colors font-medium"
        >
          Sign out
        </button>
      </template>
      <template v-else>
        <RouterLink
          to="/login"
          class="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Sign in
        </RouterLink>
      </template>
    </div>
  </header>

  <ProfileModal v-if="showProfile" @close="showProfile = false" />
</template>
