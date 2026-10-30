import { getServerSession, type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextResponse } from "next/server";
import { getDb } from "./mongo";
import { effectiveFeatures, getSettings, type FeatureKey } from "./settings";

const list = (v: string | undefined) =>
  (v || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export const allowedDomains = () => list(process.env.ALLOWED_DOMAINS || "learningplanetinstitute.org");
export const adminEmails = () => list(process.env.ADMIN_EMAILS || "shoaib.qadeer@learningplanetinstitute.org");

export function isAdminEmail(email: string) {
  return adminEmails().includes(email.toLowerCase());
}

export type MemberStatus = "active" | "pending" | "blocked";

/** Can this email sign in at all? (Domain, admins, or the guest list.) */
export async function isAllowed(email: string): Promise<boolean> {
  const e = email.toLowerCase();
  if (isAdminEmail(e)) return true;
  const db = await getDb();
  if (await db.collection("allowlist").findOne({ email: e })) return true;
  const settings = await getSettings();
  const domain = e.split("@")[1] || "";
  return settings.access.domainOpen && allowedDomains().includes(domain);
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
      const existing = await db.collection("users").findOne({ email });
      if (existing?.status === "blocked" && !isAdminEmail(email)) return "/denied?reason=blocked";
      const settings = await getSettings();
      const guest = Boolean(await db.collection("allowlist").findOne({ email }));
      const status: MemberStatus = isAdminEmail(email) || guest || !settings.access.requireApproval ? "active" : "pending";
      await db.collection("users").updateOne(
        { email },
        {
          $set: { name: user.name || email.split("@")[0], image: user.image || "", lastSeen: new Date() },
          $setOnInsert: { email, createdAt: new Date(), status },
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

export type Me = { email: string; name: string; image: string; isAdmin: boolean; status: MemberStatus };

/** The signed-in user whatever their status, or null if not signed in / no longer allowed. */
export async function getViewer(): Promise<Me | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  if (!(await isAllowed(email))) return null;
  const db = await getDb();
  const u = await db.collection("users").findOne({ email }, { projection: { status: 1, name: 1, image: 1 } });
  const admin = isAdminEmail(email);
  const status: MemberStatus = admin ? "active" : ((u?.status as MemberStatus) || "active");
  // Keep "last seen" fresh at most every 10 minutes.
  db.collection("users")
    .updateOne({ email, $or: [{ lastSeen: { $lt: new Date(Date.now() - 600_000) } }, { lastSeen: null }] }, { $set: { lastSeen: new Date() } })
    .catch(() => {});
  return {
    email,
    name: (u?.name as string) || session?.user?.name || email.split("@")[0],
    image: (u?.image as string) || session?.user?.image || "",
    isAdmin: admin,
    status,
  };
}

/** The signed-in, approved member, or null. Every member-facing API route uses this. */
export async function getMe(): Promise<Me | null> {
  const v = await getViewer();
  return v && v.status === "active" ? v : null;
}

export async function getAdmin(): Promise<Me | null> {
  const v = await getMe();
  return v?.isAdmin ? v : null;
}

/** Returns an error response if the feature is switched off, otherwise null. */
export async function featureOff(key: FeatureKey): Promise<NextResponse | null> {
  const f = effectiveFeatures(await getSettings());
  return f[key] ? null : NextResponse.json({ error: "This feature is switched off by the admin." }, { status: 403 });
}

export const unauthorized = () => NextResponse.json({ error: "Sign in with an approved account." }, { status: 401 });
export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });
