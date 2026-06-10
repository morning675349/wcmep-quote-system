import { Quote, Client } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { LOGO_BASE64 } from './logoBase64'
import { PARTY_B } from '@/data/contractTerms'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatItemDescription(item: { description?: string; notes?: string[] }): string {
  const parts: string[] = []
  if (item.description) {
    const lines = item.description.split('\n').filter(Boolean)
    lines.forEach(line => {
      if (line.startsWith('・')) {
        parts.push(`<li>${escapeHtml(line.slice(1).trim())}</li>`)
      } else {
        parts.push(`<p class="desc-text">${escapeHtml(line)}</p>`)
      }
    })
  }
  if (item.notes && item.notes.length > 0) {
    item.notes.forEach(n => parts.push(`<li>${escapeHtml(n)}</li>`))
  }
  if (parts.some(p => p.startsWith('<li'))) {
    return parts
      .map(p => p.startsWith('<li') ? p : p)
      .join('')
      .replace(/(<li>.*?<\/li>)/gs, (match) => match)
  }
  return parts.join('')
}

export function generateQuoteHTML(quote: Quote, client: Client): string {
  const today = format(new Date(), 'yyyy年MM月dd日')
  const allStdPrice = quote.standardItems.reduce((s, i) => s + (i.price ?? 0), 0)
  const isContract = quote.documentType === 'contract'
  const docLabel = isContract ? '合約編號' : '報價單號'

  const renderItemRows = (items: typeof quote.standardItems, showGroup = false) => {
    let html = ''
    let lastGroup = ''
    for (const item of items) {
      if (showGroup && item.group && item.group !== lastGroup) {
        lastGroup = item.group
      }
      const descHtml = formatItemDescription(item)
      const hasListItems = descHtml.includes('<li>')
      html += `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-desc">
            ${item.description ? `<p class="desc-text">${escapeHtml(item.description.split('\n')[0])}</p>` : ''}
            ${hasListItems ? `<ul class="notes-list">${descHtml.match(/<li>.*?<\/li>/gs)?.join('') || ''}</ul>` : ''}
          </td>
          <td class="item-price">${item.price ? formatCurrency(item.price) : ''}</td>
        </tr>`
    }
    return html
  }

  const renderBonusRows = (items: typeof quote.bonusItems) => {
    return items.map(item => {
      const descHtml = formatItemDescription(item)
      return `
        <tr>
          <td class="item-name bonus-name">${escapeHtml(item.name)}</td>
          <td class="item-desc">
            ${item.description ? `<p class="desc-text">${escapeHtml(item.description)}</p>` : ''}
            ${descHtml.includes('<li>') ? `<ul class="notes-list">${descHtml.match(/<li>.*?<\/li>/gs)?.join('') || ''}</ul>` : ''}
          </td>
          <td class="item-price bonus-value">${item.price ? `價值\n${formatCurrency(item.price)}` : ''}</td>
        </tr>`
    }).join('')
  }

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${quote.quoteNumber}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: auto; }
  body { font-family: 'Noto Sans TC', 'Microsoft JhengHei', '微軟正黑體', Arial, sans-serif; font-size: 14px; color: #1a1a1a; background: white; line-height: 1.6; }
  .page { width: 210mm; padding: 16mm 15mm; margin: 0 auto; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 6px; }
  .logo-area { display: flex; flex-direction: column; }
  .logo-main { font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #1a1a1a; }
  .logo-sub { font-size: 10px; letter-spacing: 3px; color: #888; margin-top: 2px; }
  .tagline { font-size: 13px; color: #888; letter-spacing: 1px; }
  .footer-line { font-size: 11px; color: #888; text-align: right; margin-bottom: 18px; }

  /* Project title */
  .project-title { text-align: center; margin: 18px 0 10px; }
  .project-title h1 { font-size: 20px; font-weight: 900; }
  .project-title h2 { font-size: 16px; font-weight: 700; margin-top: 5px; }

  /* Party table */
  .party-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; border: 1px solid #333; }
  .party-table td { padding: 8px 12px; border: 1px solid #333; font-size: 13px; vertical-align: top; }
  .party-table .party-header { font-weight: 700; font-size: 14px; background: #f5f5f5; }
  .party-name-bold { font-weight: 700; }

  /* Section heading */
  .section-heading { font-size: 16px; font-weight: 700; margin: 18px 0 8px; }

  /* Items table */
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  .items-table th { background: #C9A84C; color: white; padding: 9px 12px; text-align: left; font-size: 14px; font-weight: 600; border: 1px solid #b8973f; }
  .items-table th.price-col { text-align: center; width: 110px; }
  .items-table td { padding: 10px 12px; border: 1px solid #ddd; vertical-align: top; font-size: 13px; }
  .items-table tr:nth-child(even) td { background: #fafafa; }
  .item-name { font-weight: 700; font-size: 14px; width: 140px; color: #C9A84C; vertical-align: top; }
  .item-desc { font-size: 12.5px; color: #333; line-height: 1.7; }
  .item-price { text-align: center; font-weight: 600; width: 110px; vertical-align: middle; white-space: nowrap; font-size: 13px; }
  .desc-text { margin-bottom: 4px; }
  .notes-list { padding-left: 18px; margin-top: 4px; }
  .notes-list li { margin-bottom: 3px; font-size: 12px; color: #555; line-height: 1.6; }
  .bonus-name { color: #C9A84C; }
  .bonus-value { font-size: 12px; color: #C9A84C; text-align: center; white-space: pre-line; }

  /* Summary table */
  .summary-section { margin-top: 18px; }
  .summary-title { background: #C9A84C; color: white; text-align: center; padding: 8px; font-weight: 700; font-size: 16px; }
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table td, .summary-table th { border: 1px solid #ddd; padding: 7px 12px; font-size: 13px; }
  .summary-head th { background: #f5f5f5; color: #555; font-weight: 600; text-align: center; }
  .summary-label { width: 45%; color: #555; }
  .summary-value { width: 35%; text-align: right; font-weight: 600; }
  .summary-note { width: 20%; color: #888; font-size: 12px; }
  .summary-total-cell { text-align: right; }
  .total-row td { font-size: 15px; font-weight: 700; }
  .discount-row td { color: #cc3333; }
  .total-amount { color: #C9A84C; font-size: 18px; font-weight: 900; }
  .strikethrough { text-decoration: line-through; color: #888; }

  /* Bonus section */
  .bonus-section { margin-top: 18px; }
  .bonus-title { font-size: 18px; font-weight: 900; color: #C9A84C; text-align: center; margin-bottom: 10px; }

  /* Notes */
  .notes-section { margin-top: 18px; }
  .notes-title { font-weight: 700; font-size: 14px; margin-bottom: 8px; }
  .notes-list-main li { font-size: 13px; margin-bottom: 5px; color: #333; line-height: 1.6; }
  .notes-list-main li strong { color: #1a1a1a; }

  /* Contract sections */
  .contract-section { margin-top: 20px; }
  .contract-heading { font-size: 15px; font-weight: 700; text-align: center; margin: 16px 0 10px; }
  .contract-terms { padding-left: 20px; }
  .contract-terms li { font-size: 11.5px; line-height: 1.7; margin-bottom: 6px; color: #222; text-align: justify; }
  .pay-block { margin-top: 14px; border: 1px solid #e5e5e5; border-radius: 4px; padding: 12px 14px; background: #fafafa; }
  .pay-intro { font-size: 12px; font-weight: 700; color: #b8860b; margin-bottom: 8px; }
  .pay-row { display: flex; gap: 10px; margin-bottom: 8px; font-size: 11.5px; }
  .pay-label { font-weight: 700; flex-shrink: 0; width: 70px; }
  .pay-detail { flex: 1; line-height: 1.6; }
  .pay-detail strong { color: #1a1a1a; }
  /* Signature block */
  .sign-section { margin-top: 22px; }
  .sign-table { width: 100%; border-collapse: collapse; border: 1.5px solid #1a1a1a; }
  .sign-cell { width: 50%; border: 1px solid #1a1a1a; padding: 12px 14px; vertical-align: top; }
  .sign-row { font-size: 12px; margin-bottom: 7px; line-height: 1.5; }
  .sign-key { font-weight: 700; }
  .sign-date { text-align: center; font-weight: 700; font-size: 13px; margin-top: 12px; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 14mm 15mm; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <img src="${LOGO_BASE64}" alt="奇策整合行銷" style="height:48px; width:auto; object-fit:contain;" />
    </div>
    <div class="tagline">一個奇妙策略，一條正確道路</div>
  </div>
  <div class="footer-line">
    ${docLabel}：${escapeHtml(quote.quoteNumber)} &nbsp;&nbsp; 日期：${today}
  </div>

  <!-- Project title -->
  <div class="project-title">
    <h1>專案名稱：${escapeHtml(client.companyName)}</h1>
    <h2>【${escapeHtml(quote.projectName)}】</h2>
  </div>

  <!-- Party info -->
  <table class="party-table">
    <tr>
      <td class="party-header" style="width:50%">甲方&nbsp;&nbsp;${escapeHtml(client.companyName)}</td>
      <td class="party-header" style="width:50%">乙方&nbsp;&nbsp;奇策整合行銷有限公司</td>
    </tr>
    <tr>
      <td>
        <div class="party-name-bold">聯絡人：${escapeHtml(client.contactPerson)} ${escapeHtml(client.title || '')}</div>
        <div>Email：${escapeHtml(client.email)}</div>
        <div>電話：${escapeHtml(client.phone)}</div>
      </td>
      <td>
        <div class="party-name-bold">聯絡人：王晨安 Morning</div>
        <div>Email：morning@wcmep.com.tw</div>
        <div>電話：0923-675-349</div>
      </td>
    </tr>
  </table>

  <!-- Standard + Optional items -->
  ${(quote.standardItems.length > 0 || quote.optionalItems.length > 0) ? `
  <div class="section-heading">一、${escapeHtml(quote.serviceType)}</div>
  <table class="items-table">
    <thead>
      <tr>
        <th style="width:130px">項目</th>
        <th>說明</th>
        <th class="price-col">金額（未稅）</th>
      </tr>
    </thead>
    <tbody>
      ${renderItemRows([...quote.standardItems, ...quote.optionalItems])}
    </tbody>
  </table>` : ''}

  <!-- Summary -->
  <div class="summary-section">
    <div class="summary-title">費用 總覽表</div>
    <table class="summary-table">
      <thead>
        <tr class="summary-head">
          <th class="summary-label">功能項目</th>
          <th class="summary-value">單價（新臺幣未稅）</th>
          <th class="summary-note">備註</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="summary-label">網站設計服務</td>
          <td class="summary-value">${formatCurrency(allStdPrice)}</td>
          <td class="summary-note"></td>
        </tr>
        ${quote.optionalItems.filter(i => i.price).map(i => `
        <tr>
          <td class="summary-label">${escapeHtml(i.name)}</td>
          <td class="summary-value">${formatCurrency(i.price)}</td>
          <td class="summary-note">${escapeHtml(i.remark || '')}</td>
        </tr>`).join('')}
        <tr>
          <td class="summary-total-cell" colspan="3" style="text-align:right">
            整體費用 <span class="${quote.discountAmount > 0 ? 'strikethrough' : ''}">${formatCurrency(quote.subtotal)}（未稅）</span>
          </td>
        </tr>
        ${quote.discountAmount > 0 ? `
        <tr class="discount-row">
          <td class="summary-total-cell" colspan="3" style="text-align:right">
            ${escapeHtml(quote.discountLabel || '優惠折扣')} ${formatCurrency(quote.subtotal - quote.discountAmount)}（未稅）
          </td>
        </tr>` : ''}
        <tr>
          <td class="summary-total-cell" colspan="3" style="text-align:right">稅金 5% ${formatCurrency(quote.taxAmount)}</td>
        </tr>
        <tr class="total-row">
          <td class="summary-total-cell" colspan="3" style="text-align:right">
            總計 <span class="total-amount">${formatCurrency(quote.total)}（含稅）</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Bonus items -->
  ${quote.bonusItems.length > 0 ? `
  <div class="bonus-section">
    <div class="bonus-title">額外贈送項目</div>
    <table class="items-table">
      <thead>
        <tr>
          <th style="width:130px">項目</th>
          <th>說明</th>
          <th class="price-col">金額</th>
        </tr>
      </thead>
      <tbody>
        ${renderBonusRows(quote.bonusItems)}
      </tbody>
    </table>
  </div>` : ''}

  ${isContract ? renderContractFooter(quote, client) : renderQuoteFooter(quote)}
</div>
</body>
</html>`
}

// ── 報價單尾段：備註 + 簡易簽章 ──
function renderQuoteFooter(quote: Quote): string {
  return `
  <div class="notes-section">
    <div class="notes-title">備註項目：</div>
    <ul class="notes-list-main" style="padding-left:16px; list-style:disc;">
      <li>本報價單經雙方簽章用印即正式生效。</li>
      <li>本公司保留專案承接與否之最終權利。</li>
      <li>本報價單有效期限為報價日期起算一個月。</li>
      ${quote.notes ? `<li>${escapeHtml(quote.notes)}</li>` : ''}
    </ul>
  </div>
  <div style="margin-top: 24px; border-top: 1px solid #ddd; padding-top: 8px; font-size: 11px; color: #888; display: flex; justify-content: space-between;">
    <div>客戶端訂購確認簽章：_______________</div>
    <div>奇策整合行銷 王晨安 Morning</div>
  </div>`
}

// ── 合約尾段：合約條款 + 付款期數 + 立合約人 ──
function renderContractFooter(quote: Quote, client: Client): string {
  const start = quote.contractStartDate || '＿＿＿'
  const end = quote.contractEndDate || '＿＿＿'
  const terms = (quote.contractTerms || []).map(t =>
    t.replace(/\{\{START\}\}/g, start).replace(/\{\{END\}\}/g, end)
  )
  const installments = quote.installments || []
  const pctText = installments.map(i => `${i.percentage}%`).join('、')

  const termsHtml = terms.map(t => `<li>${escapeHtml(t)}</li>`).join('')

  const installmentsHtml = installments.length > 0 ? `
    <div class="pay-block">
      <div class="pay-intro">※甲方在此同意依下列條件總金額分 ${installments.length} 期支付費用共 ${formatCurrency(quote.total)}${pctText ? `，期間比例為 ${pctText}` : ''}。</div>
      ${installments.map((inst, i) => `
        <div class="pay-row">
          <span class="pay-label">第${['一','二','三','四','五','六','七','八','九','十'][i] || (i + 1)}期款項</span>
          <div class="pay-detail">
            <div>新臺幣含稅：<strong>${formatCurrency(inst.amount)}</strong>（占 ${inst.percentage}%）</div>
            <div>${escapeHtml(inst.timing)}</div>
          </div>
        </div>`).join('')}
    </div>` : ''

  return `
  <div class="contract-section">
    <div class="contract-heading">合約條款事項</div>
    <ol class="contract-terms">
      ${termsHtml}
    </ol>
    ${installmentsHtml}
  </div>

  <!-- 立合約人 -->
  <div class="sign-section">
    <table class="sign-table">
      <tr>
        <td class="sign-cell">
          <div class="sign-row"><span class="sign-key">甲方：</span>${escapeHtml(client.companyName)}</div>
          <div class="sign-row"><span class="sign-key">負責人：</span>${escapeHtml(client.representative || '')}</div>
          <div class="sign-row"><span class="sign-key">統一編號：</span>${escapeHtml(client.taxId || '')}</div>
          <div class="sign-row"><span class="sign-key">承辦人：</span>${escapeHtml(client.contactPerson || '')}</div>
          <div class="sign-row"><span class="sign-key">電話：</span>${escapeHtml(client.phone || '')}</div>
          <div class="sign-row"><span class="sign-key">地址：</span>${escapeHtml(client.address || '')}</div>
        </td>
        <td class="sign-cell">
          <div class="sign-row"><span class="sign-key">乙方：</span>${PARTY_B.company}</div>
          <div class="sign-row"><span class="sign-key">負責人：</span>${PARTY_B.representative}</div>
          <div class="sign-row"><span class="sign-key">專案人員：</span>${PARTY_B.projectStaff}</div>
          <div class="sign-row"><span class="sign-key">統一編號：</span>${PARTY_B.taxId}</div>
          <div class="sign-row"><span class="sign-key">電話：</span>${PARTY_B.phone}</div>
          <div class="sign-row"><span class="sign-key">地址：</span>${PARTY_B.address}</div>
        </td>
      </tr>
    </table>
    <div class="sign-date">－立合約人（簽約日期：西元 ${escapeHtml(quote.signDate || '＿＿＿')}）－</div>
  </div>`
}
