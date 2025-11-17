import { createHash, randomBytes } from "crypto";

import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth, { getServerSession, type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";

import { prisma } from "./prisma";

function resolveAuthSecret() {
  const directSecret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (directSecret) {
    return directSecret;
  }

  if (process.env.DATABASE_URL) {
    return createHash("sha256").update(process.env.DATABASE_URL).digest("hex");
  }

  if (process.env.NODE_ENV !== "production") {
    return randomBytes(32).toString("hex");
  }

  throw new Error("NEXTAUTH_SECRET (or AUTH_SECRET) must be set");
}

const credentialProvider = CredentialsProvider({
  name: "Credentials",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    if (!credentials?.email || !credentials.password) {
      throw new Error("Missing email or password");
    }

    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    return { id: user.id, email: user.email ?? undefined, name: user.name ?? undefined };
  },
});

const providers: NextAuthOptions["providers"] = [credentialProvider];

if (process.env.GITHUB_ID && process.env.GITHUB_SECRET) {
  providers.push(
    GithubProvider({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.email = session.user.email ?? (token.email as string | undefined);
      }
      return session;
    },
    async jwt({ token }) {
      return token;
    },
  },
  secret: resolveAuthSecret(),
};

const handler = NextAuth(authOptions);

export const GET = handler.GET;
export const POST = handler.POST;
export const getServerAuthSession = () => getServerSession(authOptions);
