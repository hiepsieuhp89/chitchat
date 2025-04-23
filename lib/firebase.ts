import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyDgz0nvyfkWozvAXxdsMR2toPJzJtLDWik",
  authDomain: "chit-chat-474aa.firebaseapp.com",
  projectId: "chit-chat-474aa",
  storageBucket: "chit-chat-474aa.firebasestorage.app",
  messagingSenderId: "129645706932",
  appId: "1:129645706932:web:66c60014dd09b2821c21e1",
  measurementId: "G-W6QT2HBJWV"
}

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export { app, auth, db, storage }
