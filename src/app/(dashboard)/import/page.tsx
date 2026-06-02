'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, createQuote, getClients } from '@/lib/firestore'
import { uploadQuotePDF } from '@/lib/storageUtils'
import { useAuth } from '@/contexts/AuthContext'
import { Client, QuoteItem } from '@/types'
import { toast } from 'sonner'
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface ParsedData {
  client: {
    companyName: string; clientCode: string; contactPerson: string; title: string
    email: string; phone: string; address: string; taxId: string
  }
  quote: {
    quoteNumber: string; projectName: string; serviceType: string
    versionLabel: string; discountLabel: string; discountAmount: number
    subtotal: number; taxAmount: number; total: number; notes: string
  }
  standardItems: { name: string; description: string; price: number | null }[]
  optionalItems: { name: string; description: string; price: number | null }[]
  bonusItems: { name: string; description: string; price: number | null }[]
}

function makeItem(i: { name: string; description: string; price: number | null }, cat: 'standard' | 'optional' | 'bonus'): QuoteItem {
  return { id: Math.random().toString(36).slice(2), name: i.name || '', description: i.description || '', price: i.price || null, category: cat }
}

export default function ImportPage() {
  const { appUser } = useAuth()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'upload' | 'review' | 'saving'>('upload')
  const [parsing, setParsing] = useState(false)
  const [fileName, setFileName] = useState('')
  const [parsed, setParsed] = useState<ParsedData | null>(null)
  const [existingClients, setExistingClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [createNewClient, setCreateNewClient] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.pdf')) { toast.error('請上傳 PDF 檔案'); return }
    setUploadedFile(file)
    setFileName(file.name)
    setParsing(true)
    try {
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch('/api/parse-pdf', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || '解析失敗')
      setParsed(json.data)
      const clients = await getClients()
      setExistingClients(clients)
      const match = clients.find(c => c.companyName === json.data.client.companyName || c.email === json.data.client.email)
      if (match) { setSelectedClientId(match.id); setCreateNewClient(false) }
      setStep('review')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '解析失敗，請重試')
      setFileName('')
    } finally {
      setParsing(false)
    }
  }

  const handleConfirmImport = async () => {
    if (!parsed) return
    setStep('saving')
    try {
      let clientId = selectedClientId
      if (createNewClient || !clientId) {
        clientId = await createClient({ ...parsed.client, notes: '（由 PDF 匯入建立）', clientCode: parsed.client.clientCode || '', representative: '', createdBy: appUser?.uid || '' })
      }
      const quoteId = await createQuote({
        clientId,
        quoteNumber: parsed.quote.quoteNumber || `IMPORT-${Date.now()}`,
        versionLabel: parsed.quote.versionLabel || 'v01',
        projectName: parsed.quote.projectName || '（已匯入）',
        serviceType: parsed.quote.serviceType || '整合行銷服務',
        status: 'closed',
        standardItems: parsed.standardItems.map(i => makeItem(i, 'standard')),
        optionalItems: parsed.optionalItems.map(i => makeItem(i, 'optional')),
        bonusItems: parsed.bonusItems.map(i => makeItem(i, 'bonus')),
        discountLabel: parsed.quote.discountLabel || '',
        discountAmount: parsed.quote.discountAmount || 0,
        taxRate: 0.05,
        taxAmount: parsed.quote.taxAmount || 0,
        subtotal: parsed.quote.subtotal || 0,
        total: parsed.quote.total || 0,
        notes: parsed.quote.notes || '',
        hasContractTerms: false,
        parentQuoteId: null,
        originalFileUrl: '',
        createdBy: appUser?.uid || '',
      })

      // Upload original PDF to Storage and update the quote
      if (uploadedFile) {
        try {
          const url = await uploadQuotePDF(quoteId, uploadedFile)
          await import('@/lib/firestore').then(m => m.updateQuote(quoteId, { originalFileUrl: url }))
        } catch {
          // Storage upload failure is non-fatal
          console.warn('Original PDF upload failed, continuing without it')
        }
      }

      toast.success(`已匯入「${parsed.client.companyName}」的報價單`)
      router.push(`/quotes/${quoteId}`)
    } catch (err) {
      toast.error('匯入失敗，請重試')
      console.error(err)
      setStep('review')
    }
  }

  const reset = () => {
    setStep('upload'); setParsed(null); setFileName('')
    setSelectedClientId(''); setCreateNewClient(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  if (step === 'upload') return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">匯入既有報價單</h1>
        <p className="text-stone-500 text-sm mt-1">上傳 PDF 報價單，AI 自動解析並建立歷史紀錄</p>
      </div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-colors ${dragOver ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'}`}
      >
        <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
        {parsing ? (
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600" />
            <div className="text-stone-600 font-medium">AI 解析中：{fileName}</div>
            <div className="text-stone-400 text-sm">正在讀取報價單內容...</div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload size={40} className="text-stone-300" />
            <div className="text-stone-600 font-medium">拖曳或點擊上傳 PDF</div>
            <div className="text-stone-400 text-sm">支援奇策整合行銷的報價單格式</div>
          </div>
        )}
      </div>
      <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm text-amber-700">
        <strong>說明：</strong>系統自動抽取客戶資料、報價金額、服務項目，解析完成後可檢閱確認再儲存。
      </div>
    </div>
  )

  if (step === 'review' && parsed) {
    const allItems = [
      ...parsed.standardItems.map(i => ({ ...i, cat: '制式' })),
      ...parsed.optionalItems.map(i => ({ ...i, cat: '選配' })),
      ...parsed.bonusItems.map(i => ({ ...i, cat: '贈送' })),
    ]
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-stone-800">確認解析結果</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-stone-500"><FileText size={14} /><span>{fileName}</span></div>
          </div>
          <button onClick={reset} className="flex items-center gap-1.5 text-sm text-stone-500 border border-stone-200 px-3 py-2 rounded-lg hover:bg-stone-50">
            <RefreshCw size={13} /> 重新上傳
          </button>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
          <h3 className="font-semibold text-stone-700 mb-3 flex items-center gap-2"><CheckCircle size={15} className="text-green-500" /> 客戶資料</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['公司名稱', parsed.client.companyName],['英文簡稱', parsed.client.clientCode],['統一編號', parsed.client.taxId],['聯絡人', `${parsed.client.contactPerson} ${parsed.client.title}`],['Email', parsed.client.email],['電話', parsed.client.phone],['地址', parsed.client.address]].filter(([,v]) => v?.trim()).map(([l,v]) => (
              <div key={l}><span className="text-stone-400">{l}：</span><span className="text-stone-700">{v}</span></div>
            ))}
          </div>
          {existingClients.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-100">
              <div className="text-sm font-medium text-stone-600 mb-2">客戶對應</div>
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={createNewClient} onChange={() => setCreateNewClient(true)} /> 建立新客戶</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" checked={!createNewClient} onChange={() => setCreateNewClient(false)} /> 合併到既有客戶</label>
                {!createNewClient && (
                  <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)} className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                    <option value="">選擇客戶...</option>
                    {existingClients.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
          <h3 className="font-semibold text-stone-700 mb-3 flex items-center gap-2"><CheckCircle size={15} className="text-green-500" /> 報價單資訊</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[['報價單號', parsed.quote.quoteNumber],['版本', parsed.quote.versionLabel],['專案名稱', parsed.quote.projectName],['服務類型', parsed.quote.serviceType],['折扣', parsed.quote.discountLabel ? `${parsed.quote.discountLabel}（-NT$${parsed.quote.discountAmount?.toLocaleString()}）` : '無'],['總計含稅', parsed.quote.total ? `NT$${parsed.quote.total.toLocaleString()}` : '—']].map(([l,v]) => (
              <div key={l}><span className="text-stone-400">{l}：</span><span className="text-stone-700">{v}</span></div>
            ))}
          </div>
        </div>

        {allItems.length > 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-5 mb-4">
            <h3 className="font-semibold text-stone-700 mb-3 flex items-center gap-2"><CheckCircle size={15} className="text-green-500" /> 服務項目（{allItems.length} 項）</h3>
            <div className="divide-y divide-stone-50">
              {allItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${item.cat === '制式' ? 'bg-stone-100 text-stone-600' : item.cat === '選配' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>{item.cat}</span>
                    <span className="text-stone-700">{item.name}</span>
                  </div>
                  <span className="text-stone-500">{item.price ? `NT$${item.price.toLocaleString()}` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 flex items-start gap-2 text-sm text-amber-700">
            <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />
            <span>未解析到服務項目，匯入後可在報價單編輯頁手動補充。</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button onClick={reset} className="px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50">取消</button>
          <button onClick={handleConfirmImport} disabled={!createNewClient && !selectedClientId} className="bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-amber-700 disabled:bg-amber-300 font-medium flex items-center gap-2">
            <Upload size={15} /> 確認匯入
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-600 mx-auto mb-3" />
        <div className="text-stone-600">正在儲存報價單...</div>
      </div>
    </div>
  )
}
