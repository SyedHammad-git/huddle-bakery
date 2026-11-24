import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "huddle_admin_session";
const SESSION_SECONDS = 60 * 60 * 8;

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set to a random value of at least 32 characters.");
  }
  return secret;
}

export async function hashPassword(password: string, salt = randomBytes(16).toString("hex")): Promise<string> {
  const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");
  return `sha256$${salt}$${hash}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "sha256" || !salt || !expectedHex || !/^[a-f0-9]{64}$/i.test(expectedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = createHash("sha256").update(`${salt}:${password}`).digest();
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

type Session = { username: string; expiresAt: number };

function signature(payload: string): string {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string): string {
  const payload = Buffer.from(JSON.stringify({
    username,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
  })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function parseToken(token?: string): Session | null {
  if (!token) return null;
  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature) return null;
  const expectedSignature = Buffer.from(signature(payload));
  const actualSignature = Buffer.from(suppliedSignature);
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (!session.username || !Number.isInteger(session.expiresAt) || session.expiresAt <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  return parseToken(cookieStore.get(COOKIE_NAME)?.value);
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_SECONDS,
};
