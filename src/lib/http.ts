import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export async function requireAdmin(): Promise<NextResponse | null> {
  try {
    const session = await getSession();
    return session ? null : NextResponse.json({ error: "Authentication required." }, { status: 401 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to verify the admin session." },
      { status: 500 },
    );
  }
}

export function errorResponse(error: unknown, fallback: string): NextResponse {
  const message = error instanceof Error ? error.message : fallback;
  return NextResponse.json({ error: message }, { status: 500 });
}
