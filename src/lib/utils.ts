import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | null): string {
  if (amount === null) return '—'
  return `NT$${amount.toLocaleString('zh-TW')}`
}

export function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'yyyy/MM/dd', { locale: zhTW })
  } catch {
    return dateStr
  }
}

export function generateQuoteNumber(clientCode: string): string {
  const date = format(new Date(), 'yyyyMMdd')
  const code = clientCode.trim().toUpperCase() || 'XX'
  return `${code}-${date}-v01`
}

export function incrementVersionLabel(label: string): string {
  const match = label.match(/v(\d+)$/)
  if (!match) return label + '-v02'
  const num = parseInt(match[1]) + 1
  return label.replace(/v\d+$/, `v${String(num).padStart(2, '0')}`)
}

export function calcTotals(
  standardItems: { price: number | null }[],
  optionalItems: { price: number | null }[],
  discountAmount: number,
  taxRate: number
) {
  const subtotal = [...standardItems, ...optionalItems].reduce(
    (sum, item) => sum + (item.price ?? 0),
    0
  )
  const afterDiscount = subtotal - discountAmount
  const taxAmount = Math.round(afterDiscount * taxRate)
  const total = afterDiscount + taxAmount
  return { subtotal, taxAmount, total }
}
