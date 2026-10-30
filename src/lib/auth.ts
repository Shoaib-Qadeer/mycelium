import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextResponse } from "next/server";
import { getDb } from "./mongo";

const list = (v: string | undefined) =>
  (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const allowedDomains = () => list(process.env.ALLOWED_DOMAINS || "learningplanetinstitute.org");
export const adminEmails = () => list(process.env.ADMIN_EMAILS);

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.toLowerCase());
}

export async function isAllowed(email: string): Promise<boolean> {
  const e = email.toLowerCase();
  const domain = e.split("@")[1] || "";
  if (allowedDomains().includes(domain)) return true;
  if (isAdminEmail(e)) return true;
  const db = await getDb();
  return Boolean(await db.collection("allowlist").findOne({ email: e }));
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/", error: "/denied" },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;
      if (!(await isAllowed(email))) return "/denied";
      const db = await getDb();
      await db.collection("users").updateOne(
        { email },
        {
          $set: { name: user.name || email.split("@")[0], image: user.image || "", lastSeen: new Date() },
          $setOnInsert: { email, createdAt: new Date() },
        },
        { upsert: true }
      );
      return true;
    },
    async jwt({ token }) {
      if (token.email) token.isAdmin = isAdminEmail(token.email);
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as { isAdmin?: boolean }).isAdmin = Boolean(token.isAdmin);
      return session;
    },
  },
};

export type Me = { email: string; name: string; image: string; isAdmin: boolean };

/** Returns the signed-in, still-allowed user, or null. */
export async function getMe(): Promise<Me | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  if (!(await isAllowed(email))) return null;
  return {
    email,
    name: session?.user?.name || email.split("@")[0],
    image: session?.user?.image || "",
    isAdmin: isAdminEmail(email),
  };
}

export const unauthorized = () => NextResponse.json({ error: "Sign in with an approved account." }, { status: 401 });
export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
