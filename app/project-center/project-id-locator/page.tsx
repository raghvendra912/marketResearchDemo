import OpsHeader from "@/app/OpsHeader";
import { requireSession } from "@/lib/require-session";

export default async function ProjectIdLocatorPage() {
  const session = await requireSession();
  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <OpsHeader currentUser={session} activePage="project-id-locator" />
      <div className="mx-auto max-w-[1400px] px-4 py-5">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Project ID Locator</h1>
          <p className="mt-2 text-sm text-slate-600">
            This module is now routed and ready. Next step is to add ID-level history and supplier traceability here.
          </p>
        </section>
      </div>
    </main>
  );
}
