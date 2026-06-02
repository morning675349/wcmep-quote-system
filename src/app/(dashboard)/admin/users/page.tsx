'use client'

import { useEffect, useState } from 'react'
import { getUsers, createUser, deleteUser, updateUser } from '@/lib/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { AppUser } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from '@/components/auth/AuthGuard'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils'

export default function AdminUsersPage() {
  const { appUser: currentUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'staff' as 'admin' | 'staff' })
  const [saving, setSaving] = useState(false)

  const load = () => getUsers().then(setUsers).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password)
      await createUser(cred.user.uid, {
        email: form.email,
        name: form.name,
        role: form.role,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.uid || '',
      })
      toast.success(`帳號「${form.name}」已建立`)
      setForm({ name: '', email: '', password: '', role: 'staff' })
      setShowForm(false)
      load()
    } catch (err: unknown) {
      const error = err as { code?: string }
      if (error.code === 'auth/email-already-in-use') toast.error('此 Email 已被使用')
      else toast.error('建立失敗，請重試')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (uid: string, name: string) => {
    if (uid === currentUser?.uid) { toast.error('無法刪除自己的帳號'); return }
    if (!confirm(`確定要刪除帳號「${name}」嗎？`)) return
    await deleteUser(uid)
    toast.success('帳號已刪除')
    load()
  }

  const handleRoleToggle = async (uid: string, current: 'admin' | 'staff') => {
    const newRole = current === 'admin' ? 'staff' : 'admin'
    await updateUser(uid, { role: newRole })
    toast.success(`已更改為 ${newRole === 'admin' ? '管理員' : '一般成員'}`)
    load()
  }

  return (
    <AuthGuard requiredRole="admin">
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">帳號管理</h1>
            <p className="text-stone-500 text-sm mt-1">共 {users.length} 個帳號</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-amber-700 font-medium"
          >
            <Plus size={16} /> 新增帳號
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border border-stone-200 p-5 mb-5">
            <h3 className="font-semibold text-stone-700 mb-4">新增帳號</h3>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">姓名</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">角色</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'staff' }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                  <option value="staff">一般成員</option>
                  <option value="admin">管理員</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">密碼（至少6位）</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div className="col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 px-3 py-2">取消</button>
                <button type="submit" disabled={saving}
                  className="bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-amber-700 disabled:bg-amber-300 font-medium">
                  {saving ? '建立中...' : '建立帳號'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-5 py-3 text-stone-600 font-medium">姓名</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">角色</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">建立日期</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {users.map((user, idx) => (
                <tr key={user.uid || idx} className="hover:bg-stone-50">
                  <td className="px-5 py-3.5 font-medium text-stone-800">
                    {user.name}
                    {user.uid === currentUser?.uid && <span className="ml-2 text-xs text-stone-400">（你）</span>}
                  </td>
                  <td className="px-5 py-3.5 text-stone-500">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleRoleToggle(user.uid, user.role)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                        user.role === 'admin'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {user.role === 'admin' ? '管理員' : '一般成員'}
                    </button>
                  </td>
                  <td className="px-5 py-3.5 text-stone-400 text-xs">{formatDate(user.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleDelete(user.uid, user.name)}
                      className="text-stone-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AuthGuard>
  )
}
