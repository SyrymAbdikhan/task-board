import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'

export const useAuthStore = defineStore('auth', () => {
  const session = ref(null)
  const profile = ref(null)   // { id, email, name }
  const loading = ref(true)

  const user            = computed(() => session.value?.user ?? null)
  const isAuthenticated = computed(() => !!session.value)

  async function init() {
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    if (data.session) await fetchProfile()

    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session.value = newSession
      if (newSession) await fetchProfile()
      else profile.value = null
    })

    loading.value = false
  }

  async function fetchProfile() {
    const uid = session.value?.user?.id
    if (!uid) return
    const { data } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('id', uid)
      .single()
    if (data) profile.value = data
  }

  async function updateName(name) {
    const uid = user.value?.id
    if (!uid) return
    const { error } = await supabase
      .from('profiles')
      .update({ name: name.trim() || null })
      .eq('id', uid)
    if (error) throw error
    if (profile.value) profile.value.name = name.trim() || null
  }

  async function updateEmail(email) {
    const { error } = await supabase.auth.updateUser({ email })
    if (error) throw error
    // optimistically updating while pending the email confirmation
    if (profile.value) profile.value.email = email
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    session.value = data.session
    await fetchProfile()
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    session.value = null
    profile.value = null
  }

  return {
    session,
    profile,
    user,
    loading,
    isAuthenticated,
    init,
    fetchProfile,
    updateName,
    updateEmail,
    signUp,
    signIn,
    signOut,
  }
})
