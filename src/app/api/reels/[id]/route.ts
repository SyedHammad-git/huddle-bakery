import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/http";
import { isValidReel } from "@/lib/reels";

export const runtime = "nodejs";

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "A valid Reel ID is required." }, { status: 400 });
  try {
    await ensureDatabase();
    const body: unknown = await request.json();
    if (!isValidReel(body)) return NextResponse.json({ error: "Provide valid Reel details." }, { status: 400 });
    const [reel] = await getDb()`
      UPDATE reels SET title = ${body.title.trim()}, caption = ${body.caption},
        reel_url = ${body.reel_url}, thumbnail_url = ${body.thumbnail_url}, sort_order = ${body.sort_order}
      WHERE id = ${id} RETURNING *
    `;
    if (!reel) return NextResponse.json({ error: "Reel not found." }, { status: 404 });
    return NextResponse.json(reel);
  } catch (error) {
    return errorResponse(error, "Unable to update the Reel.");
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "A valid Reel ID is required." }, { status: 400 });
  try {
    await ensureDatabase();
    const [deleted] = await getDb()`DELETE FROM reels WHERE id = ${id} RETURNING id`;
    if (!deleted) return NextResponse.json({ error: "Reel not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete the Reel.");
  }
}
