<script setup>
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['close'])
const auth = useAuthStore()

const name        = ref(auth.profile?.name  ?? '')
const email       = ref(auth.profile?.email ?? auth.user?.email ?? '')
const savingName  = ref(false)
const savingEmail = ref(false)
const nameMsg     = ref('')
const emailMsg    = ref('')

watch(() => auth.profile, (p) => {
  if (p) {
    name.value  = p.name  ?? ''
    email.value = p.email ?? auth.user?.email ?? ''
  }
}, { immediate: true })

async function saveName() {
  if (savingName.value) return
  savingName.value = true
  nameMsg.value    = ''
  try {
    await auth.updateName(name.value)
    nameMsg.value = 'Saved'
    setTimeout(() => (nameMsg.value = ''), 2000)
  } catch (e) {
    nameMsg.value = e?.message ?? 'Error saving name'
  } finally {
    savingName.value = false
  }
}

async function saveEmail() {
  if (savingEmail.value) return
  const trimmed = email.value.trim()
  if (!trimmed || trimmed === (auth.profile?.email ?? auth.user?.email)) return
  savingEmail.value = true
  emailMsg.value    = ''
  try {
    await auth.updateEmail(trimmed)
    emailMsg.value = 'Confirmation email sent — check your inbox'
  } catch (e) {
    emailMsg.value = e?.message ?? 'Error updating email'
  } finally {
    savingEmail.value = false
  }
}

// avatar initials helper
function initials() {
  const src = auth.profile?.name || auth.profile?.email || auth.user?.email || '?'
  return src.slice(0, 2).toUpperCase()
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-sm bg-white rounded-2xl shadow-xl" @click.stop>

        <!-- header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-900">Profile</h2>
          <button
            class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            @click="emit('close')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- avatar -->
        <div class="flex justify-center pt-6 pb-2">
          <div class="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center">
            <span class="text-xl font-bold text-white">{{ initials() }}</span>
          </div>
        </div>

        <div class="px-6 pb-6 space-y-5">
          <!-- name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Display name</label>
            <div class="flex gap-2">
              <input
                v-model="name"
                placeholder="Your name"
                maxlength="60"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @keydown.enter="saveName"
              />
              <button
                @click="saveName"
                :disabled="savingName"
                class="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {{ savingName ? '…' : 'Save' }}
              </button>
            </div>
            <p
              v-if="nameMsg"
              class="mt-1 text-xs"
              :class="nameMsg === 'Saved' ? 'text-green-600' : 'text-red-500'"
            >
              {{ nameMsg }}
            </p>
          </div>

          <!-- email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div class="flex gap-2">
              <input
                v-model="email"
                type="email"
                placeholder="you@example.com"
                class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                @keydown.enter="saveEmail"
              />
              <button
                @click="saveEmail"
                :disabled="savingEmail"
                class="px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {{ savingEmail ? '…' : 'Save' }}
              </button>
            </div>
            <p
              v-if="emailMsg"
              class="mt-1 text-xs"
              :class="emailMsg.startsWith('Confirmation') ? 'text-green-600' : 'text-red-500'"
            >
              {{ emailMsg }}
            </p>
            <p v-else class="mt-1 text-xs text-gray-400">
              Changing email sends a confirmation link to the new address.
            </p>
          </div>

        </div>
      </div>
    </div>
  </Teleport>
</template>
