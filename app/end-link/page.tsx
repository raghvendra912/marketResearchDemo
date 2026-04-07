import DashboardClient from "@/app/DashboardClient";
import { requireSession } from "@/lib/require-session";

export default async function EndLinkPage() {
  const session = await requireSession();
  return <DashboardClient currentUser={session} activePage="end-link" />;
}
