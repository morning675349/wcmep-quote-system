'use client'

import { useEffect, useState } from 'react'
import {
  getServiceItems, createServiceItem, updateServiceItem,
  deleteServiceItem, seedServiceItemsIfEmpty
} from '@/lib/firestore'
import { ServiceItemTemplate, ServiceItemCategory } from '@/types'
import { SERVICE_GROUPS } from '@/data/serviceItems'
import { Plus, Trash2, Edit2, Check, X, Download } from 'lucide-react'
import { toast } from 'sonner'

const CATEGORY_LABELS: Record<ServiceItemCategory, string> = {
  standard: '制式',
  optional: '選配',
  bonus: '贈送',
}
const CATEGORY_COLORS: Record<ServiceItemCategory, string> = {
  standard: 'bg-stone-100 text-stone-600',
  optional: 'bg-blue-50 text-blue-600',
  bonus: 'bg-amber-50 text-amber-600',
}

const BLANK: Omit<ServiceItemTemplate, 'id'> = {
  name: '',
  description: '',
  notes: [],
  defaultPrice: null,
  category: 'standard',
  group: '網站基礎',
}

export default function ServiceItemsPage() {
  const [items, setItems] = useState<ServiceItemTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ServiceItemTemplate>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [groupFilter, setGroupFilter] = useState<string>('全部')

  const load = async () => {
    const data = await getServiceItems()
    setItems(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSeed = async () => {
    setSeeding(true)
    try {
      await seedServiceItemsIfEmpty()
      await load()
      toast.success('已匯入預設服務項目庫')
    } catch {
      toast.error('匯入失敗')
    } finally {
      setSeeding(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`確定刪除「${name}」？`)) return
    await deleteServiceItem(id)
    toast.success('已刪除')
    load()
  }

  const startEdit = (item: ServiceItemTemplate) => {
    setEditingId(item.id)
    setEditForm({ ...item })
  }

  const cancelEdit = () => { setEditingId(null); setEditForm({}) }

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.name?.trim()) { toast.error('請填寫項目名稱'); return }
    setSaving(true)
    try {
      await updateServiceItem(editingId, editForm)
      toast.success('已更新')
      setEditingId(null)
      load()
    } catch { toast.error('更新失敗') }
    finally { setSaving(false) }
  }

  const handleAdd = async () => {
    if (!addForm.name.trim()) { toast.error('請填寫項目名稱'); return }
    setSaving(true)
    try {
      await createServiceItem(addForm)
      toast.success(`「${addForm.name}」已加入服務項目庫`)
      setShowAdd(false)
      setAddForm({ ...BLANK })
      load()
    } catch { toast.error('新增失敗') }
    finally { setSaving(false) }
  }

  const allGroups = ['全部', ...Array.from(new Set([...SERVICE_GROUPS, ...items.map(i => i.group)]))]
  const filtered = items.filter(i => groupFilter === '全部' || i.group === groupFilter)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">服務項目庫</h1>
          <p className="text-stone-500 text-sm mt-1">共 {items.length} 個項目</p>
        </div>
        <div className="flex items-center gap-2">
          {items.length === 0 && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-1.5 text-sm border border-stone-200 px-3 py-2.5 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-50"
            >
              <Download size={14} /> {seeding ? '匯入中...' : '匯入預設項目'}
            </button>
          )}
          <button
            onClick={() => { setShowAdd(true); setEditingId(null) }}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2.5 rounded-lg text-sm hover:bg-amber-700 font-medium"
          >
            <Plus size={16} /> 新增項目
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-amber-200 p-5 mb-5">
          <h3 className="font-semibold text-stone-700 mb-4">新增服務項目</h3>
          <ItemForm
            form={addForm}
            onChange={f => setAddForm(f as typeof addForm)}
            onSave={handleAdd}
            onCancel={() => setShowAdd(false)}
            saving={saving}
            isNew
          />
        </div>
      )}

      {/* Group filter tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {allGroups.map(g => (
          <button
            key={g}
            onClick={() => setGroupFilter(g)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              groupFilter === g ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-stone-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <p className="text-stone-400 text-sm">
            {items.length === 0 ? '尚無項目，點「匯入預設項目」快速建立' : '此分類無項目'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left px-5 py-3 text-stone-600 font-medium w-32">分類</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium">項目名稱</th>
                <th className="text-left px-5 py-3 text-stone-600 font-medium w-24">群組</th>
                <th className="text-right px-5 py-3 text-stone-600 font-medium w-28">預設金額</th>
                <th className="px-5 py-3 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map(item => (
                editingId === item.id ? (
                  <tr key={item.id} className="bg-amber-50">
                    <td colSpan={5} className="px-5 py-4">
                      <ItemForm
                        form={editForm as Omit<ServiceItemTemplate, 'id'>}
                        onChange={setEditForm}
                        onSave={handleSaveEdit}
                        onCancel={cancelEdit}
                        saving={saving}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[item.category]}`}>
                        {CATEGORY_LABELS[item.category]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-stone-700">{item.name}</div>
                      {item.description && <div className="text-xs text-stone-400 mt-0.5 line-clamp-1">{item.description}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-stone-500 text-xs">{item.group}</td>
                    <td className="px-5 py-3.5 text-right text-stone-600">
                      {item.defaultPrice ? `NT$${item.defaultPrice.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => startEdit(item)} className="text-stone-300 hover:text-amber-600 transition-colors">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(item.id, item.name)} className="text-stone-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ItemForm({
  form, onChange, onSave, onCancel, saving, isNew = false
}: {
  form: Partial<Omit<ServiceItemTemplate, 'id'>>
  onChange: (f: Partial<Omit<ServiceItemTemplate, 'id'>>) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isNew?: boolean
}) {
  const set = (k: string, v: unknown) => onChange({ ...form, [k]: v })
  const notesStr = (form.notes || []).join('\n')

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-stone-600 mb-1">項目名稱 *</label>
        <input
          value={form.name || ''}
          onChange={e => set('name', e.target.value)}
          placeholder="例：課程學院系統"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">分類</label>
        <select value={form.category || 'standard'} onChange={e => set('category', e.target.value)}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
          <option value="standard">制式項目</option>
          <option value="optional">選配項目</option>
          <option value="bonus">贈送項目</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">群組</label>
        <input
          value={form.group || ''}
          onChange={e => set('group', e.target.value)}
          list="group-list"
          placeholder="例：功能模組"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <datalist id="group-list">
          {SERVICE_GROUPS.map(g => <option key={g} value={g} />)}
        </datalist>
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">預設金額（NT$）</label>
        <input
          type="number"
          value={form.defaultPrice ?? ''}
          onChange={e => set('defaultPrice', e.target.value ? parseInt(e.target.value) : null)}
          placeholder="留空 = 無固定金額"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-stone-600 mb-1">說明文字</label>
        <input
          value={form.description || ''}
          onChange={e => set('description', e.target.value)}
          placeholder="簡短說明"
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-medium text-stone-600 mb-1">細項說明（每行一條，會以 • 顯示）</label>
        <textarea
          value={notesStr}
          onChange={e => set('notes', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          placeholder={'可設定排程發送\n電子報點擊率統計\n...'}
          className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none font-mono"
        />
      </div>
      <div className="col-span-2 flex justify-end gap-3">
        <button onClick={onCancel} type="button" className="flex items-center gap-1 text-sm text-stone-500 px-3 py-2 border border-stone-200 rounded-lg hover:bg-stone-50">
          <X size={13} /> 取消
        </button>
        <button onClick={onSave} disabled={saving} type="button"
          className="flex items-center gap-1 bg-amber-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-700 disabled:bg-amber-300 font-medium">
          <Check size={13} /> {saving ? '儲存中...' : isNew ? '新增' : '儲存'}
        </button>
      </div>
    </div>
  )
}
