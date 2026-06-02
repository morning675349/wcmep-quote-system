'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  FileText,
  PlusCircle,
  Upload,
  Settings,
  LogOut,
  Library,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: '總覽', icon: LayoutDashboard },
  { href: '/clients', label: '客戶管理', icon: Users },
  { href: '/quotes', label: '所有報價單', icon: FileText },
  { href: '/quotes/new', label: '開立報價單', icon: PlusCircle },
  { href: '/import', label: '匯入既有資料', icon: Upload },
]

const adminItems = [
  { href: '/admin/users', label: '帳號管理', icon: Settings },
  { href: '/admin/service-items', label: '服務項目庫', icon: Library },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { appUser, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.replace('/login')
    toast.success('已登出')
  }

  return (
    <aside className="w-56 bg-stone-900 text-white flex flex-col min-h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-stone-700">
        <div className="bg-white rounded-lg px-3 py-2 inline-block">
          <img src="/logo.png" alt="奇策整合行銷" className="h-8 w-auto" />
        </div>
        <div className="text-xs text-stone-500 mt-2">報價管理系統</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-300 hover:bg-stone-800 hover:text-white'
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}

        {appUser?.role === 'admin' && (
          <>
            <div className="pt-4 pb-1 px-3 text-[10px] font-medium text-stone-500 uppercase tracking-wider">
              管理員
            </div>
            {adminItems.map(item => {
              const Icon = item.icon
              const active = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    active
                      ? 'bg-amber-600 text-white'
                      : 'text-stone-300 hover:bg-stone-800 hover:text-white'
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-stone-700">
        <div className="text-xs text-stone-400 truncate">{appUser?.name || appUser?.email}</div>
        <div className="text-[10px] text-stone-600 capitalize">{appUser?.role === 'admin' ? '管理員' : '一般成員'}</div>
        <button
          onClick={handleLogout}
          className="mt-3 flex items-center gap-2 text-xs text-stone-400 hover:text-white transition-colors"
        >
          <LogOut size={13} />
          登出
        </button>
      </div>
    </aside>
  )
}
