"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { useRouter } from "next/navigation"

type AuthContextType = {
  user: User | null
  userRole: "admin" | "user" | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  setUserRole: (role: "admin" | "user") => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
  setUserRole: async () => {},
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<"admin" | "user" | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)

        // Check if user exists in Firestore
        const userRef = doc(db, "users", user.uid)
        const userSnap = await getDoc(userRef)

        // If user doesn't exist, create a new user document
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            lastSeen: serverTimestamp(),
            status: "online",
          })
        } else {
          // Update last seen
          await setDoc(
            userRef,
            {
              lastSeen: serverTimestamp(),
              status: "online",
            },
            { merge: true },
          )
          
          // Get the user role if exists
          const userData = userSnap.data();
          if (userData && userData.role) {
            setUserRole(userData.role);
          }
        }
      } else {
        setUser(null)
        setUserRole(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
      router.push("/chat")
    } catch (error) {
      console.error("Error signing in with Google:", error)
    }
  }

  const signOut = async () => {
    try {
      // Update user status to offline
      if (user) {
        await setDoc(
          doc(db, "users", user.uid),
          {
            status: "offline",
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        )
      }

      await firebaseSignOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const updateUserRole = async (role: "admin" | "user") => {
    if (!user) return;
    
    try {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { role }, { merge: true });
      setUserRole(role);
    } catch (error) {
      console.error("Error setting user role:", error);
    }
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        userRole,
        loading, 
        signInWithGoogle, 
        signOut,
        setUserRole: updateUserRole
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
