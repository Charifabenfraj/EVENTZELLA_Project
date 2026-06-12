import { cookies } from "next/headers";

export const enterpriseApiBase =
  process.env.ENTERPRISE_API_BASE_URL ||
  process.env.NEXT_PUBLIC_ENTERPRISE_API_BASE_URL ||
  "http://localhost:8000";

export function setAuthCookies({ accessToken, refreshToken, role }) {
  const cookieStore = cookies();
  const isProd = process.env.NODE_ENV === "production";

  if (accessToken) {
    cookieStore.set("accessToken", accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 15,
    });
  }

  if (refreshToken) {
    cookieStore.set("refreshToken", refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  if (role) {
    cookieStore.set("role", role, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }
}

export function clearAuthCookies() {
  const cookieStore = cookies();
  ["accessToken", "refreshToken", "role"].forEach((name) => {
    cookieStore.set(name, "", { path: "/", maxAge: 0 });
  });
}
