"use client"

import { useState } from "react"
import type { Message, Attachment } from "@/types/message"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, Edit, Trash, RotateCcw, Check, File, Play, Pause } from "lucide-react"
import { format } from "date-fns"
import { motion } from "framer-motion"
import InChatTicTacToe from "@/components/tictactoe/in-chat-tictactoe"

interface MessageItemProps {
  message: Message
  isOwnMessage: boolean
  onDelete: () => void
  onRecall: () => void
  onEdit: () => void
  participantsInfo: {
    [key: string]: {
      displayName: string
      photoURL: string
    }
  }
  isAdmin: boolean
}

export default function MessageItem({
  message,
  isOwnMessage,
  onDelete,
  onRecall,
  onEdit,
  participantsInfo,
  isAdmin,
}: MessageItemProps) {
  const [isPlaying, setIsPlaying] = useState<{ [key: string]: boolean }>({})
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const renderAttachments = () => {
    if (!message.attachments || message.attachments.length === 0) return null

    // Group attachments by type
    const images = message.attachments.filter((att) => att.type === "image")
    const videos = message.attachments.filter((att) => att.type === "video")
    const others = message.attachments.filter((att) => att.type !== "image" && att.type !== "video")

    return (
      <>
        {/* Render images in a grid (max 2 columns) */}
        {images.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {images.map((attachment, index) => (
              <motion.div
                key={`img-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg overflow-hidden shadow-md bg-white dark:bg-gray-800"
                onClick={() => setExpandedImage(attachment.url)}
              >
                <img
                  src={attachment.url || "/placeholder.svg"}
                  alt={attachment.name}
                  className="w-full h-full object-contain aspect-square cursor-pointer"
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Render videos */}
        {videos.length > 0 && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {videos.map((attachment, index) => (
              <motion.div
                key={`video-${index}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="rounded-lg overflow-hidden shadow-md bg-black"
              >
                <video
                  src={attachment.url}
                  controls
                  className="w-full h-full object-contain aspect-video"
                  poster="/placeholder.svg?height=200&width=300"
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Render other attachments */}
        {others.map((attachment, index) => renderAttachment(attachment, index))}

        {/* Expanded image view */}
        {expandedImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
            onClick={() => setExpandedImage(null)}
          >
            <div className="max-w-4xl max-h-screen p-4">
              <img
                src={expandedImage || "/placeholder.svg"}
                alt="Expanded view"
                className="max-w-full max-h-[90vh] object-contain"
              />
            </div>
          </div>
        )}
      </>
    )
  }

  const renderAttachment = (attachment: Attachment, index: number) => {
    if (attachment.type === "image" || attachment.type === "video") return null // Handled separately

    switch (attachment.type) {
      case "audio":
        const audioId = `audio-${message.id}-${index}`
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm"
          >
            <button
              onClick={() => {
                if (!audioElements[audioId]) {
                  const audio = new Audio(attachment.url)
                  audio.addEventListener("ended", () => {
                    setIsPlaying((prev) => ({ ...prev, [audioId]: false }))
                  })
                  setAudioElements((prev) => ({ ...prev, [audioId]: audio }))
                }

                if (isPlaying[audioId]) {
                  audioElements[audioId]?.pause()
                  setIsPlaying((prev) => ({ ...prev, [audioId]: false }))
                } else {
                  audioElements[audioId]?.play()
                  setIsPlaying((prev) => ({ ...prev, [audioId]: true }))
                }
              }}
              className="w-8 h-8 flex items-center justify-center bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors"
            >
              {isPlaying[audioId] ? (
                <Pause className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Play className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              )}
            </button>
            <div className="flex-1">
              <div className="text-xs font-medium truncate">{attachment.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {attachment.duration
                  ? `${Math.floor(attachment.duration / 60)}:${Math.floor(attachment.duration % 60)
                      .toString()
                      .padStart(2, "0")}`
                  : "Audio"}
              </div>
            </div>
          </motion.div>
        )
      default:
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-2 flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm"
          >
            <File className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
            <div>
              <div className="text-xs font-medium truncate">{attachment.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : "File"}
              </div>
            </div>
          </motion.div>
        )
    }
  }

  const renderMessageContent = () => {
    if (message.status === "deleted") {
      return (
        <p className={`italic ${isOwnMessage ? "text-white dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
          This message was deleted
        </p>
      )
    }

    if (message.status === "recalled") {
      return (
        <p className={`italic ${isOwnMessage ? "text-white dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
          This message was recalled
        </p>
      )
    }

    return (
      <>
        {message.richText ? (
          <div
            className={isOwnMessage ? "text-white dark:text-white" : "text-gray-800 dark:text-gray-100"}
            dangerouslySetInnerHTML={{ __html: message.richText }}
          />
        ) : (
          <p className={isOwnMessage ? "text-white dark:text-white" : "text-gray-800 dark:text-gray-100"}>
            {message.text}
          </p>
        )}

        {/* Render TicTacToe game if this message has a game ID */}
        {message.tictactoeGameId && (
          <div className="mt-2">
            <InChatTicTacToe 
              gameId={message.tictactoeGameId} 
              isOwnMessage={isOwnMessage}
            />
          </div>
        )}

        {renderAttachments()}

        {/* Only show "edited" tag if the user is an admin */}
        {message.edited && isAdmin && (
          <span
            className={`text-xs ml-1 ${isOwnMessage ? "text-white/70 dark:text-white/70" : "text-gray-500 dark:text-gray-400"}`}
          >
            (edited)
          </span>
        )}
      </>
    )
  }

  const senderInfo = participantsInfo[message.sender]

  return (
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}>
      <div className={`flex gap-2 max-w-[70%] ${isOwnMessage ? "flex-row-reverse" : ""}`}>
        <Avatar className={`h-8 w-8 ${isOwnMessage ? "border-2 border-indigo-200 dark:border-indigo-900" : ""}`}>
          <AvatarImage src={senderInfo?.photoURL || "/placeholder.svg"} />
          <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
            {getInitials(senderInfo?.displayName || "User")}
          </AvatarFallback>
        </Avatar>

        <div>
          <div className={`flex items-center gap-1 ${isOwnMessage ? "justify-end" : ""}`}>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {message.timestamp && format(message.timestamp.toDate(), "h:mm a")}
            </span>

            {isOwnMessage && message.status !== "deleted" && message.status !== "recalled" && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <MoreVertical className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                >
                  {/* Only show edit option for admin users */}
                  {isAdmin && (
                    <DropdownMenuItem
                      onClick={onEdit}
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800"
                    >
                      <Edit className="h-4 w-4 mr-2 text-indigo-500 dark:text-indigo-400" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800"
                  >
                    <Trash className="h-4 w-4 mr-2 text-red-500" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onRecall}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 focus:bg-gray-100 dark:focus:bg-gray-800"
                  >
                    <RotateCcw className="h-4 w-4 mr-2 text-orange-500" />
                    <span>Recall</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`p-3 rounded-lg shadow-sm ${
              isOwnMessage
                ? "bg-indigo-500 dark:bg-indigo-600"
                : "bg-white border dark:bg-gray-800 dark:border-gray-700"
            }`}
          >
            {renderMessageContent()}
          </motion.div>

          {isOwnMessage && message.readBy && message.readBy.length > 1 && (
            <div className="flex justify-end mt-1">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center text-xs text-indigo-500 dark:text-indigo-400"
              >
                <Check className="h-3 w-3 mr-1" />
                Read
              </motion.span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
