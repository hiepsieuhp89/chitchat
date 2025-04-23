"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore"
import UserList from "@/components/user-list"
import ChatInterface from "@/components/chat-interface"
import type { User } from "@/types/user"
import type { Chat } from "@/types/chat"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { motion } from "framer-motion"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function ChatPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [showUserList, setShowUserList] = useState(!isMobile)

  // Toggle user list visibility on mobile
  useEffect(() => {
    setShowUserList(!isMobile || (isMobile && !selectedChat))
  }, [isMobile, selectedChat])

  // Fetch all users
  useEffect(() => {
    if (!user) return

    const q = query(collection(db, "users"), where("uid", "!=", user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: User[] = []
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as User)
      })
      setUsers(usersList)
    })

    return () => unsubscribe()
  }, [user])

  // Fetch user's chats
  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc"),
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsList: Chat[] = []
      snapshot.forEach((doc) => {
        chatsList.push({ id: doc.id, ...doc.data() } as Chat)
      })
      setChats(chatsList)
    })

    return () => unsubscribe()
  }, [user])

  const handleSelectChat = (chat: Chat) => {
    setSelectedChat(chat)
    setSelectedUser(null)
    if (isMobile) {
      setShowUserList(false)
    }
  }

  const handleSelectUser = (user: User | null) => {
    setSelectedUser(user)
    if (isMobile && user) {
      setShowUserList(false)
    }
  }

  const handleBackToList = () => {
    setShowUserList(true)
  }

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="h-full w-full p-2 md:p-4"
    >
      <div className="h-full w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-950">
        {isMobile ? (
          // Mobile layout
          <div className="h-full flex flex-col">
            {showUserList ? (
              <UserList
                users={users}
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                onSelectUser={handleSelectUser}
                isMobile={isMobile}
              />
            ) : (
              <div className="flex flex-col h-full">
                <div className="flex items-center p-2 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
                  <Button variant="ghost" size="icon" onClick={handleBackToList} className="mr-2">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex-1">
                  <ChatInterface
                    selectedChat={selectedChat}
                    selectedUser={selectedUser}
                    setSelectedChat={setSelectedChat}
                    isMobile={isMobile}
                    onBackToList={handleBackToList}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          // Desktop layout with resizable panels
          <ResizablePanelGroup direction="horizontal">
            <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
              <UserList
                users={users}
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={handleSelectChat}
                onSelectUser={handleSelectUser}
                isMobile={isMobile}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={75}>
              <ChatInterface
                selectedChat={selectedChat}
                selectedUser={selectedUser}
                setSelectedChat={setSelectedChat}
                isMobile={isMobile}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </motion.div>
  )
}
