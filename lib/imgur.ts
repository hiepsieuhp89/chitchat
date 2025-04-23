export const uploadToImgur = async (file: File): Promise<string> => {

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append("image", file)

    const xhr = new XMLHttpRequest()
    xhr.open("POST", "https://api.imgur.com/3/image")
    xhr.setRequestHeader("Authorization", `Client-ID 9f379adbe58c246`)

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText)
        resolve(response.data.link)
      } else {
        reject(new Error(`Imgur upload failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error("Imgur upload failed"))
    }

    xhr.send(formData)
  })
}
