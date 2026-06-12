import LandingHero from "@/components/landing/LandingHero";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get("accessToken")?.value;
  const role = cookieStore.get("role")?.value || "ceo";

  if (!token) {
    return <LandingHero />;
  }

  redirect(`/dashboard/${role}`);
}
