'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getClients, deleteClient } from '@/lib/firestore'
import { Client } from '@/types'
import { formatDate } from '@/lib/utils'
import { Plus, Trash2, ChevronRight, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = () => getClients().then(setClients).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定要刪除「${name}」嗎？此操作無法復原。`)) return
    await deleteClient(id)
    toast.success('已刪除客戶')
    load()
  }

  const filtered = clients.filter(c =>
    c.companyName.includes(search) || c.contactPerson.includes(search)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">客戶管理</h1>
          <p className="text-stone-500 text-sm mt-1">共 {clients.length} 位客戶</p>
        </div>
        <Link
          href="/clients/new"
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-amber-700 transition-colors font-medium"
        >
          <Plus size={16} /> 新增客戶
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋公司名稱或聯絡人..."
          className="w-full border border-stone-200 rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <p className="text-stone-400">尚無客戶資料</p>
          <Link href="/clients/new" className="text-amber-600 text-sm mt-2 inline-block hover:underline">
            新增第一位客戶
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-5 py-3 text-stone-600 font-medium">公司名稱</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">聯絡人</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">電話</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">建立日期</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(client => (
                <tr key={client.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/clients/${client.id}`} className="font-medium text-stone-800 hover:text-amber-600">
                      {client.companyName}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-stone-600">{client.contactPerson} {client.title}</td>
                  <td className="px-5 py-3.5 text-stone-500">{client.phone}</td>
                  <td className="px-5 py-3.5 text-stone-400">{formatDate(client.createdAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleDelete(client.id, client.companyName)}
                        className="text-stone-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                      <Link href={`/clients/${client.id}`} className="text-stone-300 hover:text-stone-600">
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
