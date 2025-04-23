import { type NextRequest, NextResponse } from "next/server"
import ImageKit from "imagekit"
import { v4 as uuidv4 } from "uuid"

// Initialize ImageKit with credentials
const imagekit = new ImageKit({
  publicKey: "public_iFd4Sz+XUUsEerYT6smGxIw7MkE=",
  privateKey: "private_rpcvvQVmNALBG/3mhTuQ9nNx+ro=",
  urlEndpoint: "https://ik.imagekit.io/8f3ohpsbf",
})

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Read the file as buffer
    const buffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(buffer)

    // Generate a unique filename
    const originalName = file.name || "file"
    const extension = originalName.split(".").pop() || ""
    const fileName = `${uuidv4()}.${extension}`

    // Upload to ImageKit using Promise instead of callback
    try {
      const result = await new Promise((resolve, reject) => {
        imagekit.upload(
          {
            file: fileBuffer, // Use the buffer directly
            fileName: fileName,
            useUniqueFileName: false,
          },
          function(error, result) {
            if (error) reject(error);
            else resolve(result);
          }
        );
      });

      // Return the result
      return NextResponse.json(result);
    } catch (uploadError) {
      console.error("ImageKit upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload to ImageKit" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error processing upload:", error);
    return NextResponse.json({ error: "Failed to process upload" }, { status: 500 });
  }
}
