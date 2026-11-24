import { NextRequest, NextResponse } from "next/server";
import type { ProductInput } from "@/lib/types";
import { ensureDatabase, getDb } from "@/lib/db";
import { errorResponse, requireAdmin } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function isProductInput(value: unknown): value is ProductInput {
  if (!value || typeof value !== "object") return false;
  const product = value as Record<string, unknown>;
  return typeof product.name === "string" && product.name.trim().length > 0
    && typeof product.category === "string" && product.category.trim().length > 0
    && Number.isInteger(product.price) && Number(product.price) >= 0
    && typeof product.description === "string" && typeof product.image_url === "string" && isAllowedImage(product.image_url)
    && (product.included_items === undefined || (Array.isArray(product.included_items)
      && product.included_items.every((item) => typeof item === "string")))
    && (product.regular_price === null || typeof product.regular_price === "string")
    && (product.badge === null || typeof product.badge === "string")
    && (product.flavors === null || (Array.isArray(product.flavors) && product.flavors.every((flavor) => typeof flavor === "string")))
    && Number.isInteger(product.sort_order);
}

function isAllowedImage(image: string): boolean {
  if (image.length > 5_000_000) return false;
  return image.startsWith("./images/")
    || image.startsWith("/images/")
    || /^https?:\/\/\S+$/i.test(image)
    || /^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(image);
}

export async function GET() {
  try {
    await ensureDatabase();
    const products = await getDb()`
      SELECT products.*,
        COALESCE(review_summary.average_rating, 0)::float AS average_rating,
        COALESCE(review_summary.review_count, 0)::int AS review_count
      FROM products
      LEFT JOIN (
        SELECT product_id, AVG(rating)::float AS average_rating, COUNT(*)::int AS review_count
        FROM product_reviews GROUP BY product_id
      ) AS review_summary ON review_summary.product_id = products.id
      ORDER BY products.sort_order ASC, products.created_at ASC
    `;
    return NextResponse.json(products);
  } catch (error) {
    return errorResponse(error, "Unable to load the menu.");
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureDatabase();
    const body: unknown = await request.json();
    if (!isProductInput(body)) return NextResponse.json({ error: "Please provide valid product details." }, { status: 400 });
    const [category] = await getDb()`SELECT id FROM categories WHERE name = ${body.category.trim()}`;
    if (!category) return NextResponse.json({ error: "Choose an existing category." }, { status: 400 });
    const [product] = await getDb()`
      INSERT INTO products (name, category, price, regular_price, badge, flavors, description, image_url, included_items, sort_order)
      VALUES (${body.name.trim()}, ${body.category}, ${body.price}, ${body.regular_price}, ${body.badge},
        ${body.flavors ?? []}, ${body.description.trim()}, ${body.image_url.trim()}, ${body.included_items ?? []}, ${body.sort_order})
      RETURNING *
    `;
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to create the product.");
  }
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    await ensureDatabase();
    const { id, ...body } = await request.json() as { id?: string } & Record<string, unknown>;
    if (!id || !isProductInput(body)) return NextResponse.json({ error: "Please provide a product ID and valid details." }, { status: 400 });
    const [category] = await getDb()`SELECT id FROM categories WHERE name = ${body.category.trim()}`;
    if (!category) return NextResponse.json({ error: "Choose an existing category." }, { status: 400 });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "A valid product ID is required." }, { status: 400 });
    }
    const [product] = await getDb()`
      UPDATE products SET name = ${body.name.trim()}, category = ${body.category}, price = ${body.price},
        regular_price = ${body.regular_price}, badge = ${body.badge}, flavors = ${body.flavors ?? []},
        description = ${body.description.trim()}, image_url = ${body.image_url.trim()},
        included_items = ${body.included_items ?? []}, sort_order = ${body.sort_order}
      WHERE id = ${id} RETURNING *
    `;
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json(product);
  } catch (error) {
    return errorResponse(error, "Unable to update the product.");
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A product ID is required." }, { status: 400 });
  try {
    await ensureDatabase();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ error: "A valid product ID is required." }, { status: 400 });
    }
    const deleted = await getDb()`DELETE FROM products WHERE id = ${id} RETURNING id`;
    if (!deleted.length) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete the product.");
  }
}
