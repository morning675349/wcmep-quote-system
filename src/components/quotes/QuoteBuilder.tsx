'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getClients, getQuote, createQuote, updateQuote, getServiceItems, createServiceItem, seedServiceItemsIfEmpty } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Client, Quote, QuoteItem, ServiceItemCategory, ServiceItemTemplate } from '@/types'
import { SERVICE_GROUPS } from '@/data/serviceItems'
import { calcTotals, formatCurrency, generateQuoteNumber, incrementVersionLabel } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical, BookmarkPlus } from 'lucide-react'
import { format } from 'date-fns'

interface Props {
  quoteId?: string
  mode?: 'create' | 'edit'
}

type SectionKey = 'standard' | 'optional' | 'bonus'

const SECTION_LABELS: Record<SectionKey, string> = {
  standard: '制式項目',
  optional: '選配項目',
  bonus: '額外贈送項目',
}

function generateId() {
  return Math.random().toString(36).slice(2)
}

function itemFromTemplate(t: ServiceItemTemplate): QuoteItem {
  return {
    id: generateId(),
    name: t.name,
    description: t.description,
    notes: t.notes,
    price: t.defaultPrice,
    category: t.category,
    group: t.group,
  }
}

export default function QuoteBuilder({ quoteId, mode = 'create' }: Props) {
  const { appUser } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetClientId = searchParams.get('clientId') || ''

  const [clients, setClients] = useState<Client[]>([])
  const [templates, setTemplates] = useState<ServiceItemTemplate[]>([])
  const [saving, setSaving] = useState(false)
  const [changelog, setChangelog] = useState('')
  const [showChangelogModal, setShowChangelogModal] = useState(false)

  // Form state
  const [clientId, setClientId] = useState(presetClientId)
  const [projectName, setProjectName] = useState('')
  const [serviceType, setServiceType] = useState('網站設計服務')
  const [versionLabel, setVersionLabel] = useState('v01')
  const [quoteNumber, setQuoteNumber] = useState('')
  const [discountLabel, setDiscountLabel] = useState('')
  const [discountAmount, setDiscountAmount] = useState(0)
  const [taxRate] = useState(0.05)
  const [notes, setNotes] = useState('')
  const [standardItems, setStandardItems] = useState<QuoteItem[]>([])
  const [optionalItems, setOptionalItems] = useState<QuoteItem[]>([])
  const [bonusItems, setBonusItems] = useState<QuoteItem[]>([])
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [originalQuote, setOriginalQuote] = useState<Quote | null>(null)

  const setItems = (cat: SectionKey, items: QuoteItem[]) => {
    if (cat === 'standard') setStandardItems(items)
    else if (cat === 'optional') setOptionalItems(items)
    else setBonusItems(items)
  }

  const getItems = (cat: SectionKey) => {
    if (cat === 'standard') return standardItems
    if (cat === 'optional') return optionalItems
    return bonusItems
  }

  const { subtotal, taxAmount, total } = calcTotals(standardItems, optionalItems, discountAmount, taxRate)

  useEffect(() => {
    getClients().then(setClients)
    seedServiceItemsIfEmpty().then(() => getServiceItems().then(setTemplates))
  }, [])

  useEffect(() => {
    if (mode === 'edit' && quoteId) {
      getQuote(quoteId).then(q => {
        if (!q) return
        setOriginalQuote(q)
        setClientId(q.clientId)
        setProjectName(q.projectName)
        setServiceType(q.serviceType)
        setVersionLabel(q.versionLabel)
        setQuoteNumber(q.quoteNumber)
        setDiscountLabel(q.discountLabel)
        setDiscountAmount(q.discountAmount)
        setNotes(q.notes)
        setStandardItems(q.standardItems)
        setOptionalItems(q.optionalItems)
        setBonusItems(q.bonusItems)
      })
    }
  }, [quoteId, mode])

  // Auto-generate quote number when client changes
  useEffect(() => {
    if (mode === 'create' && clientId) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        const code = client.clientCode?.trim() || client.companyName.slice(0, 2).toUpperCase()
        setQuoteNumber(generateQuoteNumber(code))
      }
    }
  }, [clientId, clients, mode])

  const toggleTemplateItem = (templateId: string, category: ServiceItemCategory) => {
    const t = templates.find(t => t.id === templateId)
    if (!t) return
    const cat = category as SectionKey
    const items = getItems(cat)
    const exists = items.find(i => i.id === templateId || i.name === t.name)
    if (exists) {
      setItems(cat, items.filter(i => i.name !== t.name))
    } else {
      setItems(cat, [...items, { ...itemFromTemplate(t), id: templateId }])
    }
  }

  const addCustomItem = (cat: SectionKey) => {
    const item: QuoteItem = {
      id: generateId(),
      name: '自訂項目',
      description: '',
      price: null,
      category: cat,
      isCustom: true,
    }
    setItems(cat, [...getItems(cat), item])
  }

  const removeItem = (cat: SectionKey, id: string) => {
    setItems(cat, getItems(cat).filter(i => i.id !== id))
  }

  const updateItem = (cat: SectionKey, id: string, field: string, value: string | number | null) => {
    setItems(cat, getItems(cat).map(i => i.id === id ? { ...i, [field]: value } : i))
  }

  const handleSave = async () => {
    if (!clientId) { toast.error('請選擇客戶'); return }
    if (!projectName.trim()) { toast.error('請輸入專案名稱'); return }
    if (mode === 'edit' && !changelog.trim()) {
      setShowChangelogModal(true)
      return
    }
    await doSave()
  }

  const doSave = async () => {
    setSaving(true)
    setShowChangelogModal(false)
    try {
      const payload = {
        clientId, projectName, serviceType, versionLabel, quoteNumber,
        discountLabel, discountAmount, taxRate,
        taxAmount, subtotal, total,
        notes, status: originalQuote?.status || 'draft' as const,
        standardItems, optionalItems, bonusItems,
        parentQuoteId: originalQuote?.parentQuoteId || null,
        createdBy: appUser?.uid || '',
      }
      if (mode === 'edit' && quoteId) {
        await updateQuote(quoteId, { ...payload, versionLabel: incrementVersionLabel(versionLabel) }, changelog, appUser?.uid)
        toast.success('報價單已更新')
        router.push(`/quotes/${quoteId}`)
      } else {
        const id = await createQuote(payload)
        toast.success('報價單已建立')
        router.push(`/quotes/${id}`)
      }
    } catch (err) {
      toast.error('儲存失敗')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const saveToLibrary = async (item: QuoteItem) => {
    try {
      await createServiceItem({
        name: item.name,
        description: item.description || '',
        notes: item.notes || [],
        defaultPrice: item.price,
        category: item.category,
        group: item.group || '其他服務',
      })
      toast.success(`「${item.name}」已存入服務項目庫`)
      getServiceItems().then(setTemplates)
    } catch {
      toast.error('儲存失敗')
    }
  }

  const allGroups = Array.from(new Set([...SERVICE_GROUPS, ...templates.map(t => t.group)])).filter(Boolean)
  const templatesByGroup = allGroups.map(group => ({
    group,
    templates: templates.filter(t => t.group === group),
  })).filter(g => g.templates.length > 0)

  const renderItemsSection = (cat: SectionKey) => {
    const items = getItems(cat)
    return (
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className={`px-5 py-3 border-b flex items-center justify-between ${
          cat === 'standard' ? 'bg-stone-50' : cat === 'optional' ? 'bg-blue-50' : 'bg-amber-50'
        }`}>
          <h3 className="font-semibold text-stone-700">{SECTION_LABELS[cat]}</h3>
          <button
            onClick={() => addCustomItem(cat)}
            className="text-xs flex items-center gap-1 text-stone-500 hover:text-stone-800"
          >
            <Plus size={12} /> 自訂項目
          </button>
        </div>
        {items.length === 0 ? (
          <div className="p-5 text-sm text-stone-400 text-center">尚未加入任何項目</div>
        ) : (
          <div className="divide-y divide-stone-100">
            {items.map(item => (
              <div key={item.id} className="flex gap-3 p-4 items-start">
                <GripVertical size={14} className="text-stone-300 mt-2 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <input
                    value={item.name}
                    onChange={e => updateItem(cat, item.id, 'name', e.target.value)}
                    className="w-full font-medium text-stone-700 text-sm border-0 border-b border-transparent hover:border-stone-200 focus:border-amber-400 focus:outline-none bg-transparent"
                  />
                  <textarea
                    value={item.description}
                    onChange={e => updateItem(cat, item.id, 'description', e.target.value)}
                    rows={item.description ? 2 : 1}
                    placeholder="說明內容（選填）"
                    className="w-full text-xs text-stone-500 border-0 focus:outline-none focus:ring-0 bg-transparent resize-none placeholder:text-stone-300"
                  />
                  {item.notes && item.notes.length > 0 && (
                    <ul className="text-xs text-stone-400 space-y-0.5 ml-2">
                      {item.notes.map((n, i) => <li key={i} className="list-disc ml-3">{n}</li>)}
                    </ul>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-stone-400">NT$</span>
                    <input
                      type="number"
                      value={item.price ?? ''}
                      onChange={e => updateItem(cat, item.id, 'price', e.target.value === '' ? null : parseInt(e.target.value))}
                      placeholder="—"
                      className="w-28 pl-8 pr-2 py-1.5 text-sm text-right border border-stone-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                  {item.isCustom && (
                    <button
                      onClick={() => saveToLibrary(item)}
                      title="存入服務項目庫"
                      className="text-stone-300 hover:text-amber-500 transition-colors"
                    >
                      <BookmarkPlus size={14} />
                    </button>
                  )}
                  <button onClick={() => removeItem(cat, item.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Template picker */}
      <div className="col-span-1 space-y-3">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <h3 className="font-semibold text-stone-700 text-sm mb-3">從服務項目庫選取</h3>
          <div className="space-y-2">
            {templatesByGroup.map(({ group, templates }) => {
              const isOpen = openGroups[group] ?? true
              return (
                <div key={group} className="border border-stone-100 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setOpenGroups(g => ({ ...g, [group]: !isOpen }))}
                    className="w-full flex items-center justify-between px-3 py-2 bg-stone-50 text-xs font-medium text-stone-600 hover:bg-stone-100"
                  >
                    {group}
                    {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  {isOpen && (
                    <div className="p-2 space-y-1">
                      {templates.map(t => {
                        const cat = t.category as SectionKey
                        const items = getItems(cat)
                        const selected = items.some(i => i.id === t.id || i.name === t.name)
                        return (
                          <button
                            key={t.id}
                            onClick={() => toggleTemplateItem(t.id, t.category)}
                            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                              selected
                                ? 'bg-amber-100 text-amber-800 font-medium'
                                : 'text-stone-600 hover:bg-stone-100'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                t.category === 'standard' ? 'bg-stone-400' :
                                t.category === 'optional' ? 'bg-blue-400' : 'bg-amber-400'
                              }`} />
                              {t.name}
                            </div>
                            {t.defaultPrice && (
                              <div className="text-stone-400 mt-0.5 ml-3">
                                {formatCurrency(t.defaultPrice)}
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right: Form + Items */}
      <div className="col-span-2 space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-700 mb-4">基本資訊</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">客戶 *</label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">請選擇客戶</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.companyName}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1">專案名稱 *</label>
              <input
                value={projectName}
                onChange={e => setProjectName(e.target.value)}
                placeholder="例：整合行銷服務"
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">服務類型</label>
              <select
                value={serviceType}
                onChange={e => setServiceType(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {['網站設計服務', 'SEO行銷服務', '拍攝與設計服務', '課程網站服務', '整合行銷服務'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">報價單號</label>
              <input
                value={quoteNumber}
                onChange={e => setQuoteNumber(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Items */}
        {renderItemsSection('standard')}
        {renderItemsSection('optional')}
        {renderItemsSection('bonus')}

        {/* Pricing summary */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="font-semibold text-stone-700 mb-4">費用總覽</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm text-stone-600 w-24 flex-shrink-0">折扣名稱</label>
              <input
                value={discountLabel}
                onChange={e => setDiscountLabel(e.target.value)}
                placeholder="例：BNI優惠價、協會合作價"
                className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-stone-600 w-24 flex-shrink-0">折扣金額</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400">NT$</span>
                <input
                  type="number"
                  value={discountAmount || ''}
                  onChange={e => setDiscountAmount(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-9 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 w-36"
                />
              </div>
            </div>
            <div className="border-t border-stone-100 pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-stone-600">
                <span>小計（未稅）</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>{discountLabel || '折扣'}</span>
                  <span>－{formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-stone-600">
                <span>稅金 5%</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-stone-800 text-base border-t border-stone-200 pt-2 mt-2">
                <span>總計（含稅）</span>
                <span className="text-amber-700">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <label className="block text-sm font-medium text-stone-700 mb-2">備註說明</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="報價單備註（會顯示在報價單上）"
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-amber-600 text-white px-6 py-2.5 rounded-lg text-sm hover:bg-amber-700 disabled:bg-amber-300 font-medium"
          >
            {saving ? '儲存中...' : mode === 'edit' ? '更新報價單' : '建立報價單'}
          </button>
        </div>
      </div>

      {/* Changelog modal */}
      {showChangelogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-stone-800 mb-2">請說明本次修改內容</h3>
            <p className="text-sm text-stone-500 mb-4">這會記錄在版本歷史中</p>
            <textarea
              value={changelog}
              onChange={e => setChangelog(e.target.value)}
              rows={3}
              placeholder="例：依客戶要求調整頁數，新增購物車系統..."
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none mb-4"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowChangelogModal(false)} className="text-sm text-stone-500 hover:text-stone-700 px-3 py-2">
                取消
              </button>
              <button
                onClick={doSave}
                disabled={!changelog.trim() || saving}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 disabled:bg-amber-300"
              >
                確認更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
