import QuoteBuilder from '@/components/quotes/QuoteBuilder'

export default function NewQuotePage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">開立報價單</h1>
      <QuoteBuilder mode="create" />
    </div>
  )
}
