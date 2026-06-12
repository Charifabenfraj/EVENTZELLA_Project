import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function DashboardIndex() {
  const role = cookies().get("role")?.value || "ceo";
  redirect(`/dashboard/${role}`);
}
