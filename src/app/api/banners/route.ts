import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/http";
import type { SaleBannerInput } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isValidBanner(value: unknown): value is SaleBannerInput {
  if (!value || typeof value !== "object") return false;
  const banner = value as Record<string, unknown>;
  const optionalText = (text: unknown, maxLength: number) => text === undefined || text === null
    || (typeof text === "string" && text.length <= maxLength);
  const safeLink = (link: unknown) => link === undefined || link === null || (typeof link === "string" && link.length <= 2048
    && (link.startsWith("/") && !link.startsWith("//")
      || /^#[a-z][\w-]*$/i.test(link)
      || /^https?:\/\/\S+$/i.test(link)));
  const safeImage = (image: unknown) => image === undefined || image === null || (typeof image === "string"
    && image.length <= 4_500_000
    && (image.startsWith("/") && !image.startsWith("//")
      || /^https?:\/\/\S+$/i.test(image)
      || /^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)));
  return typeof banner.title === "string" && banner.title.trim().length > 0
    && banner.title.length <= 160
    && optionalText(banner.badge, 80)
    && optionalText(banner.description, 5000)
    && optionalText(banner.cta_text, 80)
    && safeImage(banner.image_url)
    && safeLink(banner.cta_link)
    && typeof banner.is_active === "boolean"
    && Number.isInteger(banner.sort_order) && Number(banner.sort_order) >= 0;
}

export async function GET(request: NextRequest) {
  try {
    await ensureDatabase();
    if (request.nextUrl.searchParams.get("all") === "1") {
      const denied = await requireAdmin();
      if (denied) return denied;
      const banners = await getDb()`SELECT id, badge, title, description, cta_text, cta_link, image_url, is_active, sort_order, created_at FROM sale_banners ORDER BY sort_order ASC, id ASC`;
      return NextResponse.json(banners);
    }
    const banners = await getDb()`
      SELECT id, badge, title, description, cta_text, cta_link, image_url, is_active, sort_order, created_at
      FROM sale_banners
      WHERE is_active = TRUE AND length(trim(title)) > 0
      ORDER BY sort_order ASC, id ASC
    `;
    return NextResponse.json(banners);
  } catch (error) {
    return errorResponse(error, "Unable to load sale banners.");
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureDatabase();
    const body: unknown = await request.json();
    if (!isValidBanner(body)) return NextResponse.json({ error: "Provide a title and valid optional banner details." }, { status: 400 });
    const [banner] = await getDb()`
      INSERT INTO sale_banners (badge, title, description, cta_text, cta_link, image_url, is_active, sort_order)
      VALUES (${body.badge ?? null}, ${body.title.trim()}, ${body.description ?? null}, ${body.cta_text ?? null},
        ${body.cta_link ?? null}, ${body.image_url ?? null}, ${body.is_active}, ${body.sort_order})
      RETURNING id, badge, title, description, cta_text, cta_link, image_url, is_active, sort_order, created_at
    `;
    return NextResponse.json(banner, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to create the banner.");
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureDatabase();
    const { id, ...body } = await request.json() as { id?: unknown } & Record<string, unknown>;
    if (!Number.isInteger(id) || Number(id) < 1 || !isValidBanner(body)) {
      return NextResponse.json({ error: "Provide a banner ID and valid banner details." }, { status: 400 });
    }
    const [banner] = await getDb()`
      UPDATE sale_banners SET badge = ${body.badge ?? null}, title = ${body.title.trim()},
        description = ${body.description ?? null}, cta_text = ${body.cta_text ?? null},
        cta_link = ${body.cta_link ?? null}, image_url = ${body.image_url ?? null},
        is_active = ${body.is_active}, sort_order = ${body.sort_order}
      WHERE id = ${Number(id)}
      RETURNING id, badge, title, description, cta_text, cta_link, image_url, is_active, sort_order, created_at
    `;
    if (!banner) return NextResponse.json({ error: "Banner not found." }, { status: 404 });
    return NextResponse.json(banner);
  } catch (error) {
    return errorResponse(error, "Unable to update the banner.");
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "A valid banner ID is required." }, { status: 400 });
  try {
    await ensureDatabase();
    const [deleted] = await getDb()`DELETE FROM sale_banners WHERE id = ${id} RETURNING id`;
    if (!deleted) return NextResponse.json({ error: "Banner not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete the banner.");
  }
}
