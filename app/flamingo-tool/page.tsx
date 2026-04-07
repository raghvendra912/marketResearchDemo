import DashboardClient from "@/app/DashboardClient";
import { requireSession } from "@/lib/require-session";

export default async function FlamingoToolPage() {
  const session = await requireSession();
  return <DashboardClient currentUser={session} activePage="flamingo-tool" />;
}
