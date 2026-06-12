import { NextResponse } from "next/server";
import { enterpriseApiBase } from "../../auth/_utils";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const accessToken = cookies().get("accessToken")?.value;
    const response = await fetch(`${enterpriseApiBase}/api/enterprise/ai/top-providers/`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json"
      },
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error }, { status: response.status });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
