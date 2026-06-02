import { NextRequest, NextResponse } from 'next/server'
import { SERVICE_ITEM_TEMPLATES } from '@/data/serviceItems'

function extractMoney(text: string): number | null {
  const m = text.match(/NT\$\s*([\d,]+)/)
  if (!m) return null
  return parseInt(m[1].replace(/,/g, ''))
}

function clean(s: string | undefined): string {
  return (s || '').replace(/\s+/g, ' ').trim()
}

function guessClientCode(companyName: string, quoteNumber: string): string {
  // 1. Extract English letters already in company name (e.g., "金利旺VOLAR" → "VOLAR")
  const englishInName = companyName.match(/[A-Za-z]{2,}/)
  if (englishInName) return englishInName[0].toUpperCase()

  // 2. Extract code from quote number (e.g., "WP-ATIT20260523-v01" → "ATIT", "ATIT-20260523-v01" → "ATIT")
  const fromQuote = quoteNumber.match(/^(?:WP-)?([A-Za-z]{2,8})\d{8}/)
    || quoteNumber.match(/^([A-Za-z]{2,8})-\d{8}/)
  if (fromQuote) return fromQuote[1].toUpperCase()

  // 3. Fallback: first 2 chars of company name
  return companyName.slice(0, 2).toUpperCase()
}

