// This file is used to declare types that extend existing types in the application
import type { Attachment as BaseAttachment } from "./message"

// Extend the Attachment type to include 'video'
declare module "./message" {
  interface Attachment extends BaseAttachment {
    type: "image" | "audio" | "file" | "sticker" | "video"
  }
} 