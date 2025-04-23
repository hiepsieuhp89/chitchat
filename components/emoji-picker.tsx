"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Search, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

const EMOJI_CATEGORIES = {
  smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇", "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘"],
  gestures: ["👋", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛"],
  animals: ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵", "🙈", "🙉"],
  food: ["🍎", "🍐", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥝", "🍅", "🍆"],
  activities: ["⚽️", "🏀", "🏈", "⚾️", "🥎", "🎾", "🏐", "🏉", "🥏", "🎱", "🏓", "🏸", "🏒", "🏑", "🥍", "🏏", "🥅"],
  travel: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎", "🚓", "🚑", "🚒", "🚐", "🚚", "🚛", "🚜", "🛴", "🚲", "🛵", "🏍"],
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [category, setCategory] = useState("smileys")
  const isMobile = useMediaQuery("(max-width: 768px)")

  const filteredEmojis = searchTerm
    ? Object.values(EMOJI_CATEGORIES)
        .flat()
        .filter((emoji) => emoji.includes(searchTerm))
    : EMOJI_CATEGORIES[category as keyof typeof EMOJI_CATEGORIES] || []

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      className={isMobile ? "w-full max-w-md mx-auto" : ""}
    >
      <Card
        className={`${isMobile ? "w-full" : "w-64"} p-2 shadow-lg border-gray-200 dark:border-gray-700 dark:bg-gray-900`}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="relative w-full">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
            <Input
              placeholder="Search emoji..."
              className="pl-8 h-8 bg-gray-50 border-gray-200 focus:border-indigo-300 focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:focus:border-indigo-700 dark:focus:ring-indigo-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {!searchTerm && (
          <Tabs value={category} onValueChange={setCategory}>
            <TabsList className="grid grid-cols-5 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger
                value="smileys"
                className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900 dark:data-[state=active]:text-indigo-200"
              >
                😀
              </TabsTrigger>
              <TabsTrigger
                value="gestures"
                className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900 dark:data-[state=active]:text-indigo-200"
              >
                👋
              </TabsTrigger>
              <TabsTrigger
                value="animals"
                className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900 dark:data-[state=active]:text-indigo-200"
              >
                🐶
              </TabsTrigger>
              <TabsTrigger
                value="food"
                className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900 dark:data-[state=active]:text-indigo-200"
              >
                🍎
              </TabsTrigger>
              <TabsTrigger
                value="activities"
                className="data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900 dark:data-[state=active]:text-indigo-200"
              >
                ⚽️
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        <div className="grid grid-cols-7 gap-1 mt-2 h-40 overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {filteredEmojis.map((emoji, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.01 }}
                onClick={() => onSelect(emoji)}
                className="flex items-center justify-center h-8 w-8 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              >
                {emoji}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}
