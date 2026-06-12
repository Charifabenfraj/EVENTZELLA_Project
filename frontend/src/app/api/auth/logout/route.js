import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { clearAuthCookies, enterpriseApiBase } from "../_utils";

export async function POST() {
  const refreshToken = cookies().get("refreshToken")?.value;
  if (refreshToken) {
    await fetch(`${enterpriseApiBase}/api/enterprise/auth/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {});
  }

  clearAuthCookies();
  return NextResponse.json({ status: "ok" });
}
