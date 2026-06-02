import { initializeApp, getApps } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore, getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const isNew = getApps().length === 0
const app = isNew ? initializeApp(firebaseConfig) : getApps()[0]

export const auth = getAuth(app)
// ignoreUndefinedProperties lets us save objects with optional/undefined fields
// (e.g. custom quote items without notes) without Firestore throwing.
export const db = isNew
  ? initializeFirestore(app, { ignoreUndefinedProperties: true })
  : getFirestore(app)
export const storage = getStorage(app)
export default app
