import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/http";
import { isValidReel } from "@/lib/reels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await ensureDatabase();
    const reels = await getDb()`SELECT * FROM reels ORDER BY sort_order ASC, created_at ASC`;
    return NextResponse.json(reels);
  } catch (error) {
    return errorResponse(error, "Unable to load Instagram Reels.");
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureDatabase();
    const body: unknown = await request.json();
    if (!isValidReel(body)) return NextResponse.json({ error: "Provide a title, valid Instagram URL, thumbnail, and sort order." }, { status: 400 });
    const [reel] = await getDb()`
      INSERT INTO reels (title, caption, reel_url, thumbnail_url, sort_order)
      VALUES (${body.title.trim()}, ${body.caption}, ${body.reel_url}, ${body.thumbnail_url}, ${body.sort_order})
      RETURNING *
    `;
    return NextResponse.json(reel, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to create the Reel.");
  }
}
