'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getClient, getQuotesByClient } from '@/lib/firestore'
import { Client, Quote, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Edit2, FileText, Plus } from 'lucide-react'
import ClientForm from '@/components/clients/ClientForm'

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [c, q] = await Promise.all([getClient(id), getQuotesByClient(id)])
    setClient(c)
    setQuotes(q)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-32 bg-stone-100 rounded-xl"/></div>
  if (!client) return <div className="text-stone-500">找不到客戶</div>

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-5">
        <ArrowLeft size={14} /> 返回
      </button>

      {/* Client info card */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">{client.companyName}</h1>
            {client.taxId && <div className="text-xs text-stone-400 mt-0.5">統一編號：{client.taxId}</div>}
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-1.5 text-sm text-stone-500 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50"
          >
            <Edit2 size={13} /> {editing ? '取消編輯' : '編輯資料'}
          </button>
        </div>

        {editing ? (
          <div className="mt-4 border-t border-stone-100 pt-4">
            <ClientForm
              initial={client}
              clientId={client.id}
              onSuccess={() => { setEditing(false); load() }}
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              { label: '聯絡人', value: `${client.contactPerson} ${client.title}` },
              { label: 'Email', value: client.email },
              { label: '電話', value: client.phone },
              { label: '地址', value: client.address },
            ].filter(r => r.value?.trim()).map(row => (
              <div key={row.label}>
                <span className="text-stone-400">{row.label}：</span>
                <span className="text-stone-700">{row.value}</span>
              </div>
            ))}
            {client.notes && (
              <div className="col-span-2">
                <span className="text-stone-400">備註：</span>
                <span className="text-stone-700">{client.notes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quotes folder */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800 flex items-center gap-2">
            <FileText size={16} /> 報價單記錄（{quotes.length}）
          </h2>
          <Link
            href={`/quotes/new?clientId=${client.id}`}
            className="flex items-center gap-1.5 bg-amber-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-700"
          >
            <Plus size={14} /> 開立報價單
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-8 text-center text-stone-400 text-sm">
            尚無報價單
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-5 py-3 text-stone-600 font-medium">報價單號</th>
                  <th className="text-left px-5 py-3 text-stone-600 font-medium">專案名稱</th>
                  <th className="text-left px-5 py-3 text-stone-600 font-medium">版本</th>
                  <th className="text-left px-5 py-3 text-stone-600 font-medium">狀態</th>
                  <th className="text-right px-5 py-3 text-stone-600 font-medium">金額</th>
                  <th className="text-left px-5 py-3 text-stone-600 font-medium">日期</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {quotes.map(q => (
                  <tr key={q.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <Link href={`/quotes/${q.id}`} className="text-amber-600 hover:underline font-mono text-xs">
                        {q.quoteNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-stone-700">{q.projectName}</td>
                    <td className="px-5 py-3.5 text-stone-500 font-mono text-xs">{q.versionLabel}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${QUOTE_STATUS_COLORS[q.status]}`}>
                        {QUOTE_STATUS_LABELS[q.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-stone-700 font-medium">{formatCurrency(q.total)}</td>
                    <td className="px-5 py-3.5 text-stone-400 text-xs">{formatDate(q.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
