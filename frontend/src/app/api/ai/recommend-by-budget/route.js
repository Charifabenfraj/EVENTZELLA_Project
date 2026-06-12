import { NextResponse } from "next/server";
import { enterpriseApiBase } from "../../auth/_utils";

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await fetch(`${enterpriseApiBase}/api/enterprise/ai/recommend-by-budget/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error }, { status: response.status });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
