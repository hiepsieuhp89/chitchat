import type { Timestamp } from "firebase/firestore"

export type MessageStatus = "sent" | "delivered" | "read" | "edited" | "deleted" | "recalled"

export interface Attachment {
  url: string
  type: "image" | "video" | "audio" | "file"
  name?: string
  size?: number
  duration?: number // For audio/video
  thumbnailUrl?: string // For images/videos
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
  tictactoeGameId?: string // ID of a tic-tac-toe game associated with this message
}
