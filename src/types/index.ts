import type { Installment } from '@/data/contractTerms'
export type { Installment }

export type UserRole = 'admin' | 'staff'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  createdBy: string
}

export type QuoteStatus =
  | 'draft'
  | 'quote_signed'
  | 'contract_issued'
  | 'contract_signed'
  | 'in_progress'
  | 'closed'

// 案件生命週期順序（進度條依此排列）
export const STATUS_FLOW: QuoteStatus[] = [
  'draft',
  'quote_signed',
  'contract_issued',
  'contract_signed',
  'in_progress',
  'closed',
]

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: '開立報價單',
  quote_signed: '報價單簽回',
  contract_issued: '開立合約',
  contract_signed: '合約簽回',
  in_progress: '專案進行中',
  closed: '已結案',
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  quote_signed: 'bg-sky-100 text-sky-700',
  contract_issued: 'bg-indigo-100 text-indigo-700',
  contract_signed: 'bg-violet-100 text-violet-700',
  in_progress: 'bg-amber-100 text-amber-700',
  closed: 'bg-emerald-100 text-emerald-700',
}

// 舊狀態 → 新狀態對照（讀取時自動正規化，避免舊資料顯示空白）
const LEGACY_STATUS_MAP: Record<string, QuoteStatus> = {
  sent: 'draft',        // 等待簽回 → 開立報價單（等待中即停留在此階段）
  signed: 'quote_signed', // 已簽回 → 報價單簽回
}

export function normalizeStatus(status: string): QuoteStatus {
  if (status in QUOTE_STATUS_LABELS) return status as QuoteStatus
  return LEGACY_STATUS_MAP[status] || 'draft'
}

export type ServiceItemCategory = 'standard' | 'optional' | 'bonus'

export interface ServiceItemTemplate {
  id: string
  name: string
  description: string
  notes?: string[]
  defaultPrice: number | null
  category: ServiceItemCategory
  group: string
  sortOrder?: number
}

export const CATEGORY_LABELS: Record<ServiceItemCategory, string> = {
  standard: '制式項目',
  optional: '選配項目',
  bonus: '額外贈送項目',
}

export const CATEGORY_ORDER: ServiceItemCategory[] = ['standard', 'optional', 'bonus']

export interface QuoteItem {
  id: string
  name: string
  description: string
  notes?: string[]
  price: number | null
  remark?: string
  category: ServiceItemCategory
  group?: string
  isCustom?: boolean
}

export interface ContractFile {
  url: string
  path: string
  name: string
  size: number
  uploadedAt: string
  uploadedBy?: string
}

export interface QuoteVersion {
  id: string
  versionNumber: string
  snapshot: Omit<Quote, 'versions'>
  changelog: string
  createdAt: string
  createdBy: string
}

export interface Quote {
  id: string
  quoteNumber: string
  versionLabel: string
  clientId: string
  projectName: string
  serviceType: string
  status: QuoteStatus
  standardItems: QuoteItem[]
  optionalItems: QuoteItem[]
  bonusItems: QuoteItem[]
  subtotal: number
  discountLabel: string
  discountAmount: number
  taxRate: number
  taxAmount: number
  total: number
  notes: string
  hasContractTerms: boolean
  parentQuoteId: string | null
  originalFileUrl?: string
  // ── 合約專用欄位（documentType === 'contract' 時使用）──
  documentType?: 'quote' | 'contract'
  contractStartDate?: string
  contractEndDate?: string
  contractTerms?: string[]
  installments?: Installment[]
  signDate?: string
  contractFiles?: ContractFile[]
  launchDate?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  versions?: QuoteVersion[]
}

export interface Client {
  id: string
  companyName: string
  clientCode: string
  contactPerson: string
  title: string
  representative: string
  email: string
  phone: string
  address: string
  taxId: string
  notes: string
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface DashboardStats {
  totalClients: number
  totalQuotes: number
  byStatus: Record<QuoteStatus, number>
}
