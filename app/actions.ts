"use server"

import { signIn, signOut } from "@/auth"
import { AuthError } from "next-auth"
import { redirect } from "next/navigation"

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", formData, { redirectTo: "/dashboard" })
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/?error=CredentialsSignin")
    }
    throw error
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" })
}
