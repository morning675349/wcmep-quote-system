'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getQuote, updateQuote } from '@/lib/firestore'
import { Quote, Installment } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'

export default function ContractEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [signDate, setSignDate] = useState('')
  const [terms, setTerms] = useState<string[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])

  useEffect(() => {
    getQuote(id).then(q => {
      if (q) {
        setQuote(q)
        setStartDate(q.contractStartDate || '')
        setEndDate(q.contractEndDate || '')
        setSignDate(q.signDate || '')
        setTerms(q.contractTerms || [])
        setInstallments(q.installments || [])
      }
      setLoading(false)
    })
  }, [id])

  const totalPct = installments.reduce((s, i) => s + (i.percentage || 0), 0)
  const totalAmt = installments.reduce((s, i) => s + (i.amount || 0), 0)

  // ── terms handlers ──
  const updateTerm = (i: number, v: string) => setTerms(t => t.map((x, idx) => idx === i ? v : x))
  const addTerm = () => setTerms(t => [...t, ''])
  const removeTerm = (i: number) => setTerms(t => t.filter((_, idx) => idx !== i))
  const moveTerm = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= terms.length) return
    setTerms(t => { const n = [...t];[n[i], n[j]] = [n[j], n[i]]; return n })
  }

  // ── installment handlers ──
  const updateInst = (i: number, field: keyof Installment, v: string | number) =>
    setInstallments(arr => arr.map((x, idx) => idx === i ? { ...x, [field]: v } : x))
  const addInst = () => setInstallments(arr => [...arr, { amount: 0, percentage: 0, timing: '' }])
  const removeInst = (i: number) => setInstallments(arr => arr.filter((_, idx) => idx !== i))

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateQuote(id, {
        contractStartDate: startDate,
        contractEndDate: endDate,
        signDate,
        contractTerms: terms,
        installments,
      })
      toast.success('合約已儲存')
      router.push(`/quotes/${id}`)
    } catch {
      toast.error('儲存失敗')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="animate-pulse h-64 bg-stone-100 rounded-xl" />
  if (!quote) return <div className="text-stone-500">找不到合約</div>

  return (
    <div className="max-w-4xl">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-5">
        <ArrowLeft size={14} /> 返回
      </button>
      <h1 className="text-2xl font-bold text-stone-800 mb-1">編輯合約內容</h1>
      <p className="text-stone-500 text-sm mb-6">{quote.projectName} · 合約編號 {quote.quoteNumber}</p>

      {/* 合約期間 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-5">
        <h3 className="font-semibold text-stone-700 mb-4">合約期間與簽約日</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '合約起始日', val: startDate, set: setStartDate },
            { label: '合約結束日', val: endDate, set: setEndDate },
            { label: '簽約日期', val: signDate, set: setSignDate },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-medium text-stone-700 mb-1">{f.label}</label>
              <input
                value={f.val}
                onChange={e => f.set(e.target.value)}
                placeholder="例：2026年06月15日"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 付款期數 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-700">付款期數</h3>
          <div className="text-xs text-stone-400">
            合計 {totalPct}% · {formatCurrency(totalAmt)}
            {quote.total && totalAmt !== quote.total && (
              <span className="text-red-500 ml-2">⚠ 與總計 {formatCurrency(quote.total)} 不符</span>
            )}
          </div>
        </div>
        <div className="space-y-3">
          {installments.map((inst, i) => (
            <div key={i} className="flex gap-3 items-start bg-stone-50 rounded-lg p-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex-shrink-0 mt-1">
                {i + 1}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex gap-3">
                  <div className="w-32">
                    <label className="block text-xs text-stone-500 mb-1">金額（含稅）</label>
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">NT$</span>
                      <input type="number" value={inst.amount || ''} onChange={e => updateInst(i, 'amount', parseInt(e.target.value) || 0)}
                        className="w-full pl-8 pr-2 py-1.5 text-sm border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400" />
                    </div>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs text-stone-500 mb-1">比例 %</label>
                    <input type="number" value={inst.percentage || ''} onChange={e => updateInst(i, 'percentage', parseInt(e.target.value) || 0)}
                      className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-stone-500 mb-1">收款時間點 / 條件</label>
                  <textarea value={inst.timing} onChange={e => updateInst(i, 'timing', e.target.value)} rows={2}
                    placeholder="例：合約簽定時支付 / 網站全站上線前"
                    className="w-full px-2 py-1.5 text-sm border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none" />
                </div>
              </div>
              <button onClick={() => removeInst(i)} className="text-stone-300 hover:text-red-500 mt-1 flex-shrink-0">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addInst} className="mt-3 flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700">
          <Plus size={14} /> 新增一期
        </button>
      </div>

      {/* 合約條款 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-700">合約條款事項（{terms.length} 條）</h3>
          <span className="text-xs text-stone-400">{'{{START}} / {{END}} 會自動代入合約起訖日'}</span>
        </div>
        <div className="space-y-2">
          {terms.map((term, i) => (
            <div key={i} className="flex gap-2 items-start">
              <div className="flex flex-col items-center flex-shrink-0 pt-2">
                <span className="text-xs text-stone-400 font-mono w-5 text-center">{i + 1}</span>
                <div className="flex flex-col">
                  <button onClick={() => moveTerm(i, -1)} disabled={i === 0} className="text-stone-300 hover:text-amber-600 disabled:opacity-20"><ArrowUp size={11} /></button>
                  <button onClick={() => moveTerm(i, 1)} disabled={i === terms.length - 1} className="text-stone-300 hover:text-amber-600 disabled:opacity-20"><ArrowDown size={11} /></button>
                </div>
              </div>
              <textarea
                value={term}
                onChange={e => updateTerm(i, e.target.value)}
                rows={2}
                className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y"
              />
              <button onClick={() => removeTerm(i)} className="text-stone-300 hover:text-red-500 mt-2 flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={addTerm} className="mt-3 flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700">
          <Plus size={14} /> 新增條款
        </button>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => router.back()} className="px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50">取消</button>
        <button onClick={handleSave} disabled={saving} className="bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-amber-700 disabled:bg-amber-300 font-medium">
          {saving ? '儲存中...' : '儲存合約'}
        </button>
      </div>
    </div>
  )
}
