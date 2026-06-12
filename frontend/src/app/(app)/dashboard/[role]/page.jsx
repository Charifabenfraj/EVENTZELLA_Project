import DashboardClient from "@/components/dashboard/DashboardClient";

export default function RoleDashboardPage({ params }) {
  return <DashboardClient role={params.role} />;
}
