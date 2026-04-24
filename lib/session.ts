import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "pr_session";

function secretKey() {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  id: string;
  role: "ADMIN" | "MEMBER";
  name: string;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const id = payload.sub;
    const role = payload.role;
    const name = payload.name;
    if (!id || (role !== "ADMIN" && role !== "MEMBER") || typeof name !== "string") {
      return null;
    }
    return { id, role, name };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}
