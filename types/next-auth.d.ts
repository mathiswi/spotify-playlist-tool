import { DefaultSession, DefaultJWT } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    token?: DefaultJWT
    user: {
      id: string
    } & DefaultSession["user"]
  }

  interface JWT extends DefaultJWT {
    accessToken?: string
    refreshToken?: string
    expires_at?: number
    id?: string
  }
}