import OpsHeader from "@/app/OpsHeader";
import { requireSession } from "@/lib/require-session";

export default async function DfiqReportPage() {
  const session = await requireSession();
  return (
    <main className="min-h-screen bg-[#eef3f8] text-slate-900">
      <OpsHeader currentUser={session} activePage="dfiq-report" />
      <div className="mx-auto max-w-[1400px] px-4 py-5">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold">DFIQ Report</h1>
          <p className="mt-2 text-sm text-slate-600">
            This report route is active. We can now add fraud-defense and digital fingerprinting analytics widgets here.
          </p>
        </section>
      </div>
    </main>
  );
}
