"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Moon, Sun, X } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useMediaQuery } from "@/hooks/use-media-query"

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={onClose}
            />
          )}

          <motion.div
            initial={{ opacity: 0, x: isMobile ? 0 : 300, y: isMobile ? 300 : 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: isMobile ? 0 : 300, y: isMobile ? 300 : 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={`fixed z-50 bg-white shadow-lg dark:bg-gray-900 border-l dark:border-gray-800 ${
              isMobile
                ? "bottom-0 left-0 right-0 rounded-t-xl border-t h-auto max-h-[80vh] overflow-y-auto"
                : "top-0 right-0 h-full w-80"
            }`}
          >
            <div className="flex items-center justify-between border-b p-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold">Settings</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <h3 className="text-md font-medium">Appearance</h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5 text-indigo-500" />
                    ) : (
                      <Sun className="h-5 w-5 text-amber-500" />
                    )}
                    <Label htmlFor="theme-toggle">Dark Mode</Label>
                  </div>
                  <Switch
                    id="theme-toggle"
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-md font-medium">Notifications</h3>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sound-toggle">Sound Notifications</Label>
                  <Switch id="sound-toggle" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="desktop-toggle">Desktop Notifications</Label>
                  <Switch id="desktop-toggle" defaultChecked />
                </div>
              </div>
            </div>

            <div
              className={`${isMobile ? "p-4 border-t" : "absolute bottom-0 w-full border-t p-4"} text-center text-sm text-gray-500 dark:border-gray-800`}
            >
              Chit Chat v1.0.0
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
