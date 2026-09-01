import { NextResponse } from "next/server"

/**
 * Entsorgt verwaiste Session-Cookies (z. B. nach DB-Reset) und leitet
 * zur Login-Seite zurück. Server Components dürfen Cookies nicht
 * ändern — Route Handler schon. Damit ist der Redirect-Loop
 * (Login → Dashboard → Login) dauerhaft unterbrochen.
 */
export async function GET(request: Request) {
  const res = NextResponse.redirect(new URL("/", request.url))
  res.cookies.delete("authjs.session-token")
  res.cookies.delete("__Secure-authjs.session-token")
  return res
}
