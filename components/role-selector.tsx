"use client"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { motion } from "framer-motion"
import { Shield, User } from "lucide-react"

export default function RoleSelector() {
  const { setUserRole } = useAuth()
  const [selectedRole, setSelectedRole] = useState<"admin" | "user" | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!selectedRole) return
    
    setIsSubmitting(true)
    try {
      await setUserRole(selectedRole)
    } catch (error) {
      console.error("Error setting role:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-950 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Select Your Role</CardTitle>
            <CardDescription>
              Please choose your role in the chat application. This will determine your permissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup 
              value={selectedRole || ""} 
              onValueChange={(value) => setSelectedRole(value as "admin" | "user")}
              className="space-y-4"
            >
              <div className={`flex items-center space-x-4 rounded-lg border p-4 transition-colors ${
                selectedRole === "admin" ? "border-indigo-500 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-800"
              }`}>
                <RadioGroupItem value="admin" id="admin" className="border-indigo-500" />
                <Label htmlFor="admin" className="flex-1 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Administrator</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Full access to edit messages and manage users in the system.
                  </p>
                </Label>
              </div>
              
              <div className={`flex items-center space-x-4 rounded-lg border p-4 transition-colors ${
                selectedRole === "user" ? "border-indigo-500 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-900/30" : "border-gray-200 dark:border-gray-800"
              }`}>
                <RadioGroupItem value="user" id="user" className="border-indigo-500" />
                <Label htmlFor="user" className="flex-1 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-medium text-gray-900 dark:text-white">Regular User</span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Standard access to chat with administrators only.
                  </p>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleSubmit} 
              disabled={!selectedRole || isSubmitting} 
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting ? "Setting role..." : "Continue"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
} 