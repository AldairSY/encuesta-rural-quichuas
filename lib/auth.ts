import { cookies } from "next/headers";
import { sb, ApiError } from "./server";
import type { Profile } from "./types";
export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: { id: string };
}
export async function authContext() {
  const jar = await cookies();
  let token = jar.get("rural_access")?.value;
  if (!token) throw new ApiError(401, "AUTH", "Inicia sesión para continuar.");
  let user;
  try {
    user = await sb<{ id: string }>("/auth/v1/user", {}, token);
  } catch {
    const refresh = jar.get("rural_refresh")?.value;
    if (!refresh)
      throw new ApiError(
        401,
        "AUTH",
        "Tu sesión terminó. Inicia sesión nuevamente.",
      );
    try {
      const session = await sb<AuthSession>(
        "/auth/v1/token?grant_type=refresh_token",
        { method: "POST", body: JSON.stringify({ refresh_token: refresh }) },
      );
      await setSession(session);
      token = session.access_token;
      user = session.user;
    } catch {
      throw new ApiError(
        401,
        "AUTH",
        "Tu sesión terminó. Inicia sesión nuevamente.",
      );
    }
  }
  const rows = await sb<Profile[]>(
    `/rest/v1/profiles?select=id,nombre,rol,activo&id=eq.${encodeURIComponent(user.id)}&activo=eq.true`,
    {},
    token,
  );
  if (!rows.length)
    throw new ApiError(
      403,
      "ROLE",
      "Tu cuenta no tiene un rol administrativo activo.",
    );
  return { token: token!, profile: rows[0] as Profile };
}
export async function setSession(session: {
  access_token: string;
  refresh_token: string;
}) {
  const jar = await cookies();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
  jar.set("rural_access", session.access_token, options);
  jar.set("rural_refresh", session.refresh_token, options);
}
export async function clearSession() {
  const jar = await cookies();
  jar.delete("rural_access");
  jar.delete("rural_refresh");
}
