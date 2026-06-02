'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { getQuotes, getClients } from '@/lib/firestore'
import { Quote, Client, QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'

export default function QuotesPage() {
  const searchParams = useSearchParams()
  const statusFilter = searchParams.get('status') as QuoteStatus | null

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [clients, setClients] = useState<Record<string, Client>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeStatus, setActiveStatus] = useState<QuoteStatus | 'all'>(statusFilter || 'all')

  useEffect(() => {
    Promise.all([getQuotes(), getClients()]).then(([qs, cs]) => {
      setQuotes(qs)
      const map: Record<string, Client> = {}
      cs.forEach(c => { map[c.id] = c })
      setClients(map)
      setLoading(false)
    })
  }, [])

  const filtered = quotes.filter(q => {
    const matchStatus = activeStatus === 'all' || q.status === activeStatus
    const clientName = clients[q.clientId]?.companyName || ''
    const matchSearch = q.projectName.includes(search) || clientName.includes(search) || q.quoteNumber.includes(search)
    return matchStatus && matchSearch
  })

  const statusTabs: Array<{ key: QuoteStatus | 'all'; label: string }> = [
    { key: 'all', label: `全部（${quotes.length}）` },
    { key: 'draft', label: `開立中（${quotes.filter(q => q.status === 'draft').length}）` },
    { key: 'sent', label: `等待簽回（${quotes.filter(q => q.status === 'sent').length}）` },
    { key: 'signed', label: `已簽回（${quotes.filter(q => q.status === 'signed').length}）` },
    { key: 'closed', label: `已結案（${quotes.filter(q => q.status === 'closed').length}）` },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">所有報價單</h1>
        <Link
          href="/quotes/new"
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-amber-700 font-medium"
        >
          <Plus size={16} /> 開立報價單
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-stone-200">
        {statusTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveStatus(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeStatus === tab.key
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜尋專案名稱、客戶或報價單號..."
          className="w-full border border-stone-200 rounded-lg pl-9 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="bg-white rounded-xl h-16 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400">尚無報價單</div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-5 py-3 text-stone-600 font-medium">報價單號</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">客戶 / 專案</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">版本</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">狀態</th>
                <th className="text-right px-5 py-3 text-stone-600 font-medium">金額（含稅）</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(q => (
                <tr key={q.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/quotes/${q.id}`} className="font-mono text-xs text-amber-600 hover:underline">
                      {q.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-medium text-stone-800">{q.projectName}</div>
                    <div className="text-xs text-stone-400">{clients[q.clientId]?.companyName}</div>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-stone-500">{q.versionLabel}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${QUOTE_STATUS_COLORS[q.status]}`}>
                      {QUOTE_STATUS_LABELS[q.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-stone-700">{formatCurrency(q.total)}</td>
                  <td className="px-5 py-3.5 text-xs text-stone-400">{formatDate(q.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
