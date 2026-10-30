import { NextResponse } from "next/server";
import { getAdmin, unauthorized, allowedDomains, adminEmails } from "@/lib/auth";
import { getSettings, saveSettings } from "@/lib/settings";

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  return NextResponse.json({ settings: await getSettings(true), domains: allowedDomains(), admins: adminEmails() });
}

export async function PUT(req: Request) {
  const admin = await getAdmin();
  if (!admin) return unauthorized();
  const body = await req.json().catch(() => null);
  const settings = await saveSettings(body?.settings, admin.email);
  return NextResponse.json({ settings });
}
