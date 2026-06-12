import { NextResponse } from "next/server";
import { enterpriseApiBase, setAuthCookies } from "../_utils";

export async function POST(request) {
  try {
    const { accessToken } = await request.json();
    
    const response = await fetch(`${enterpriseApiBase}/api/enterprise/auth/google/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: accessToken }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || "Google login failed" }, { status: response.status });
    }

    setAuthCookies({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      role: data.user?.role,
    });

    return NextResponse.json({ user: data.user });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
