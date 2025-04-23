import type { Timestamp } from "firebase/firestore"

export interface Chat {
  id: string
  participants: string[]
  participantsInfo: {
    [key: string]: {
      displayName: string
      photoURL: string
    }
  }
  lastMessage?: {
    text: string
    sender: string
    timestamp: Timestamp
    read: boolean
  }
  createdAt: Timestamp
  updatedAt: Timestamp
}
