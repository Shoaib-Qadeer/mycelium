import { NextResponse } from "next/server";
import { getMe, unauthorized } from "@/lib/auth";
import { buildClubGraph } from "@/lib/club";

export async function GET() {
  const me = await getMe();
  if (!me) return unauthorized();
  return NextResponse.json(await buildClubGraph(me.email));
}
