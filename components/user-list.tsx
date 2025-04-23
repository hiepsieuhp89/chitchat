"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import type { User } from "@/types/user"
import type { Chat } from "@/types/chat"
import { db } from "@/lib/firebase"
import { collection, doc, setDoc, serverTimestamp, getDoc, updateDoc } from "firebase/firestore"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LogOut, Search, MessageCircle, Users, Settings } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { motion, AnimatePresence } from "framer-motion"
import SettingsPanel from "@/components/settings-panel"
import { Badge } from "@/components/ui/badge"

interface UserListProps {
  users: User[]
  chats: Chat[]
  selectedChat: Chat | null
  onSelectChat: (chat: Chat) => void
  onSelectUser: (user: User | null) => void
  isMobile?: boolean
}

export default function UserList({
  users,
  chats,
  selectedChat,
  onSelectChat,
  onSelectUser,
  isMobile = false,
}: UserListProps) {
  const { user, userRole, signOut } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("chats")
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [userRoles, setUserRoles] = useState<Record<string, "admin" | "user">>({})
  
  useEffect(() => {
    const newRoles: Record<string, "admin" | "user"> = {}
    users.forEach(u => {
      if (u.uid && u.role) {
        newRoles[u.uid] = u.role as "admin" | "user"
      }
    })
    setUserRoles(newRoles)
  }, [users])

  const filteredUsers = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const filteredChats = chats.filter((chat) => {
    // Find the other participant's info
    const otherParticipantId = chat.participants.find((id) => id !== user?.uid)
    if (!otherParticipantId) return false

    const otherParticipantInfo = chat.participantsInfo[otherParticipantId]

    return otherParticipantInfo.displayName.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const startChat = async (otherUser: User) => {
    if (!user) return

    // Check if chat already exists
    const existingChat = chats.find(
      (chat) => chat.participants.includes(otherUser.uid) && chat.participants.includes(user.uid),
    )

    if (existingChat) {
      onSelectChat(existingChat)
      onSelectUser(null)
      return
    }

    // Create a new chat
    const chatRef = doc(collection(db, "chats"))
    const newChat: Omit<Chat, "id"> = {
      participants: [user.uid, otherUser.uid],
      participantsInfo: {
        [user.uid]: {
          displayName: user.displayName || "Unknown",
          photoURL: user.photoURL || "",
        },
        [otherUser.uid]: {
          displayName: otherUser.displayName || "Unknown",
          photoURL: otherUser.photoURL || "",
        },
      },
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
    }

    await setDoc(chatRef, newChat)

    // Get the created chat
    const chatSnapshot = await getDoc(chatRef)
    if (chatSnapshot.exists()) {
      const createdChat = { id: chatSnapshot.id, ...chatSnapshot.data() } as Chat
      onSelectChat(createdChat)
      onSelectUser(null)
    }
  }

  const getInitials = (name: string | null) => {
    if (!name) return "?"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const getUnreadCount = (chat: Chat) => {
    if (!chat.lastMessage || !user) return 0
    return chat.lastMessage.sender !== user.uid && !chat.lastMessage.read ? 1 : 0
  }

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Unknown"
    try {
      return formatDistanceToNow(timestamp.toDate(), { addSuffix: true })
    } catch (error) {
      return "Unknown"
    }
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header - make it sticky */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-4 dark:bg-gray-900 dark:border-gray-800"
      >
        <div className="flex items-center gap-2">
          <Avatar className="border-2 border-indigo-200 dark:border-indigo-900">
            <AvatarImage src={user?.photoURL || undefined} />
            <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
              {getInitials(user?.displayName || "")}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">{user?.displayName}</h2>
              {userRole && (
                <Badge 
                  variant={userRole as "admin" | "user"} 
                  size="sm"
                  className="ml-1"
                >
                  {userRole}
                </Badge>
              )}
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400">Online</p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            className="text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400"
          >
            <Settings className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </motion.div>

      {/* Search - also make it sticky */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="sticky top-[72px] z-10 p-3 border-b bg-white dark:bg-gray-900 dark:border-gray-800"
      >
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Search users and chats..."
            className="pl-8 bg-gray-50 border-gray-200 focus:border-indigo-300 focus:ring-indigo-300 dark:bg-gray-800 dark:border-gray-700 dark:focus:border-indigo-700 dark:focus:ring-indigo-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="chats" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.2, duration: 0.3 }}
          className="sticky top-[136px] z-10 bg-white dark:bg-gray-900"
        >
          <TabsList className="grid grid-cols-2 mx-3 mt-2 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger
              value="chats"
              className="flex items-center gap-1 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900 dark:data-[state=active]:text-indigo-200"
            >
              <MessageCircle className="h-4 w-4" />
              Chats
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex items-center gap-1 data-[state=active]:bg-indigo-100 data-[state=active]:text-indigo-700 dark:data-[state=active]:bg-indigo-900 dark:data-[state=active]:text-indigo-200"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="chats" className="flex-1 overflow-hidden p-0 m-0">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {filteredChats.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1 p-2"
                >
                  {filteredChats.map((chat, index) => {
                    const otherParticipantId = chat.participants.find((id) => id !== user?.uid)
                    if (!otherParticipantId) return null

                    const otherParticipantInfo = chat.participantsInfo[otherParticipantId]
                    const unreadCount = getUnreadCount(chat)

                    // Get the role from our userRoles state
                    const otherUserRole = userRoles[otherParticipantId]

                    return (
                      <motion.div
                        key={chat.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                          selectedChat?.id === chat.id
                            ? "bg-indigo-100 dark:bg-indigo-900/50"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800/50"
                        }`}
                        onClick={() => {
                          // Create a local copy of the chat with lastMessage.read set to true
                          // This ensures the UI updates immediately
                          const updatedChat = { ...chat };
                          
                          if (unreadCount > 0 && chat.lastMessage && chat.lastMessage.sender !== user?.uid) {
                            // Update in Firestore
                            const chatRef = doc(db, "chats", chat.id);
                            updateDoc(chatRef, {
                              "lastMessage.read": true
                            });
                            
                            // Update local state for immediate UI refresh
                            if (updatedChat.lastMessage) {
                              updatedChat.lastMessage.read = true;
                            }
                          }
                          
                          onSelectChat(updatedChat);
                          onSelectUser(null);
                        }}
                      >
                        <Avatar className={unreadCount > 0 ? "ring-2 ring-indigo-500 dark:ring-indigo-400" : ""}>
                          <AvatarImage src={otherParticipantInfo.photoURL || "/placeholder.svg"} />
                          <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                            {getInitials(otherParticipantInfo.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <h3 className="font-medium text-gray-900 dark:text-gray-200 truncate">
                                {otherParticipantInfo.displayName}
                              </h3>
                              {otherUserRole && (
                                <Badge 
                                  variant={otherUserRole as "admin" | "user"}
                                  size="sm"
                                >
                                  {otherUserRole}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {chat.lastMessage?.timestamp ? formatTimestamp(chat.lastMessage.timestamp) : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate max-w-[180px] ${
                              unreadCount > 0
                                ? "text-gray-900 dark:text-gray-200 font-medium"
                                : "text-gray-500 dark:text-gray-400"
                            }`}>
                              {chat.lastMessage?.text || "No messages yet"}
                            </p>
                            {unreadCount > 0 && (
                              <span className="w-5 h-5 bg-indigo-500 text-white rounded-full flex items-center justify-center text-xs font-semibold">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400"
                >
                  <MessageCircle className="h-12 w-12 mb-2 text-indigo-300 dark:text-indigo-700" />
                  <p>No chats yet</p>
                  <p className="text-sm">Start a conversation with a user</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="users" className="flex-1 overflow-hidden p-0 m-0">
          <div className="h-full overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {filteredUsers.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-1 p-2"
                >
                  {filteredUsers.map((u, index) => (
                    <motion.div
                      key={u.uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.2 }}
                      className="flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50"
                      onClick={() => startChat(u)}
                    >
                      <Avatar>
                        <AvatarImage src={u.photoURL || undefined} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                          {getInitials(u.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center">
                          <h3 className="font-medium text-gray-900 dark:text-gray-200 truncate">{u.displayName}</h3>
                          {u.role && (
                            <Badge 
                              variant={u.role as "admin" | "user"}
                              size="sm"
                              className="ml-2"
                            >
                              {u.role}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <motion.div
                            animate={{
                              scale: u.status === "online" ? [1, 1.2, 1] : 1,
                              opacity: u.status === "online" ? 1 : 0.5,
                            }}
                            transition={{
                              repeat: u.status === "online" ? Number.POSITIVE_INFINITY : 0,
                              repeatDelay: 2,
                            }}
                            className={`w-2 h-2 rounded-full ${
                              u.status === "online" ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                            }`}
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {u.status === "online" ? "Online" : u.lastSeen ? formatTimestamp(u.lastSeen) : "Offline"}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400"
                >
                  <Users className="h-12 w-12 mb-2 text-indigo-300 dark:text-indigo-700" />
                  <p>No users found</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
