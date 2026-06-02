import { NextRequest, NextResponse } from 'next/server'
import { generateQuoteHTML } from '@/lib/pdfTemplate'
import { Quote, Client } from '@/types'

// Client sends quote + client data in request body to avoid server-side Firestore auth issues
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json() as { quote: Quote; client: Client }
    const { quote, client } = body

    if (!quote || !client) {
      return NextResponse.json({ error: 'Missing quote or client data' }, { status: 400 })
    }

    const html = generateQuoteHTML(quote, client)

    // Use local Chromium (puppeteer) for PDF generation
    const puppeteer = await import('puppeteer')
    const browser = await (puppeteer as unknown as { default: { launch: (o: unknown) => Promise<{ newPage: () => Promise<{ setContent: (h: string, o: unknown) => Promise<void>; pdf: (o: unknown) => Promise<Buffer>; close?: () => void }>; close: () => Promise<void> }> } }).default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    // Remove trailing blank page: evaluate actual content height and clip
    await page.addStyleTag({ content: `
      html, body { height: auto !important; overflow: visible !important; }
      @page { margin: 0; size: A4; }
    `})

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      preferCSSPageSize: true,
    })
    await browser.close()

    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quoteNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 }
    )
  }
}
