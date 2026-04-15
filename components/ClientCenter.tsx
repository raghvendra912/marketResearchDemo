"use client";

import { motion } from "framer-motion";
import { Plus, User, Activity } from "lucide-react";

export default function ClientCenter() {
  const clients = [
    { id: 1, name: "Ipsos Market Solutions", reps: "John Doe", revenue: "$45,000", projects: 12 },
    { id: 2, name: "Nielsen Corp", reps: "Sarah Smith", revenue: "$120,400", projects: 34 },
    { id: 3, name: "Kantar Insights", reps: "Alex Johnson", revenue: "$8,500", projects: 2 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Client Center</h2>
          <p className="text-sm text-slate-500">Manage your active client base and global CRM analytics.</p>
        </div>
        <button className="flex items-center gap-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Plus className="h-4 w-4" />
          Register Client
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-lg">
        <table className="min-w-full text-sm divide-y divide-slate-200">
          <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500 font-medium">
            <tr>
              <th className="px-5 py-4">Client Name</th>
              <th className="px-5 py-4">Account Rep</th>
              <th className="px-5 py-4">Total Revenue (YTD)</th>
              <th className="px-5 py-4">Active Projects</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 font-semibold text-slate-900">{c.name}</td>
                <td className="px-5 py-4">{c.reps}</td>
                <td className="px-5 py-4 text-emerald-700 font-medium">{c.revenue}</td>
                <td className="px-5 py-4">{c.projects}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50"><User className="h-4 w-4" /></button>
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50"><Activity className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
