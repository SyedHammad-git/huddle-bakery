import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    return NextResponse.json({ authenticated: Boolean(session), username: session?.username ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify session." }, { status: 500 });
  }
}
