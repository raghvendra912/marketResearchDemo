import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Live", projects: 12, fill: "#3b82f6" },
  { name: "Pending", projects: 5, fill: "#f59e0b" },
  { name: "Paused", projects: 2, fill: "#ef4444" },
  { name: "Id Awaited", projects: 8, fill: "#8b5cf6" },
];

export default function DashboardCharts() {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/80 p-5 shadow-sm backdrop-blur-lg mb-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-800">Project Workflow Status Overview</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
            <Tooltip
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            />
            <Bar dataKey="projects" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
