import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { enterpriseApiBase } from "../_utils";

export async function GET() {
  const accessToken = cookies().get("accessToken")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const response = await fetch(`${enterpriseApiBase}/api/enterprise/users/me/`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    return NextResponse.json({ error: data.error || "Not authenticated" }, { status: response.status });
  }

  return NextResponse.json({ user: data.user });
}

