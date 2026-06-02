'use client'
import { useParams } from 'next/navigation'
import QuoteBuilder from '@/components/quotes/QuoteBuilder'

export default function EditQuotePage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">編輯報價單</h1>
      <QuoteBuilder mode="edit" quoteId={id} />
    </div>
  )
}
