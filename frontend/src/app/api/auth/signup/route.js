import { NextResponse } from "next/server";
import { enterpriseApiBase, setAuthCookies } from "../_utils";

export async function POST(request) {
  const payload = await request.json();
  const normalizedPayload = {
    email: payload.email,
    password: payload.password,
    firstName: payload.firstName,
    lastName: payload.lastName,
    role: payload.role,
  };
  const response = await fetch(`${enterpriseApiBase}/api/enterprise/auth/signup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(normalizedPayload),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error || "Signup failed" }, { status: response.status });
  }

  setAuthCookies({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    role: data.user?.role,
  });

  return NextResponse.json({ user: data.user });
}

