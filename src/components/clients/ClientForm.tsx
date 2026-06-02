'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, updateClient } from '@/lib/firestore'
import { useAuth } from '@/contexts/AuthContext'
import { Client } from '@/types'
import { toast } from 'sonner'

interface Props {
  initial?: Partial<Client>
  clientId?: string
  onSuccess?: (id: string) => void
}

export default function ClientForm({ initial, clientId, onSuccess }: Props) {
  const { appUser } = useAuth()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: initial?.companyName || '',
    clientCode: initial?.clientCode || '',
    contactPerson: initial?.contactPerson || '',
    title: initial?.title || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    taxId: initial?.taxId || '',
    notes: initial?.notes || '',
  })

  const set = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.companyName.trim()) { toast.error('請輸入公司名稱'); return }
    setSaving(true)
    try {
      if (clientId) {
        await updateClient(clientId, form)
        toast.success('客戶資料已更新')
        onSuccess?.(clientId)
      } else {
        const id = await createClient({ ...form, createdBy: appUser?.uid || '' })
        toast.success('客戶已新增')
        onSuccess?.(id)
        router.push(`/clients/${id}`)
      }
    } catch (err) {
      toast.error('儲存失敗，請重試')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { label: '公司名稱 *', key: 'companyName', placeholder: '例：台灣轉型創新協會', required: true },
    { label: '英文簡稱（報價單號用）', key: 'clientCode', placeholder: '例：ATIT、VOLAR、SL', required: false },
    { label: '統一編號', key: 'taxId', placeholder: '12345678' },
    { label: '聯絡人', key: 'contactPerson', placeholder: '王晨安' },
    { label: '職稱', key: 'title', placeholder: '執行長' },
    { label: 'Email', key: 'email', placeholder: 'contact@example.com' },
    { label: '電話', key: 'phone', placeholder: '0923-675-349' },
    { label: '地址', key: 'address', placeholder: '台中市西屯區長安路一段228號2F' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {fields.map(f => (
          <div key={f.key} className={f.key === 'address' || f.key === 'companyName' ? 'col-span-2' : ''}>
            <label className="block text-sm font-medium text-stone-700 mb-1">{f.label}</label>
            <input
              value={form[f.key as keyof typeof form]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              required={f.required}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        ))}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">備註</label>
          <textarea
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            rows={3}
            placeholder="內部備註（不會顯示在報價單上）"
            className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={() => router.back()} className="px-4 py-2.5 text-sm text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50">
          取消
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-amber-700 disabled:bg-amber-300 font-medium"
        >
          {saving ? '儲存中...' : clientId ? '更新資料' : '新增客戶'}
        </button>
      </div>
    </form>
  )
}
