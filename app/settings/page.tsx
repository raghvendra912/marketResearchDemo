import DashboardClient from "@/app/DashboardClient";
import { requireSession } from "@/lib/require-session";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await requireSession();
  if (session.role !== "admin") {
    redirect("/");
  }
  return <DashboardClient currentUser={session} activePage="settings" />;
}
