'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getDashboardStats } from '@/lib/firestore'
import { DashboardStats, STATUS_FLOW, QUOTE_STATUS_LABELS } from '@/types'
import Link from 'next/link'
import { FileText, Users, PenLine, CheckCircle, FileSignature, FileCheck, Loader, Archive } from 'lucide-react'

export default function DashboardPage() {
  const { appUser } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    getDashboardStats().then(setStats)
  }, [])

  const STATUS_META: Record<string, { icon: typeof FileText; color: string }> = {
    draft: { icon: PenLine, color: 'bg-gray-50 text-gray-700' },
    quote_signed: { icon: CheckCircle, color: 'bg-sky-50 text-sky-700' },
    contract_issued: { icon: FileSignature, color: 'bg-indigo-50 text-indigo-700' },
    contract_signed: { icon: FileCheck, color: 'bg-violet-50 text-violet-700' },
    in_progress: { icon: Loader, color: 'bg-amber-50 text-amber-700' },
    closed: { icon: Archive, color: 'bg-emerald-50 text-emerald-700' },
  }

  const cards = stats
    ? [
        { label: '客戶總數', value: stats.totalClients, icon: Users, color: 'bg-stone-100 text-stone-700', href: '/clients' },
        { label: '所有報價單', value: stats.totalQuotes, icon: FileText, color: 'bg-blue-50 text-blue-700', href: '/quotes' },
        ...STATUS_FLOW.map(s => ({
          label: QUOTE_STATUS_LABELS[s],
          value: stats.byStatus[s] ?? 0,
          icon: STATUS_META[s].icon,
          color: STATUS_META[s].color,
          href: `/quotes?status=${s}`,
        })),
      ]
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-stone-800">
          歡迎回來，{appUser?.name || 'Morning'} 👋
        </h1>
        <p className="text-stone-500 text-sm mt-1">報價管理系統總覽</p>
      </div>

      {stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {cards.map(card => {
            const Icon = card.icon
            return (
              <Link
                key={card.label}
                href={card.href}
                className={`${card.color} rounded-xl p-5 hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium opacity-80">{card.label}</div>
                    <div className="text-3xl font-bold mt-1">{card.value}</div>
                  </div>
                  <Icon size={28} className="opacity-40" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-stone-100 rounded-xl h-24 animate-pulse" />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="font-semibold text-stone-700 mb-4">快捷操作</h2>
        <div className="flex gap-3">
          <Link
            href="/quotes/new"
            className="bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-amber-700 transition-colors font-medium"
          >
            + 開立新報價單
          </Link>
          <Link
            href="/clients"
            className="bg-stone-100 text-stone-700 px-4 py-2.5 rounded-lg text-sm hover:bg-stone-200 transition-colors font-medium"
          >
            查看客戶
          </Link>
          <Link
            href="/import"
            className="bg-stone-100 text-stone-700 px-4 py-2.5 rounded-lg text-sm hover:bg-stone-200 transition-colors font-medium"
          >
            匯入既有報價單
          </Link>
        </div>
      </div>
    </div>
  )
}
