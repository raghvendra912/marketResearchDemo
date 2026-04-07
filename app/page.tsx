import DashboardClient from "./DashboardClient";
import { requireSession } from "@/lib/require-session";

export default async function HomePage() {
  const session = await requireSession();

  return <DashboardClient currentUser={session} activePage="home" />;
}
