import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const ALLOWED_EMAIL = process.env.ALLOWED_EMAIL;

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    signIn({ user }) {
      if (!ALLOWED_EMAIL) return true;
      return user.email === ALLOWED_EMAIL;
    },
    session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
