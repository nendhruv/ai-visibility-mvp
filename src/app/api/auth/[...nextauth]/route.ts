import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // This is a simplified version - in a real app you would validate against your database
        if (credentials?.email === "test@example.com" && credentials?.password === "password") {
          return { 
            id: "1", 
            name: "Test User",
            email: "test@example.com"
          };
        }
        return null;
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET || "your-default-secret-here"
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 