"use client"

import type React from "react"

import { useEffect } from "react"
import ProtectedRoute from "@/components/protected-route"
import { motion } from "framer-motion"

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  // Prevent body scrolling
  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  return (
    <ProtectedRoute>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"
      >
        {children}
      </motion.div>
    </ProtectedRoute>
  )
}
