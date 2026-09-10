import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "./lib/prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { verifyImpersonationToken } from "./lib/services/development"

import { logAudit } from "./lib/services/audit"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          
          const user = await prisma.user.findUnique({
            where: { email },
            include: { role: true }
          });
          
          if (!user) {
            await logAudit({
              action: "LOGIN_FAILED_UNKNOWN_USER",
              entityType: "User",
              entityId: email,
              after: { email },
            })
            return null;
          }

          if (!user.isActive) {
            await logAudit({
              userId: user.id,
              action: "LOGIN_FAILED_INACTIVE",
              entityType: "User",
              entityId: user.id,
              after: { email: user.email },
            })
            return null;
          }

          if (user.lockedUntil && user.lockedUntil > new Date()) {
            await logAudit({
              userId: user.id,
              action: "LOGIN_BLOCKED_LOCKED",
              entityType: "User",
              entityId: user.id,
              after: { lockedUntil: user.lockedUntil },
            })
            return null;
          }
          
          const passwordsMatch = await bcrypt.compare(password, user.password);
          
          if (passwordsMatch) {
            if (user.failedLoginAttempts > 0 || user.lockedUntil) {
              await prisma.user.update({
                where: { id: user.id },
                data: { failedLoginAttempts: 0, lockedUntil: null },
              })
            }
            await logAudit({
              userId: user.id,
              action: "LOGIN_SUCCESS",
              entityType: "User",
              entityId: user.id,
            })
            return {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role?.name,
              theme: user.theme ?? "hell",
            };
          } else {
            const newAttempts = (user.failedLoginAttempts || 0) + 1;
            const lockAccount = newAttempts >= 5;
            const lockedUntil = lockAccount ? new Date(Date.now() + 15 * 60 * 1000) : null;

            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginAttempts: lockAccount ? 0 : newAttempts,
                lockedUntil,
              },
            })

            await logAudit({
              userId: user.id,
              action: lockAccount ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
              entityType: "User",
              entityId: user.id,
              after: { attempts: newAttempts, locked: lockAccount, lockedUntil },
            })
          }
        }
        
        return null;
      }
    }),
    Credentials({
      id: "impersonate",
      name: "Impersonate",
      credentials: {
        targetUserId: { label: "Target User ID", type: "text" },
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const { targetUserId, token } = (credentials ?? {}) as {
          targetUserId?: string
          token?: string
        }
        if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_IMPERSONATION !== "true") {
          return null
        }
        if (!targetUserId || !token) return null

        const isValid = await verifyImpersonationToken(targetUserId, token)
        if (!isValid) return null

        const user = await prisma.user.findUnique({
          where: { id: targetUserId },
          include: { role: true },
        })

        if (!user || !user.isActive) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role?.name,
          theme: user.theme ?? "hell",
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.theme = (user as any).theme;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string | undefined;
        (session.user as any).theme = (token.theme as string) || "hell";
        if (token.sub) {
          session.user.id = token.sub;
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/',
  },
  session: { strategy: "jwt" }
})
