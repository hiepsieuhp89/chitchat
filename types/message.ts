import type { Timestamp } from "firebase/firestore"

export type MessageStatus = "sent" | "delivered" | "read" | "edited" | "deleted" | "recalled"

export interface Attachment {
  type: "image" | "audio" | "file" | "sticker"
  url: string
  name: string
  size?: number
  mimeType?: string
  duration?: number // for audio
}

export interface Message {
  id: string
  chatId: string
  text: string
  richText?: string // HTML content for rich text
  sender: string
  timestamp: Timestamp
  status: MessageStatus
  attachments?: Attachment[]
  reactions?: {
    [userId: string]: string // emoji
  }
  readBy: string[]
  edited?: boolean
  editedAt?: Timestamp
}
