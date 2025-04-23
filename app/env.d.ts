declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_IMGUR_CLIENT_ID: string
    }
  }
}

export {}
