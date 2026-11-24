import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, hashPassword, sessionCookie, verifyPassword } from "@/lib/auth";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await request.json() as {
      currentPassword?: unknown;
      newUsername?: unknown;
      newPassword?: unknown;
      confirmPassword?: unknown;
    };
    if (typeof body.currentPassword !== "string" || typeof body.newUsername !== "string"
      || typeof body.newPassword !== "string" || typeof body.confirmPassword !== "string") {
      return NextResponse.json({ error: "Complete all security fields." }, { status: 400 });
    }
    const username = body.newUsername.trim();
    if (username.length < 3 || username.length > 64) {
      return NextResponse.json({ error: "Username must be between 3 and 64 characters." }, { status: 400 });
    }
    if (body.newPassword.length < 10) {
      return NextResponse.json({ error: "Use a password with at least 10 characters." }, { status: 400 });
    }
    if (body.newPassword !== body.confirmPassword) {
      return NextResponse.json({ error: "New password and confirmation do not match." }, { status: 400 });
    }
    await ensureDatabase();
    const [current] = await getDb()`SELECT password_hash FROM admin_credentials WHERE id = 1`;
    if (!current || !(await verifyPassword(body.currentPassword, current.password_hash))) {
      return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
    }
    const [updated] = await getDb()`
      UPDATE admin_credentials
      SET username = ${username}, password_hash = ${await hashPassword(body.newPassword)}, updated_at = NOW()
      WHERE id = 1
      RETURNING username
    `;
    if (!updated) throw new Error("Admin credentials could not be updated.");
    const response = NextResponse.json({ ok: true, username: updated.username });
    response.cookies.set(sessionCookie.name, createSessionToken(updated.username), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: sessionCookie.maxAge,
    });
    return response;
  } catch (error) {
    return errorResponse(error, "Unable to update credentials.");
  }
}
