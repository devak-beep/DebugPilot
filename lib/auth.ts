import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import db from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const email = (credentials.email as string).trim().toLowerCase()
        const res = await db.execute({ sql: 'SELECT * FROM User WHERE email = ?', args: [email] })
        const user = res.rows[0]
        if (!user) return null
        const incoming = credentials.password as string
        const stored = user.password as string
        // New clients send sha256(password); stored is bcrypt(sha256(password))
        const valid = await bcrypt.compare(incoming, stored)
        if (!valid) return null
        return { id: user.id as string, name: user.name as string, email: user.email as string }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user, trigger, session }) {
      if (user) { token.id = user.id; token.name = user.name; token.email = user.email }
      if (trigger === 'update' && session) {
        if (session.name) token.name = session.name
        if (session.email) token.email = session.email
      }
      return token
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string
      if (token.name) session.user.name = token.name as string
      if (token.email) session.user.email = token.email as string
      return session
    },
  },
})
