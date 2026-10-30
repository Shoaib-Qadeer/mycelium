import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Optimistic check only: real authorization happens in every API route.
export async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/map/:path*", "/club/:path*", "/intros/:path*", "/admin/:path*"],
};
