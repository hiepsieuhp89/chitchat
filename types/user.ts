import type { Timestamp } from "firebase/firestore"

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  createdAt: Timestamp
  lastSeen: Timestamp
  status: "online" | "offline"
}
