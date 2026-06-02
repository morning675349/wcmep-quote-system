import { NextRequest, NextResponse } from 'next/server'
import { generateQuoteHTML } from '@/lib/pdfTemplate'
import { Quote, Client } from '@/types'

export const maxDuration = 60

interface BrowserPage {
  setContent: (h: string, o: unknown) => Promise<void>
  addStyleTag: (o: unknown) => Promise<unknown>
  pdf: (o: unknown) => Promise<Buffer>
}
interface BrowserInstance {
  newPage: () => Promise<BrowserPage>
  close: () => Promise<void>
}

// Launch the correct browser depending on environment:
// - Vercel / serverless: puppeteer-core + @sparticuz/chromium (lightweight)
// - Local dev: full puppeteer (bundled Chromium)
async function launchBrowser(): Promise<BrowserInstance> {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

  if (isServerless) {
    const chromiumMod = await import('@sparticuz/chromium')
    const chromium = (chromiumMod.default || chromiumMod) as unknown as {
      args: string[]
      executablePath: () => Promise<string>
    }
    const puppeteer = await import('puppeteer-core')
    return (await puppeteer.default.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })) as unknown as BrowserInstance
  }

  const puppeteer = await import('puppeteer')
  return (await (puppeteer as unknown as {
    default: { launch: (o: unknown) => Promise<BrowserInstance> }
  }).default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  }))
}

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

    const browser = await launchBrowser()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

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

    return new NextResponse(new Uint8Array(pdf), {
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
