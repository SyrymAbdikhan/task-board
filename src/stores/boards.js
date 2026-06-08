import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/utils/supabase'
import { useAuthStore } from '@/stores/auth'

export const DEFAULT_COLUMNS = [
  { title: 'To Do',       color: '#6B7280' },
  { title: 'In Progress', color: '#F59E0B' },
  { title: 'Done',        color: '#10B981' },
]

export const PRESET_COLORS = [
  '#6B7280', '#EF4444', '#F97316', '#F59E0B',
  '#EAB308', '#22C55E', '#10B981', '#06B6D4',
  '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
]

function sortColumns(board) {
  return { ...board, columns: (board.columns ?? []).sort((a, b) => a.position - b.position) }
}

export const useBoardsStore = defineStore('boards', () => {
  const auth = useAuthStore()

  const boards       = ref([])   // boards owned by the user
  const sharedBoards = ref([])   // boards shared with the user
  const currentBoard = ref(null)
  const tasks        = ref([])
  const members      = ref([])
  const loading      = ref(false)
  const tasksLoading = ref(false)

  // bumped by all task CRUD + after every drag, NOT by setColumnTasks/mid-drag
  const syncVersion = ref(0)

  function _boardById(boardId) {
    return boards.value.find(b => b.id === boardId)
      ?? sharedBoards.value.find(b => b.id === boardId)
  }

  function isOwner(boardId) {
    return _boardById(boardId)?.user_id === auth.user?.id
  }

  // board management
  async function fetchBoards() {
    loading.value = true
    try {
      const userId = auth.user?.id
      if (!userId) return

      const { data: owned, error: e1 } = await supabase
        .from('boards')
        .select('*, columns(id, title, color, position)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (e1) throw e1
      boards.value = owned.map(sortColumns)

      const { data: memberships, error: e2 } = await supabase
        .from('board_members')
        .select('role, boards(*, columns(id, title, color, position))')
        .eq('user_id', userId)
      if (e2) throw e2
      sharedBoards.value = (memberships ?? [])
        .filter(m => m.boards)
        .map(m => ({ ...sortColumns(m.boards), memberRole: m.role }))
    } finally {
      loading.value = false
    }
  }

  async function createBoard(title) {
    const { data: board, error: e1 } = await supabase
      .from('boards')
      .insert({ title, user_id: auth.user?.id })
      .select()
      .single()
    if (e1) throw e1

    const { data: cols, error: e2 } = await supabase
      .from('columns')
      .insert(DEFAULT_COLUMNS.map((c, i) => ({
        board_id: board.id,
        title:    c.title,
        color:    c.color,
        position: i,
      })))
      .select()
    if (e2) throw e2

    const fullBoard = { ...board, columns: cols.sort((a, b) => a.position - b.position) }
    boards.value.unshift(fullBoard)
    return fullBoard
  }

  async function deleteBoard(id) {
    const { error } = await supabase.from('boards').delete().eq('id', id)
    if (error) throw error
    boards.value = boards.value.filter(b => b.id !== id)
  }
  
  // column management
  async function addColumn(boardId, title, color) {
    const board = _boardById(boardId)
    if (!board) return
    const { data, error } = await supabase
      .from('columns')
      .insert({ board_id: boardId, title, color, position: board.columns.length })
      .select()
      .single()
    if (error) throw error
    board.columns.push(data)
  }

  async function updateColumn(boardId, colId, updates) {
    const { error } = await supabase
      .from('columns')
      .update(updates)
      .eq('id', colId)
    if (error) throw error
    const col = _boardById(boardId)?.columns.find(c => c.id === colId)
    if (col) Object.assign(col, updates)
  }

  async function deleteColumn(boardId, colId) {
    const { error } = await supabase
      .from('columns')
      .delete()
      .eq('id', colId)
    if (error) throw error
    const board = _boardById(boardId)
    if (board) board.columns = board.columns.filter(c => c.id !== colId)
    // tasks cascade delete in DB, remove from local state too
    tasks.value = tasks.value.filter(t => t.column_id !== colId)
    syncVersion.value++
  }

  // task management 
  async function fetchTasks(boardId) {
    tasksLoading.value = true
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('board_id', boardId)
      .order('position', { ascending: true })
    tasksLoading.value = false
    if (error) throw error
    tasks.value = data
    syncVersion.value++
  }

  function getTasksByColumn(colId) {
    return tasks.value
      .filter(t => t.column_id === colId)
      .sort((a, b) => a.position - b.position)
  }

  async function createTask({ boardId, columnId, title, description = '' }) {
    const position = tasks.value.filter(t => t.column_id === columnId).length
    const { data, error } = await supabase
      .from('tasks')
      .insert({ board_id: boardId, column_id: columnId, title, description, position })
      .select()
      .single()
    if (error) throw error
    tasks.value.push(data)
    syncVersion.value++
    return data
  }

  async function updateTask(id, updates) {
    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    const idx = tasks.value.findIndex(t => t.id === id)
    if (idx !== -1) tasks.value[idx] = data
    syncVersion.value++
    return data
  }

  async function deleteTask(id) {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) throw error
    tasks.value = tasks.value.filter(t => t.id !== id)
    syncVersion.value++
  }

  // drag
  function setColumnTasks(colId, newTasks) {
    newTasks.forEach((t, i) => {
      const storeTask = tasks.value.find(st => st.id === t.id)
      if (storeTask) {
        storeTask.column_id = colId
        storeTask.position  = i
      }
    })
  }

  function bumpSyncVersion() { syncVersion.value++ }

  async function persistTaskPositions(colIds) {
    const cols     = [...new Set(colIds)]
    const affected = tasks.value.filter(t => cols.includes(t.column_id))
    if (!affected.length) return
    await Promise.all(
      affected.map(t =>
        supabase.from('tasks')
          .update({ column_id: t.column_id, position: t.position })
          .eq('id', t.id)
      )
    )
  }

  // sharing management
  async function generateShareToken(boardId) {
    const token = crypto.randomUUID()
    const { error } = await supabase.from('boards').update({ share_token: token }).eq('id', boardId)
    if (error) throw error
    const board = _boardById(boardId)
    if (board) board.share_token = token
    return token
  }

  async function revokeShareToken(boardId) {
    const { error } = await supabase.from('boards').update({ share_token: null }).eq('id', boardId)
    if (error) throw error
    const board = _boardById(boardId)
    if (board) board.share_token = null
  }

  async function generateInviteToken(boardId) {
    const token = crypto.randomUUID()
    const { error } = await supabase.from('boards').update({ invite_token: token }).eq('id', boardId)
    if (error) throw error
    const board = _boardById(boardId)
    if (board) board.invite_token = token
    return token
  }

  async function revokeInviteToken(boardId) {
    const [r1, r2] = await Promise.all([
      supabase.from('boards').update({ invite_token: null }).eq('id', boardId),
      supabase.from('board_members').delete().eq('board_id', boardId),
    ])
    if (r1.error) throw r1.error
    if (r2.error) throw r2.error
    const board = _boardById(boardId)
    if (board) board.invite_token = null
    members.value = []
  }

  async function joinBoard(inviteToken) {
    const { data: board, error: e1 } = await supabase
      .from('boards')
      .select('id, title')
      .eq('invite_token', inviteToken)
      .single()
    if (e1 || !board) throw new Error('Invalid or expired invite link.')

    const { error: e2 } = await supabase
      .from('board_members')
      .insert({ board_id: board.id, user_id: auth.user.id, role: 'editor' })
    // 23505 = unique_violation means already a member
    if (e2 && e2.code !== '23505') throw e2

    return board
  }

  async function fetchBoardByShareToken(token) {
    const { data, error } = await supabase
      .from('boards')
      .select('*, columns(id, title, color, position)')
      .eq('share_token', token)
      .single()
    if (error || !data) throw new Error('Board not found or link is invalid.')
    return sortColumns(data)
  }

  // members management
  async function fetchMembers(boardId) {
    // board_members has user_id in auth.users, but profiles.id also in auth.users.
    // there is no direct FK between them, so PostgREST can't do an embedded select.
    // Fetch separately and merge.
    const { data: rows, error: e1 } = await supabase
      .from('board_members')
      .select('user_id, role, created_at')
      .eq('board_id', boardId)
    if (e1) throw e1
    if (!rows?.length) { members.value = []; return }

    const { data: profileRows, error: e2 } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', rows.map(r => r.user_id))
    if (e2) throw e2

    const byId = Object.fromEntries((profileRows ?? []).map(p => [p.id, p]))
    members.value = rows.map(r => ({ ...r, profiles: byId[r.user_id] ?? null }))
  }

  async function removeMember(boardId, userId) {
    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId)
    if (error) throw error
    members.value = members.value.filter(m => m.user_id !== userId)
  }

  async function leaveBoard(boardId) {
    await removeMember(boardId, auth.user?.id)
    sharedBoards.value = sharedBoards.value.filter(b => b.id !== boardId)
  }

  // misc
  function setCurrentBoard(board) { currentBoard.value = board }
  function clearTasks()           { tasks.value = []; syncVersion.value = 0 }
  function clearMembers()         { members.value = [] }

  const allBoards = computed(() => [...boards.value, ...sharedBoards.value])

  return {
    // state
    boards, sharedBoards, allBoards, currentBoard,
    tasks, members, loading, tasksLoading, syncVersion,
    // board CRUD
    fetchBoards, createBoard, deleteBoard,
    // column CRUD
    addColumn, updateColumn, deleteColumn,
    // task drag
    getTasksByColumn, setColumnTasks, bumpSyncVersion, persistTaskPositions,
    // task CRUD
    fetchTasks, createTask, updateTask, deleteTask,
    // sharing
    generateShareToken, revokeShareToken,
    generateInviteToken, revokeInviteToken,
    joinBoard, fetchBoardByShareToken,
    // members
    fetchMembers, removeMember, leaveBoard,
    // misc
    isOwner, setCurrentBoard, clearTasks, clearMembers,
  }
})
