import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'

export async function uploadQuotePDF(quoteId: string, file: File): Promise<string> {
  const path = `quotes/${quoteId}/original_${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return url
}

// 上傳合約檔案（外部建立的合約 PDF），回傳下載網址與儲存路徑
export async function uploadContractFile(
  quoteId: string,
  file: File,
): Promise<{ url: string; path: string }> {
  const path = `quotes/${quoteId}/contracts/${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { url, path }
}

export async function deleteContractFile(path: string): Promise<void> {
  await deleteObject(ref(storage, path))
}