function parseQuotePDF(text: string) {
  // Normalize: collapse multiple spaces but keep newlines
  const norm = text.replace(/[ \t]+/g, ' ')
  const lines = norm.split('\n').map(l => l.trim()).filter(Boolean)

  // ── 報價單號 ─────────────────────────────────────────
  const quoteNumMatch = norm.match(/報價單號[：:]\s*([A-Za-z0-9\-]+)/)
  const quoteNumber = quoteNumMatch?.[1]?.trim() || ''
  const versionMatch = quoteNumber.match(/(v\d+)$/i)
  const versionLabel = versionMatch?.[1]?.toLowerCase() || 'v01'

  // ── 專案名稱 ─────────────────────────────────────────
  const projectMatch = norm.match(/專案名稱[：:]\s*(.+?)[\n\r]/)
  const projectName = clean(projectMatch?.[1])

  // ── 服務類型 ─────────────────────────────────────────
  const serviceMatch = norm.match(/一[、,，]\s*(.{2,15}?服務)/)
  const serviceType = clean(serviceMatch?.[1]) || '整合行銷服務'

  // ── 甲方區塊（切出甲方到乙方之間的文字） ─────────────
  // PDF table can be on one line OR multi-line depending on extraction
  // Pattern 1: "甲方 XXX 乙方" (single line)
  // Pattern 2: "甲方\nXXX\n乙方" (multi-line)
  const clientSection = norm.match(/甲方[\s\n\r]+(.+?)[\s\n\r]+乙方/s)
    || norm.match(/甲方\s+(.+?)\s+乙方/)

  // Company name: first meaningful line in 甲方 section
  let companyName = ''
  if (clientSection?.[1]) {
    const sectionText = clientSection[1].trim()
    // Take first line if multi-line, strip trailing contact info
    companyName = clean(sectionText.split(/[\n\r]/)[0].replace(/聯絡人.*/, ''))
  }
  // Fallback: look for 甲方 followed by company on next line
  if (!companyName) {
    const idx = lines.findIndex(l => l === '甲方' || l.startsWith('甲方 '))
    if (idx >= 0) {
      const candidate = lines[idx].replace(/^甲方\s*/, '').replace(/\s*乙方.*/, '').trim()
      companyName = candidate || lines[idx + 1] || ''
    }
  }
  // Further fallback: use project name
  if (!companyName) companyName = projectName

  // ── 聯絡人（找甲方的聯絡人，非 Morning/王晨安）────────
  const contactMatches = [...norm.matchAll(/聯絡人[：:]\s*([^\n\r,，]+)/g)]
  let contactPerson = ''
  let title = ''
  for (const m of contactMatches) {
    const raw = clean(m[1])
    if (raw.includes('Morning') || raw.includes('王晨安')) continue
    const parts = raw.split(/\s+/)
    contactPerson = parts[0] || ''
    title = parts.slice(1).join(' ')
    break
  }

  // ── Email（甲方的，跳過 wcmep） ───────────────────────
  const emailMatches = norm.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []
  const clientEmail = emailMatches.find(e => !e.includes('wcmep') && !e.includes('morning')) || ''

  // ── 電話（甲方的，跳過 0923-675-349） ────────────────
  const phonePattern = /0\d{1,3}[-\s]?\d{3,4}[-\s]?\d{3,4}/g
  const phoneMatches = norm.match(phonePattern) || []
  const clientPhone = phoneMatches.find(p => !p.includes('0923') && !p.includes('675')) || phoneMatches[0] || ''

  // ── 統一編號 ─────────────────────────────────────────
  // Could be on sign page at bottom: "統一編號：XXXXXXXX" of 甲方
  const taxMatches = [...norm.matchAll(/統一編號[：:]\s*(\d{8})/g)]
  // First match is usually 甲方, second is 乙方 (90007193)
  const taxId = taxMatches.find(m => m[1] !== '90007193')?.[1] || taxMatches[0]?.[1] || ''

  // ── 地址（甲方的，跳過 台中市西屯區） ────────────────
  const addressMatches = [...norm.matchAll(/地址[：:]\s*([^\n\r]+)/g)]
  const address = clean(
    addressMatches.find(m => !m[1].includes('台中市西屯') && !m[1].includes('長安路'))?.[1]
    || addressMatches[0]?.[1] || ''
  )

  // ── 金額 ─────────────────────────────────────────────
  // Total (含稅)
  const totalMatch = norm.match(/(?:NT\$[\d,]+)\(含稅\)/)
    || norm.match(/總計[^(（\n]*?(NT\$[\d,]+)/)
  const total = extractMoney(totalMatch?.[0] || '') || 0

  // Tax amount
  const taxAmtMatch = norm.match(/稅金[^(（\n]*?(NT\$[\d,]+)/)
  const taxAmount = extractMoney(taxAmtMatch?.[0] || '') || 0

  // Subtotal
  const subtotalMatch = norm.match(/整體(?:設計)?費用[^\n]*(NT\$[\d,]+)/)
  const subtotal = extractMoney(subtotalMatch?.[1] || '') || Math.round(total / 1.05)

  // Discount
  let discountLabel = ''
  let discountAmount = 0
  const discountMatch = norm.match(/(BNI優惠價|協會合作價|特別優惠價|合作優惠|優惠價)[^(（\n]*(NT\$[\d,]+)/)
  if (discountMatch) {
    discountLabel = discountMatch[1]
    const discountedAmt = extractMoney(discountMatch[2]) || 0
    discountAmount = subtotal - discountedAmt > 0 ? subtotal - discountedAmt : 0
  }

  // ── clientCode ───────────────────────────────────────
  const clientCode = guessClientCode(companyName, quoteNumber)

  // ── 服務項目（用區塊切割法，抓每個項目到下一個項目之間的說明文字）────
  // All known item triggers with their category
  const ITEM_TRIGGERS: { keyword: string; category: 'standard' | 'optional' | 'bonus' }[] = [
    // Standard
    { keyword: '網站核心架設', category: 'standard' },
    { keyword: '首頁視覺設計', category: 'standard' },
    { keyword: '首頁客製化', category: 'standard' },
    { keyword: '內頁視覺設計', category: 'standard' },
    { keyword: '內頁客製化', category: 'standard' },
    { keyword: '內頁基本模板', category: 'standard' },
    { keyword: '聯絡我們', category: 'standard' },
    { keyword: '聯絡表單', category: 'standard' },
    { keyword: '全站SEO優化', category: 'standard' },
    { keyword: 'SEO優化系統', category: 'standard' },
    { keyword: '頁面修訂版本紀錄', category: 'standard' },
    { keyword: 'RWD支援', category: 'standard' },
    { keyword: 'RWD 支援', category: 'standard' },
    { keyword: '網站分析與追蹤', category: 'standard' },
    { keyword: '資料上稿服務', category: 'standard' },
    { keyword: '資料上稿', category: 'standard' },
    // Optional
    { keyword: '虛擬主機', category: 'optional' },
    { keyword: '主機維護', category: 'optional' },
    { keyword: '購物車系統', category: 'optional' },
    { keyword: '商品管理系統', category: 'optional' },
    { keyword: '商品上架設定', category: 'optional' },
    { keyword: '商品庫存', category: 'optional' },
    { keyword: '商品銷售報表', category: 'optional' },
    { keyword: '訂單查詢', category: 'optional' },
    { keyword: '訂單流程', category: 'optional' },
    { keyword: '優惠劵', category: 'optional' },
    { keyword: '線上金流', category: 'optional' },
    { keyword: '基本會員系統', category: 'optional' },
    { keyword: '課程學院系統', category: 'optional' },
    { keyword: '課程活動報名', category: 'optional' },
    { keyword: '電子報功能', category: 'optional' },
    { keyword: '網站SEO操作', category: 'optional' },
    { keyword: 'SEO操作服務', category: 'optional' },
    { keyword: '調理食品拍攝', category: 'optional' },
    { keyword: '商品拍攝', category: 'optional' },
    { keyword: '電商平台', category: 'optional' },
    { keyword: '單頁式', category: 'optional' },
    { keyword: '運費設定', category: 'optional' },
    // Bonus
    { keyword: 'DoBBiz', category: 'bonus' },
    { keyword: 'DobBiz', category: 'bonus' },
  ]

  // Find positions of each item trigger in the text
  type ItemMatch = { pos: number; trigger: typeof ITEM_TRIGGERS[0] }
  const itemMatches: ItemMatch[] = []
  const seenPos = new Set<number>()

  for (const trigger of ITEM_TRIGGERS) {
    let searchFrom = 0
    while (true) {
      const pos = norm.indexOf(trigger.keyword, searchFrom)
      if (pos === -1) break
      if (!seenPos.has(pos)) {
        seenPos.add(pos)
        itemMatches.push({ pos, trigger })
      }
      searchFrom = pos + 1
    }
  }
  itemMatches.sort((a, b) => a.pos - b.pos)

  // Deduplicate: remove matches that are too close to the previous (within 5 chars)
  const deduped: ItemMatch[] = []
  for (const m of itemMatches) {
    const last = deduped[deduped.length - 1]
    if (!last || m.pos - last.pos > 5) deduped.push(m)
  }

  type ItemRow = { name: string; description: string; notes?: string[]; price: number | null }
  const standardItems: ItemRow[] = []
  const optionalItems: ItemRow[] = []
  const bonusItems: ItemRow[] = []
  const seenNames = new Set<string>()

  // Noise patterns to strip from description blocks
  const NOISE = /第\s*\d+\s*頁|報價單號|客戶端訂購|奇策整合|WCMEP|Morning|一個奇妙|費用總覽|整體設計費用|備註項目|合約條款|立合約人/

  for (let i = 0; i < deduped.length; i++) {
    const { pos, trigger } = deduped[i]
    const nextPos = deduped[i + 1]?.pos ?? norm.length
    const block = norm.slice(pos, nextPos)

    // Extract item name: first 1-3 short lines of the block (the narrow left column)
    const blockLines = block.split('\n').map(l => l.trim()).filter(Boolean)
    const nameLines: string[] = []
    for (const l of blockLines.slice(0, 4)) {
      if (l.length > 25) break
      if (/NT\$|依據|提供|安裝|協助|管理者|可於/.test(l)) break
      nameLines.push(l)
    }
    const rawName = nameLines.join(' ').trim()
    if (!rawName || seenNames.has(rawName)) continue
    seenNames.add(rawName)

    // Extract price from the block
    const priceInBlock = extractMoney(block)

    // Extract description: lines after the name, excluding noise and prices
    const afterName = blockLines.slice(nameLines.length)
    const descLines: string[] = []
    const noteLines: string[] = []

    for (const l of afterName) {
      if (NOISE.test(l)) continue
      if (l.match(/^NT\$/) || l.match(/^\d+頁$/)) continue
      if (l.startsWith('l ') || l.startsWith('• ') || l.startsWith('・') || l.match(/^\d+\.\s/)) {
        noteLines.push(l.replace(/^[l•・]\s*/, '').replace(/^\d+\.\s*/, '').trim())
      } else if (l.length > 3 && !l.match(/^NT\$/)) {
        descLines.push(l)
      }
    }

    const description = descLines.join(' ').trim()
    const notes = noteLines.filter(n => n.length > 1)

    // Try to get canonical name from templates (keep custom detail if longer)
    const tpl = SERVICE_ITEM_TEMPLATES.find(t =>
      rawName.includes(t.name.slice(0, 6)) || t.name.includes(rawName.slice(0, 6))
    )
    const finalName = tpl?.name || rawName

    const item: ItemRow = { name: finalName, description, notes, price: priceInBlock }
    if (trigger.category === 'bonus') bonusItems.push(item)
    else if (trigger.category === 'optional') optionalItems.push(item)
    else standardItems.push(item)
  }

  return {
    client: { companyName, clientCode, contactPerson, title, email: clientEmail, phone: clientPhone, address, taxId },
    quote: { quoteNumber, projectName, serviceType, versionLabel, discountLabel, discountAmount, subtotal, taxAmount, total, notes: '' },
    standardItems,
    optionalItems,
    bonusItems,
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('pdf') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> = require('pdf-parse')
    const pdfData = await pdfParse(buffer)
    const text = pdfData.text

    if (!text.trim()) {
      return NextResponse.json({ error: 'PDF 無法讀取文字內容（可能是掃描圖片格式）' }, { status: 400 })
    }

    const data = parseQuotePDF(text)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('PDF parse error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF 解析失敗' },
      { status: 500 }
    )
  }
}
