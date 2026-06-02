import ClientForm from '@/components/clients/ClientForm'

export default function NewClientPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">新增客戶</h1>
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <ClientForm />
      </div>
    </div>
  )
}
