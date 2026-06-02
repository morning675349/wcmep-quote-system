'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { firebaseUser, appUser, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    if (!firebaseUser) {
      router.replace('/login')
      return
    }
    if (requiredRole === 'admin' && appUser?.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [firebaseUser, appUser, loading, requiredRole, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    )
  }

  if (!firebaseUser) return null
  if (requiredRole === 'admin' && appUser?.role !== 'admin') return null

  return <>{children}</>
}
