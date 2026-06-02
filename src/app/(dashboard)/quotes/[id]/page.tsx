'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getQuote, getClient, updateQuoteStatus, deleteQuote, convertToContract } from '@/lib/firestore'
import { Quote, Client, QuoteStatus, QUOTE_STATUS_LABELS, QUOTE_STATUS_COLORS } from '@/types'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ArrowLeft, Edit2, Download, History, ChevronRight, Trash2, FileText, FileSignature } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_FLOW: QuoteStatus[] = ['draft', 'sent', 'signed', 'closed']

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [showHistory, setShowHistory] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteInput, setDeleteInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    const q = await getQuote(id)
    setQuote(q)
    if (q) {
      const c = await getClient(q.clientId)
      setClient(c)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleStatusChange = async (status: QuoteStatus) => {
    if (!quote) return
    setUpdatingStatus(true)
    await updateQuoteStatus(id, status)
    toast.success(`狀態已更新：${QUOTE_STATUS_LABELS[status]}`)
    load()
    setUpdatingStatus(false)
  }

  const handleDownloadPDF = async () => {
    if (!quote || !client) { toast.error('資料尚未載入'); return }
    setDownloading(true)
    try {
      const res = await fetch(`/api/pdf/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote, client }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'PDF 產生失敗')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quote.quoteNumber}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('PDF 已下載')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PDF 產生失敗，請重試')
    } finally {
      setDownloading(false)
    }
  }

  const handleConvertToContract = async () => {
    if (!quote) return
    if (!confirm('確定要將此報價單開立為合約嗎？將帶入標準合約條款與付款期數，可再編輯調整。')) return
    try {
      await convertToContract(id)
      toast.success('已開立合約，請編輯合約內容')
      router.push(`/quotes/${id}/contract`)
    } catch {
      toast.error('開立合約失敗')
    }
  }

  const handleDelete = async () => {
    if (deleteInput !== 'DELETE') return
    setDeleting(true)
    try {
      await deleteQuote(id)
      toast.success('報價單已刪除')
      router.replace(client ? `/clients/${client.id}` : '/quotes')
    } catch {
      toast.error('刪除失敗，請重試')
      setDeleting(false)
    }
  }

  if (loading) return <div className="animate-pulse space-y-4"><div className="h-64 bg-stone-100 rounded-xl"/></div>
  if (!quote) return <div className="text-stone-500">找不到報價單</div>

  const currentStatusIndex = STATUS_FLOW.indexOf(quote.status)

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 mb-5 text-sm text-stone-500">
        <button onClick={() => router.back()} className="hover:text-stone-700 flex items-center gap-1">
          <ArrowLeft size={14} /> 返回
        </button>
        {client && (
          <>
            <ChevronRight size={12} />
            <Link href={`/clients/${client.id}`} className="hover:text-amber-600">{client.companyName}</Link>
          </>
        )}
        <ChevronRight size={12} />
        <span className="font-mono">{quote.quoteNumber}</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-stone-800">{quote.projectName}</h1>
              {quote.documentType === 'contract' && (
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-stone-800 text-white">合約</span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${QUOTE_STATUS_COLORS[quote.status]}`}>
                {QUOTE_STATUS_LABELS[quote.status]}
              </span>
              <span className="text-xs font-mono text-stone-400 border border-stone-200 px-2 py-0.5 rounded">
                {quote.versionLabel}
              </span>
            </div>
            <div className="text-sm text-stone-500">
              {client?.companyName} · {quote.serviceType} · {quote.quoteNumber}
            </div>
            <div className="text-xs text-stone-400 mt-1">
              建立於 {formatDate(quote.createdAt)} · 更新於 {formatDate(quote.updatedAt)}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {quote.originalFileUrl && (
              <a
                href={quote.originalFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm border border-stone-200 px-3 py-2 rounded-lg text-stone-600 hover:bg-stone-50"
              >
                <FileText size={14} /> 原始檔案
              </a>
            )}
            <button
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="flex items-center gap-1.5 text-sm border border-stone-200 px-3 py-2 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              <Download size={14} /> {downloading ? '產生中...' : '下載 PDF'}
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 text-sm border border-stone-200 px-3 py-2 rounded-lg text-stone-600 hover:bg-stone-50"
            >
              <History size={14} /> 版本紀錄
            </button>
            <Link
              href={`/quotes/${id}/edit`}
              className="flex items-center gap-1.5 text-sm bg-amber-600 text-white px-3 py-2 rounded-lg hover:bg-amber-700"
            >
              <Edit2 size={14} /> 編輯
            </Link>
            {quote.documentType === 'contract' ? (
              <Link
                href={`/quotes/${id}/contract`}
                className="flex items-center gap-1.5 text-sm bg-stone-800 text-white px-3 py-2 rounded-lg hover:bg-stone-900"
              >
                <FileSignature size={14} /> 編輯合約
              </Link>
            ) : (quote.status === 'signed' || quote.status === 'closed') && (
              <button
                onClick={handleConvertToContract}
                className="flex items-center gap-1.5 text-sm bg-stone-800 text-white px-3 py-2 rounded-lg hover:bg-stone-900"
              >
                <FileSignature size={14} /> 開立合約
              </button>
            )}
            <button
              onClick={() => { setShowDeleteModal(true); setDeleteInput('') }}
              className="flex items-center gap-1.5 text-sm border border-red-200 text-red-500 px-3 py-2 rounded-lg hover:bg-red-50"
            >
              <Trash2 size={14} /> 刪除
            </button>
          </div>
        </div>

        {/* Status stepper */}
        <div className="mt-5 flex items-center gap-2">
          {STATUS_FLOW.map((s, i) => {
            const isPast = i <= currentStatusIndex
            const isCurrent = i === currentStatusIndex
            return (
              <div key={s} className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange(s)}
                  disabled={updatingStatus}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                    isCurrent
                      ? `${QUOTE_STATUS_COLORS[s]} ring-2 ring-offset-1 ring-current`
                      : isPast
                      ? 'bg-stone-100 text-stone-600'
                      : 'bg-stone-50 text-stone-400 hover:bg-stone-100'
                  }`}
                >
                  {QUOTE_STATUS_LABELS[s]}
                </button>
                {i < STATUS_FLOW.length - 1 && (
                  <div className={`h-0.5 w-6 ${i < currentStatusIndex ? 'bg-stone-400' : 'bg-stone-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Version history */}
      {showHistory && quote.versions && (
        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-5">
          <h3 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
            <History size={15} /> 版本歷史
          </h3>
          {quote.versions.length === 0 ? (
            <p className="text-sm text-stone-400">尚無版本紀錄</p>
          ) : (
            <div className="space-y-2">
              {quote.versions.map(v => (
                <div key={v.id} className="flex gap-3 text-sm">
                  <span className="font-mono text-xs text-stone-400 w-12 flex-shrink-0">{v.versionNumber}</span>
                  <span className="text-stone-600">{v.changelog}</span>
                  <span className="text-stone-400 text-xs ml-auto flex-shrink-0">{formatDate(v.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quote content preview */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        {/* Standard items */}
        {quote.standardItems.length > 0 && (
          <section>
            <div className="px-6 py-3 bg-stone-50 border-b border-stone-200">
              <h3 className="font-semibold text-stone-700 text-sm">制式項目</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left px-6 py-2.5 text-stone-500 font-medium">項目</th>
                  <th className="text-right px-6 py-2.5 text-stone-500 font-medium w-32">金額（未稅）</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {quote.standardItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-3">
                      <div className="font-medium text-stone-700">{item.name}</div>
                      {item.description && <div className="text-xs text-stone-400 mt-0.5 whitespace-pre-line">{item.description}</div>}
                    </td>
                    <td className="px-6 py-3 text-right text-stone-600">{item.price ? formatCurrency(item.price) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Optional items */}
        {quote.optionalItems.length > 0 && (
          <section className="border-t border-stone-200">
            <div className="px-6 py-3 bg-blue-50 border-b border-stone-200">
              <h3 className="font-semibold text-stone-700 text-sm">選配項目</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-50">
                {quote.optionalItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-3">
                      <div className="font-medium text-stone-700">{item.name}</div>
                      {item.description && <div className="text-xs text-stone-400 mt-0.5 whitespace-pre-line">{item.description}</div>}
                    </td>
                    <td className="px-6 py-3 text-right text-stone-600 w-32">{item.price ? formatCurrency(item.price) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Bonus items */}
        {quote.bonusItems.length > 0 && (
          <section className="border-t border-stone-200">
            <div className="px-6 py-3 bg-amber-50 border-b border-stone-200">
              <h3 className="font-semibold text-amber-700 text-sm">額外贈送項目</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-stone-50">
                {quote.bonusItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-3">
                      <div className="font-medium text-stone-700">{item.name}</div>
                      {item.description && <div className="text-xs text-stone-400 mt-0.5 whitespace-pre-line">{item.description}</div>}
                    </td>
                    <td className="px-6 py-3 text-right text-amber-600 w-32 text-xs">
                      {item.price ? `價值 ${formatCurrency(item.price)}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Totals */}
        <div className="border-t border-stone-200 p-6">
          <div className="ml-auto w-64 space-y-2 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>小計（未稅）</span>
              <span>{formatCurrency(quote.subtotal)}</span>
            </div>
            {quote.discountAmount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{quote.discountLabel || '折扣'}</span>
                <span>－{formatCurrency(quote.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-600">
              <span>稅金 5%</span>
              <span>{formatCurrency(quote.taxAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-stone-800 text-base pt-2 border-t border-stone-200">
              <span>總計（含稅）</span>
              <span className="text-amber-700">{formatCurrency(quote.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-stone-800">刪除報價單</h3>
                <p className="text-xs text-stone-400 mt-0.5">此操作無法復原</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5 text-sm text-red-700">
              <div className="font-medium mb-1">{quote.quoteNumber}</div>
              <div>{quote.projectName} · {client?.companyName}</div>
            </div>

            <p className="text-sm text-stone-600 mb-3">
              請在下方輸入 <span className="font-mono font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">DELETE</span> 確認刪除：
            </p>
            <input
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="輸入 DELETE"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteInput('') }}
                className="px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteInput !== 'DELETE' || deleting}
                className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-red-700 disabled:bg-red-200 disabled:cursor-not-allowed font-medium"
              >
                {deleting ? '刪除中...' : '確認刪除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
