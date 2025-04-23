import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase"
import { v4 as uuidv4 } from "uuid"
import { uploadToImgur } from "@/lib/imgur"

// Function to upload files to our server-side API route
export const uploadToImageKit = async (file: File | Blob, fileName?: string): Promise<string> => {
  try {
    // For images, use Imgur as it's already working
    if (file instanceof File && file.type.startsWith("image/")) {
      return uploadToImgur(file)
    }

    // For other files, use our server-side API route
    const name = fileName || (file instanceof File ? file.name : `file_${Date.now()}`)

    // Create form data for upload
    const formData = new FormData()

    // If it's a Blob, convert it to a File
    if (!(file instanceof File)) {
      file = new File([file], name, {
        type: file.type || "application/octet-stream",
      })
    }

    formData.append("file", file)

    // Upload to our server-side API route
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }

    const data = await response.json()
    return data.url
  } catch (error) {
    console.error("Error uploading to server:", error)

    // Fallback to Firebase Storage if server upload fails
    return uploadToFirebase(file, fileName)
  }
}

// Helper function to upload to Firebase Storage
const uploadToFirebase = async (file: File | Blob, fileName?: string): Promise<string> => {
  const fileId = uuidv4()
  const name = fileName || (file instanceof File ? file.name : `file_${Date.now()}`)
  const fileRef = ref(storage, `uploads/${fileId}_${name}`)

  // Convert Blob to File if needed
  const fileToUpload =
    file instanceof File ? file : new File([file], name, { type: file.type || "application/octet-stream" })

  await uploadBytes(fileRef, fileToUpload)
  return getDownloadURL(fileRef)
}

// Function to generate a thumbnail URL
export const getThumbnailUrl = (url: string, width = 100, height = 100): string => {
  if (!url) return url

  if (url.includes("imgur.com")) {
    // Imgur thumbnail format
    const parts = url.split(".")
    const ext = parts.pop()
    return `${parts.join(".")}s.${ext}`
  }

  if (url.includes("imagekit.io")) {
    // ImageKit transformation parameters
    return `${url}?tr=w-${width},h-${height},fo-auto`
  }

  if (url.includes("firebasestorage.googleapis.com")) {
    // Firebase doesn't support transformations, return as is
    return url
  }

  return url
}
