import NextAuth, { type DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      role?: string
      groupId?: string | null
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    groupId?: string | null
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string
    groupId?: string | null
  }
}
