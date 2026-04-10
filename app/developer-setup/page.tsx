import DashboardClient from "@/app/DashboardClient";
import { requireSession } from "@/lib/require-session";

export default async function DeveloperSetupPage() {
  const session = await requireSession();
  return <DashboardClient currentUser={session} activePage="developer-setup" />;
}

