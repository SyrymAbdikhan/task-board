<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBoardsStore } from '@/stores/boards'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  board: { type: Object, required: true },
})
const emit = defineEmits(['close'])

const store = useBoardsStore()
const auth  = useAuthStore()

const tab          = ref('share')   // share, invite
const loadingShare = ref(false)
const loadingInvite = ref(false)
const copiedShare  = ref(false)
const copiedInvite = ref(false)
const removingId   = ref(null)

const shareToken  = ref(props.board.share_token  ?? null)
const inviteToken = ref(props.board.invite_token ?? null)

const shareUrl = computed(() =>
  shareToken.value
    ? `${window.location.origin}/shared/${shareToken.value}`
    : null
)

const inviteUrl = computed(() =>
  inviteToken.value
    ? `${window.location.origin}/join/${inviteToken.value}`
    : null
)

onMounted(() => store.fetchMembers(props.board.id).catch(console.error))

async function enableShare() {
  loadingShare.value = true
  try {
    shareToken.value = await store.generateShareToken(props.board.id)
  } finally {
    loadingShare.value = false
  }
}

async function disableShare() {
  loadingShare.value = true
  try {
    await store.revokeShareToken(props.board.id)
    shareToken.value = null
  } finally {
    loadingShare.value = false
  }
}

async function copyShare() {
  await navigator.clipboard.writeText(shareUrl.value)
  copiedShare.value = true
  setTimeout(() => (copiedShare.value = false), 2000)
}

async function enableInvite() {
  loadingInvite.value = true
  try {
    inviteToken.value = await store.generateInviteToken(props.board.id)
  } finally {
    loadingInvite.value = false
  }
}

async function disableInvite() {
  const count = store.members.length
  const msg = count > 0
    ? `Revoke invite link and remove ${count} editor${count !== 1 ? 's' : ''}? They will lose access immediately.`
    : 'Revoke invite link? No one will be able to join with the current link.'
  if (!confirm(msg)) return
  loadingInvite.value = true
  try {
    await store.revokeInviteToken(props.board.id)
    inviteToken.value = null
  } finally {
    loadingInvite.value = false
  }
}

async function copyInvite() {
  await navigator.clipboard.writeText(inviteUrl.value)
  copiedInvite.value = true
  setTimeout(() => (copiedInvite.value = false), 2000)
}

async function removeMember(userId) {
  removingId.value = userId
  try {
    await store.removeMember(props.board.id, userId)
  } finally {
    removingId.value = null
  }
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      @click.self="emit('close')"
    >
      <div class="w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">

        <!-- Modal header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 class="text-base font-semibold text-gray-900">Share "{{ board.title }}"</h2>
          <button
            class="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            @click="emit('close')"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- tabs -->
        <div class="flex border-b border-gray-100">
          <button
            v-for="t in [{ id: 'share', label: 'View-only link' }, { id: 'invite', label: 'Invite editors' }]"
            :key="t.id"
            class="flex-1 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px"
            :class="tab === t.id
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'"
            @click="tab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <!-- view only share -->
        <div v-if="tab === 'share'" class="p-6 space-y-4">
          <p class="text-sm text-gray-500">
            Anyone with this link can view the board without signing in.
            They cannot make changes.
          </p>

          <div v-if="shareUrl" class="flex gap-2">
            <input
              :value="shareUrl"
              readonly
              class="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate focus:outline-none"
            />
            <button
              @click="copyShare"
              class="px-3 py-2 text-xs font-medium rounded-lg transition-colors"
              :class="copiedShare
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'"
            >
              {{ copiedShare ? 'Copied!' : 'Copy' }}
            </button>
          </div>

          <div class="flex gap-3">
            <button
              v-if="!shareUrl"
              @click="enableShare"
              :disabled="loadingShare"
              class="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {{ loadingShare ? 'Generating…' : 'Generate link' }}
            </button>
            <button
              v-else
              @click="disableShare"
              :disabled="loadingShare"
              class="flex-1 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {{ loadingShare ? 'Revoking…' : 'Revoke link' }}
            </button>
          </div>
        </div>

        <!-- invite editors -->
        <div v-else class="p-6 space-y-4">
          <p class="text-sm text-gray-500">
            Anyone who signs in with this link will be added as an editor
            and can make changes to the board.
          </p>

          <div v-if="inviteUrl" class="flex gap-2">
            <input
              :value="inviteUrl"
              readonly
              class="flex-1 px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-600 truncate focus:outline-none"
            />
            <button
              @click="copyInvite"
              class="px-3 py-2 text-xs font-medium rounded-lg transition-colors"
              :class="copiedInvite
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'"
            >
              {{ copiedInvite ? 'Copied!' : 'Copy' }}
            </button>
          </div>

          <div class="flex gap-3">
            <button
              v-if="!inviteUrl"
              @click="enableInvite"
              :disabled="loadingInvite"
              class="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {{ loadingInvite ? 'Generating…' : 'Generate invite link' }}
            </button>
            <button
              v-else
              @click="disableInvite"
              :disabled="loadingInvite"
              class="flex-1 py-2 text-sm font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {{ loadingInvite ? 'Revoking…' : 'Revoke link' }}
            </button>
          </div>

          <!-- current members -->
          <div v-if="store.members.length > 0" class="pt-2 border-t border-gray-100">
            <p class="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Editors ({{ store.members.length }})
            </p>
            <ul class="space-y-2">
              <li
                v-for="m in store.members"
                :key="m.user_id"
                class="flex items-center justify-between gap-3"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    <span class="text-xs font-semibold text-indigo-600">
                      {{ (m.profiles?.name || m.profiles?.email || m.user_id).slice(0, 2).toUpperCase() }}
                    </span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm text-gray-800 truncate font-medium leading-tight">
                      {{ m.profiles?.name || m.profiles?.email || m.user_id }}
                    </p>
                    <p v-if="m.profiles?.name && m.profiles?.email" class="text-xs text-gray-400 truncate leading-tight">
                      {{ m.profiles.email }}
                    </p>
                  </div>
                </div>
                <button
                  @click="removeMember(m.user_id)"
                  :disabled="removingId === m.user_id"
                  class="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                >
                  {{ removingId === m.user_id ? '…' : 'Remove' }}
                </button>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  </Teleport>
</template>
