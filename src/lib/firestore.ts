import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { Client, Quote, QuoteVersion, AppUser, QuoteStatus, ServiceItemTemplate } from '@/types'

// ---- Helpers ----
const toDate = (v: unknown): string => {
  if (!v) return new Date().toISOString()
  if (v instanceof Timestamp) return v.toDate().toISOString()
  return String(v)
}

// ============================================================
// USERS
// ============================================================
export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppUser))
}

export async function getUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return { uid: snap.id, ...snap.data() } as AppUser
}

export async function createUser(uid: string, data: Omit<AppUser, 'uid'>): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ...data, createdAt: serverTimestamp() })
}

export async function updateUser(uid: string, data: Partial<AppUser>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), data)
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid))
}

// ============================================================
// CLIENTS
// ============================================================
export async function getClients(): Promise<Client[]> {
  const snap = await getDocs(query(collection(db, 'clients'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as Client))
}

export async function getClient(id: string): Promise<Client | null> {
  const snap = await getDoc(doc(db, 'clients', id))
  if (!snap.exists()) return null
  return {
    ...snap.data(),
    id: snap.id,
    createdAt: toDate(snap.data().createdAt),
    updatedAt: toDate(snap.data().updatedAt),
  } as Client
}

export async function createClient(data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'clients'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  await updateDoc(doc(db, 'clients', id), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteClient(id: string): Promise<void> {
  await deleteDoc(doc(db, 'clients', id))
}

// ============================================================
// QUOTES
// ============================================================
export async function getQuotes(): Promise<Quote[]> {
  const snap = await getDocs(query(collection(db, 'quotes'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as Quote))
}

export async function getQuotesByClient(clientId: string): Promise<Quote[]> {
  const snap = await getDocs(
    query(collection(db, 'quotes'), where('clientId', '==', clientId), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({
    ...d.data(),
    id: d.id,
    createdAt: toDate(d.data().createdAt),
    updatedAt: toDate(d.data().updatedAt),
  } as Quote))
}

export async function getQuote(id: string): Promise<Quote | null> {
  const snap = await getDoc(doc(db, 'quotes', id))
  if (!snap.exists()) return null
  const data = snap.data()

  // fetch versions subcollection
  const versSnap = await getDocs(
    query(collection(db, 'quotes', id, 'versions'), orderBy('createdAt', 'desc'))
  )
  const versions: QuoteVersion[] = versSnap.docs.map(v => ({
    ...v.data(),
    id: v.id,
    createdAt: toDate(v.data().createdAt),
  } as QuoteVersion))

  return {
    ...data,
    id: snap.id,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt),
    versions,
  } as Quote
}

export async function createQuote(data: Omit<Quote, 'id' | 'createdAt' | 'updatedAt' | 'versions'>): Promise<string> {
  const ref = await addDoc(collection(db, 'quotes'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateQuote(id: string, data: Partial<Quote>, changelog?: string, updatedBy?: string): Promise<void> {
  // Save version snapshot before updating
  if (changelog) {
    const current = await getDoc(doc(db, 'quotes', id))
    if (current.exists()) {
      await addDoc(collection(db, 'quotes', id, 'versions'), {
        versionNumber: current.data().versionLabel || 'v1',
        snapshot: { ...current.data(), id },
        changelog,
        createdAt: serverTimestamp(),
        createdBy: updatedBy || '',
      })
    }
  }
  await updateDoc(doc(db, 'quotes', id), { ...data, updatedAt: serverTimestamp() })
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  await updateDoc(doc(db, 'quotes', id), { status, updatedAt: serverTimestamp() })
}

export async function deleteQuote(id: string): Promise<void> {
  await deleteDoc(doc(db, 'quotes', id))
}

// ============================================================
// SERVICE ITEMS LIBRARY
// ============================================================
export async function getServiceItems(): Promise<ServiceItemTemplate[]> {
  const snap = await getDocs(collection(db, 'serviceItems'))
  return snap.docs
    .map(d => ({ ...d.data(), id: d.id } as ServiceItemTemplate))
    .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name))
}

export async function createServiceItem(data: Omit<ServiceItemTemplate, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'serviceItems'), data)
  return ref.id
}

export async function updateServiceItem(id: string, data: Partial<ServiceItemTemplate>): Promise<void> {
  await updateDoc(doc(db, 'serviceItems', id), data)
}

export async function deleteServiceItem(id: string): Promise<void> {
  await deleteDoc(doc(db, 'serviceItems', id))
}

export async function seedServiceItemsIfEmpty(): Promise<void> {
  const snap = await getDocs(collection(db, 'serviceItems'))
  if (!snap.empty) return
  const { SERVICE_ITEM_TEMPLATES } = await import('@/data/serviceItems')
  const batch = SERVICE_ITEM_TEMPLATES.map(item => {
    const { id, ...rest } = item
    return addDoc(collection(db, 'serviceItems'), rest)
  })
  await Promise.all(batch)
}

// ============================================================
// STATS
// ============================================================
export async function getDashboardStats() {
  const [clients, quotes] = await Promise.all([getClients(), getQuotes()])
  return {
    totalClients: clients.length,
    totalQuotes: quotes.length,
    draftQuotes: quotes.filter(q => q.status === 'draft').length,
    sentQuotes: quotes.filter(q => q.status === 'sent').length,
    signedQuotes: quotes.filter(q => q.status === 'signed').length,
    closedQuotes: quotes.filter(q => q.status === 'closed').length,
  }
}
