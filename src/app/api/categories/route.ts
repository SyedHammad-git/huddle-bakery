import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { FIXED_CATEGORIES } from "@/lib/types";
import { errorResponse, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    await ensureDatabase();
    const categories = await getDb()`SELECT * FROM categories ORDER BY sort_order ASC, id ASC`;
    return NextResponse.json(categories);
  } catch (error) {
    return errorResponse(error, "Unable to load categories.");
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureDatabase();
    const body = await request.json() as { name?: unknown; sort_order?: unknown };
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) {
      return NextResponse.json({ error: "Category names must be between 1 and 80 characters." }, { status: 400 });
    }
    const sortOrder = Number.isInteger(body.sort_order) ? Number(body.sort_order) : 100;
    const [category] = await getDb()`
      INSERT INTO categories (name, is_fixed, sort_order)
      VALUES (${body.name.trim()}, FALSE, ${sortOrder})
      ON CONFLICT (name) DO NOTHING
      RETURNING *
    `;
    if (!category) return NextResponse.json({ error: "That category already exists." }, { status: 409 });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to create the category.");
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id < 1) return NextResponse.json({ error: "A valid category ID is required." }, { status: 400 });
  try {
    await ensureDatabase();
    const [category] = await getDb()`SELECT id, name, is_fixed FROM categories WHERE id = ${id}`;
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    if (category.is_fixed || FIXED_CATEGORIES.includes(category.name as (typeof FIXED_CATEGORIES)[number])) {
      return NextResponse.json({ error: "Fixed categories cannot be deleted." }, { status: 403 });
    }
    const [usage] = await getDb()`SELECT COUNT(*)::int AS count FROM products WHERE category = ${category.name}`;
    if ((usage as { count: number }).count > 0) {
      return NextResponse.json({ error: "Move or delete products in this category before deleting it." }, { status: 409 });
    }
    await getDb()`DELETE FROM categories WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete the category.");
  }
}
