import { NextResponse } from "next/server";
import { enterpriseApiBase, setAuthCookies } from "../_utils";

export async function POST(request) {
  const payload = await request.json();
  const response = await fetch(`${enterpriseApiBase}/api/enterprise/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error || "Login failed" }, { status: response.status });
  }

  setAuthCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    role: data.user?.role,
  });

  return NextResponse.json({ user: data.user });
}

