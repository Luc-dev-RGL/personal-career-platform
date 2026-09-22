"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(prevState: string | null, formData: FormData) {
  try {
    await signIn("credentials", formData);
    return null;
  } catch (error) {
    if (error instanceof AuthError) {
      return "Email ou mot de passe incorrect";
    }
    throw error;
  }
}