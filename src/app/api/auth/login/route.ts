import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, sessionCookie, verifyPassword } from "@/lib/auth";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    if (typeof body.username !== "string" || typeof body.password !== "string" || !body.username || !body.password) {
      return NextResponse.json({ error: "Enter your username and password." }, { status: 400 });
    }
    await ensureDatabase();
    const [data] = await getDb()`SELECT username, password_hash FROM admin_credentials WHERE id = 1`;
    if (!data || data.username !== body.username || !(await verifyPassword(body.password, data.password_hash))) {
      return NextResponse.json({ error: "The username or password is incorrect." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(sessionCookie.name, createSessionToken(data.username), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionCookie.maxAge,
    });
    return response;
  } catch (error) {
    return errorResponse(error, "Unable to sign in.");
  }
}
