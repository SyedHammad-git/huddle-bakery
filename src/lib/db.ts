import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth";
import { seedProducts } from "@/lib/catalog";
import { FIXED_CATEGORIES } from "@/lib/types";
import { seedReels } from "@/lib/reels";

type Database = NeonQueryFunction<false, false>;

let database: Database | undefined;
let initialization: Promise<void> | undefined;

export function getDb(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured.");
  database ??= neon(connectionString);
  return database;
}

async function initialize(): Promise<void> {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      regular_price TEXT,
      badge TEXT,
      flavors TEXT[] DEFAULT '{}',
      description TEXT NOT NULL,
      image_url TEXT NOT NULL,
      included_items TEXT[] DEFAULT '{}',
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE products ADD COLUMN IF NOT EXISTS included_items TEXT[] DEFAULT '{}'`;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_credentials (
      id INTEGER PRIMARY KEY DEFAULT 1,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER DEFAULT 0
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS sale_banners (
      id SERIAL PRIMARY KEY,
      badge TEXT,
      title TEXT NOT NULL,
      description TEXT,
      cta_text TEXT,
      cta_link TEXT,
      image_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE sale_banners ADD COLUMN IF NOT EXISTS badge TEXT`;
  await sql`ALTER TABLE sale_banners ADD COLUMN IF NOT EXISTS description TEXT`;
  await sql`ALTER TABLE sale_banners ADD COLUMN IF NOT EXISTS cta_text TEXT`;
  await sql`ALTER TABLE sale_banners ADD COLUMN IF NOT EXISTS cta_link TEXT`;
  await sql`ALTER TABLE sale_banners ADD COLUMN IF NOT EXISTS image_url TEXT`;
  await sql`ALTER TABLE sale_banners ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0`;
  await sql`ALTER TABLE sale_banners ALTER COLUMN image_url DROP NOT NULL`;
  await sql`ALTER TABLE sale_banners ALTER COLUMN is_active SET DEFAULT TRUE`;
  await sql`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'sale_banners'
          AND column_name = 'link_url'
      ) THEN
        EXECUTE 'UPDATE sale_banners SET cta_link = link_url WHERE cta_link IS NULL AND link_url IS NOT NULL';
        ALTER TABLE sale_banners DROP COLUMN link_url;
      END IF;
    END;
    $$
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS reels (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      caption TEXT,
      reel_url TEXT NOT NULL,
      thumbnail_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`CREATE TABLE IF NOT EXISTS app_seed_state (key TEXT PRIMARY KEY)`;
  await sql`
    CREATE TABLE IF NOT EXISTS product_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      reviewer_name TEXT NOT NULL,
      city TEXT DEFAULT 'Faisalabad',
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    DO $$
    DECLARE constraint_row RECORD;
    BEGIN
      FOR constraint_row IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'products'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%category%'
      LOOP
        EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', constraint_row.conname);
      END LOOP;
    END $$
  `;

  for (const [sort_order, name] of FIXED_CATEGORIES.entries()) {
    await sql`
      INSERT INTO categories (name, is_fixed, sort_order)
      VALUES (${name}, TRUE, ${sort_order})
      ON CONFLICT (name) DO UPDATE SET is_fixed = TRUE, sort_order = EXCLUDED.sort_order
    `;
  }
  await sql`
    INSERT INTO categories (name, is_fixed, sort_order)
    SELECT DISTINCT category, FALSE, 100
    FROM products
    WHERE category NOT IN ('Sundaes', 'Brownies & Snownies', 'Cakes & Cupcakes', 'Exclusive Deals')
    ON CONFLICT (name) DO NOTHING
  `;

  const reelsJson = JSON.stringify(seedReels);
  await sql`
    WITH first_seed AS (
      INSERT INTO app_seed_state (key)
      SELECT 'reels_seeded'
      WHERE NOT EXISTS (SELECT 1 FROM reels)
      ON CONFLICT (key) DO NOTHING
      RETURNING key
    )
    INSERT INTO reels (title, caption, reel_url, thumbnail_url, sort_order)
    SELECT seed.title, seed.caption, seed.reel_url, seed.thumbnail_url, seed.sort_order
    FROM jsonb_to_recordset(${reelsJson}::jsonb) AS seed(
      title TEXT, caption TEXT, reel_url TEXT, thumbnail_url TEXT, sort_order INTEGER
    )
    CROSS JOIN first_seed
  `;

  const seedJson = JSON.stringify(seedProducts);
  await sql`
    INSERT INTO products (name, category, price, regular_price, badge, flavors, description, image_url, included_items, sort_order)
    SELECT seed.name, seed.category, seed.price, seed.regular_price, seed.badge,
      ARRAY(SELECT jsonb_array_elements_text(seed.flavors)), seed.description, seed.image_url,
      ARRAY(SELECT jsonb_array_elements_text(seed.included_items)), seed.sort_order
    FROM jsonb_to_recordset(${seedJson}::jsonb) AS seed(
      name TEXT, category TEXT, price INTEGER, regular_price TEXT, badge TEXT,
      flavors JSONB, description TEXT, image_url TEXT, included_items JSONB, sort_order INTEGER
    )
    WHERE NOT EXISTS (SELECT 1 FROM products)
  `;
  await sql`
    UPDATE products SET included_items = ARRAY(SELECT jsonb_array_elements_text(seed.included_items))
    FROM jsonb_to_recordset(${seedJson}::jsonb) AS seed(name TEXT, included_items JSONB)
    WHERE products.name = seed.name
      AND COALESCE(array_length(products.included_items, 1), 0) = 0
      AND jsonb_array_length(seed.included_items) > 0
  `;
  await sql`
    INSERT INTO categories (name, is_fixed, sort_order)
    SELECT DISTINCT category, FALSE, 100
    FROM products
    WHERE category NOT IN ('Sundaes', 'Brownies & Snownies', 'Cakes & Cupcakes', 'Exclusive Deals')
    ON CONFLICT (name) DO NOTHING
  `;

  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword("Huddle#2026!", salt);
  await sql`
    INSERT INTO admin_credentials (id, username, password_hash)
    VALUES (1, 'hammad_admin', ${passwordHash})
    ON CONFLICT (id) DO NOTHING
  `;
}

export async function ensureDatabase(): Promise<void> {
  if (!initialization) {
    initialization = initialize().catch((error: unknown) => {
      initialization = undefined;
      throw error;
    });
  }
  await initialization;
}
