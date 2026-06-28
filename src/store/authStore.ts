import { create } from 'zustand'
import type { UserProfile } from '@/types'
import { appwriteAuthService } from '@/services/auth'
import { updateUserAvatar } from '@/services/users'
import { isAppwriteConfigured } from '@/services/appwrite'

interface AuthState {
  user: UserProfile | null
  email: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean
  needsEmailVerification: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, username: string) => Promise<void>
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
  resendVerification: () => Promise<void>
  deleteAccount: () => Promise<void>
  updateAvatar: (file: File) => Promise<void>
  clearError: () => void
}

function requireConfigured() {
  if (!isAppwriteConfigured()) {
    throw new Error('Appwrite is not configured. Run npm run setup:appwrite and restart the app.')
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  email: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,
  needsEmailVerification: false,

  login: async (email, password) => {
    requireConfigured()
    set({ isLoading: true, error: null })
    try {
      const result = await appwriteAuthService.login(email, password)
      if (result.needsVerification) {
        set({
          email: result.email,
          needsEmailVerification: true,
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
        return
      }
      set({
        user: result.user,
        email: result.email,
        isAuthenticated: true,
        needsEmailVerification: false,
        isLoading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Login failed',
        isLoading: false,
      })
    }
  },

  signup: async (email, password, username) => {
    requireConfigured()
    set({ isLoading: true, error: null })
    try {
      const result = await appwriteAuthService.signup(email, password, username)
      if (result.needsVerification) {
        set({
          email: result.email,
          needsEmailVerification: true,
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
        return
      }
      set({
        user: result.user,
        email: result.email,
        isAuthenticated: true,
        needsEmailVerification: false,
        isLoading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Signup failed',
        isLoading: false,
      })
    }
  },

  logout: async () => {
    await appwriteAuthService.logout()
    set({
      user: null,
      email: null,
      isAuthenticated: false,
      needsEmailVerification: false,
    })
  },

  loginWithGoogle: async () => {
    requireConfigured()
    set({ isLoading: true, error: null })
    try {
      await appwriteAuthService.loginWithGoogle()
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Google login failed',
        isLoading: false,
      })
    }
  },

  restoreSession: async () => {
    if (!isAppwriteConfigured()) return
    set({ isLoading: true })
    try {
      const session = await appwriteAuthService.getSessionState()
      if (!session) {
        set({ isLoading: false })
        return
      }
      if (session.needsVerification) {
        set({
          email: session.email,
          needsEmailVerification: true,
          isAuthenticated: false,
          user: null,
          isLoading: false,
        })
        return
      }
      const user = await appwriteAuthService.getCurrentUser()
      if (user) {
        set({
          user,
          email: session.email,
          isAuthenticated: true,
          needsEmailVerification: false,
          isLoading: false,
        })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  resendVerification: async () => {
    set({ isLoading: true, error: null })
    try {
      await appwriteAuthService.resendVerification()
      set({ isLoading: false })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Could not resend email',
        isLoading: false,
      })
    }
  },

  deleteAccount: async () => {
    set({ isLoading: true, error: null })
    try {
      await appwriteAuthService.deleteAccount()
      set({
        user: null,
        email: null,
        isAuthenticated: false,
        needsEmailVerification: false,
        isLoading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Could not delete account',
        isLoading: false,
      })
    }
  },

  updateAvatar: async (file) => {
    const user = get().user
    if (!user) return
    requireConfigured()
    set({ isLoading: true, error: null })
    try {
      const avatarUrl = await updateUserAvatar(user.userId, file)
      set({
        user: { ...user, avatarUrl },
        isLoading: false,
      })
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Could not update photo',
        isLoading: false,
      })
    }
  },

  clearError: () => set({ error: null }),
}))
