import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "A valid product ID is required." }, { status: 400 });
  try {
    const body = await request.json() as {
      reviewer_name?: unknown;
      city?: unknown;
      rating?: unknown;
      comment?: unknown;
    };
    if (typeof body.reviewer_name !== "string" || !body.reviewer_name.trim() || body.reviewer_name.trim().length > 100
      || typeof body.city !== "string" || !body.city.trim() || body.city.trim().length > 120
      || !Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5
      || typeof body.comment !== "string" || !body.comment.trim() || body.comment.trim().length > 2000) {
      return NextResponse.json({ error: "Enter your name and city, choose a 1–5 star rating, and write a review under 2,000 characters." }, { status: 400 });
    }
    await ensureDatabase();
    const [review] = await getDb()`
      INSERT INTO product_reviews (product_id, reviewer_name, city, rating, comment)
      SELECT ${id}, ${body.reviewer_name.trim()}, ${body.city.trim()}, ${Number(body.rating)}, ${body.comment.trim()}
      WHERE EXISTS (SELECT 1 FROM products WHERE products.id = ${id})
      RETURNING id, product_id, reviewer_name, city, rating, comment, created_at
    `;
    if (!review) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save your review.");
  }
}
