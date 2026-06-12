import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { enterpriseApiBase, setAuthCookies } from "../_utils";

export async function POST() {
  const refreshToken = cookies().get("refreshToken")?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Missing refresh token" }, { status: 400 });
  }

  const response = await fetch(`${enterpriseApiBase}/api/enterprise/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error || "Refresh failed" }, { status: response.status });
  }

  setAuthCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    role: data.user?.role,
  });

  return NextResponse.json({ user: data.user });
}
