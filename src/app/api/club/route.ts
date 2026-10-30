import { NextResponse } from "next/server";
import { getMe, unauthorized, featureOff } from "@/lib/auth";
import { buildClubGraph } from "@/lib/club";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const me = await getMe();
  if (!me) return unauthorized();
  const off = await featureOff("club");
  if (off) return off;
  const settings = await getSettings();
  return NextResponse.json(await buildClubGraph(me.email, settings.privacy.showOrgInClub));
}
