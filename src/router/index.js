import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/Register.vue'),
    meta: { guest: true },
  },
  {
    path: '/shared/:token',
    name: 'SharedBoard',
    component: () => import('@/views/SharedBoard.vue'),
  },
  {
    path: '/',
    name: 'Boards',
    component: () => import('@/views/Boards.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/board/:id',
    name: 'Board',
    component: () => import('@/views/Board.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/join/:token',
    name: 'JoinBoard',
    component: () => import('@/views/JoinBoard.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.loading) await auth.init()

  if (to.meta.requiresAuth && !auth.isAuthenticated) return { name: 'Login' }
  if (to.meta.guest && auth.isAuthenticated) return { name: 'Boards' }
})

export default router
