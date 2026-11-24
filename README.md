# HUDDLE BAKERY

Responsive Next.js App Router storefront with a Neon PostgreSQL catalog, persisted admin credentials, and a protected staff portal.

## Local setup

1. Use Node.js 20.9 or newer and run `npm install`.
2. The supplied Neon configuration is in the ignored `.env.local` file. For a different database, copy `.env.example` to `.env.local` and set `DATABASE_URL` and `ADMIN_SESSION_SECRET`.
3. Run `npm run dev`. The first database-backed request creates the `products` and `admin_credentials` tables and seeds the 22 starter catalog items plus the initial admin login if those tables are empty.
4. Sign in at `/admin` using `hammad_admin` / `Huddle#2026!`; change these credentials from the Security tab.
5. Run `npm run build` and `npm run lint` before deployment.

## Vercel

Add these same two environment variable names to the Vercel project's Production, Preview, and Development environments:

- `DATABASE_URL` — the Neon PostgreSQL pooled connection string (including `sslmode=require`).
- `ADMIN_SESSION_SECRET` — the session signing secret.

Do not add quotes around the values in Vercel settings, and do not expose `DATABASE_URL` as a `NEXT_PUBLIC_` variable. The database initializes itself from server-side code, so no separate schema migration command is required. Product image uploads are resized in the browser to at most 900px and stored as compressed data URLs in Neon, which works with Vercel's read-only filesystem.

The original repository contained only `index.html` and no `images/` directory. Starter product rows retain the requested `./images/...` paths; add the original image files under `public/images/` or upload replacements in the admin portal.
