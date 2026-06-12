import { NextResponse } from "next/server";
import { enterpriseApiBase } from "../_utils";

export async function POST(request) {
  const payload = await request.json();
  const response = await fetch(`${enterpriseApiBase}/api/enterprise/auth/reset-password/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error || "Reset failed" }, { status: response.status });
  }

  return NextResponse.json(data);
}
