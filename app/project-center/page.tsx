import DashboardClient from "@/app/DashboardClient";
import { requireSession } from "@/lib/require-session";

export default async function ProjectCenterPage() {
  const session = await requireSession();
  return <DashboardClient currentUser={session} activePage="project-center" />;
}
