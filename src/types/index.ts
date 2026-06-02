export type UserRole = 'admin' | 'staff'

export interface AppUser {
  uid: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  createdBy: string
}

export type QuoteStatus = 'draft' | 'sent' | 'signed' | 'closed'

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: '開立報價單',
  sent: '等待簽回',
  signed: '已簽回',
  closed: '已結案',
}

export const QUOTE_STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  signed: 'bg-green-100 text-green-700',
  closed: 'bg-amber-100 text-amber-700',
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
  draftQuotes: number
  sentQuotes: number
  signedQuotes: number
  closedQuotes: number
}
