import { NextRequest, NextResponse } from "next/server";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "A valid product ID is required." }, { status: 400 });
  try {
    await ensureDatabase();
    const [product] = await getDb()`SELECT * FROM products WHERE id = ${id}`;
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const reviews = await getDb()`
      SELECT id, product_id, reviewer_name, city, rating, comment, created_at
      FROM product_reviews WHERE product_id = ${id}
      ORDER BY created_at DESC
    `;
    const [summary] = await getDb()`
      SELECT COALESCE(AVG(rating), 0)::float AS average_rating, COUNT(*)::int AS review_count
      FROM product_reviews WHERE product_id = ${id}
    `;
    return NextResponse.json({
      product,
      reviews,
      averageRating: summary.average_rating,
      reviewCount: summary.review_count,
    });
  } catch (error) {
    return errorResponse(error, "Unable to load product details.");
  }
}
