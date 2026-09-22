import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./lib/db";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user) return null;

        const match = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!match) return null;

        return { id: user.id.toString(), email: user.email, role: user.role };
      },
    }),
  ],
  session: { strategy: "jwt" }, // ✅ Important pour Credentials
  secret: process.env.AUTH_SECRET,
  pages: { signIn: "/connexion" },
});