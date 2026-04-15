"use client";

import { motion } from "framer-motion";
import { Plus, Link, Settings } from "lucide-react";

export default function SupplierCenter() {
  const suppliers = [
    { id: 1, name: "Cint", status: "Active via API", margin: "25%", projects: 45 },
    { id: 2, name: "Prime Sample", status: "Active via API", margin: "30%", projects: 12 },
    { id: 3, name: "Toluna", status: "Manual", margin: "15%", projects: 3 },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Supplier Center</h2>
          <p className="text-sm text-slate-500">Manage sample providers and global margin settings.</p>
        </div>
        <button className="flex items-center gap-2 rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800 transition-colors">
          <Plus className="h-4 w-4" />
          Add Supplier
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-lg">
        <table className="min-w-full text-sm divide-y divide-slate-200">
          <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500 font-medium">
            <tr>
              <th className="px-5 py-4">Supplier Name</th>
              <th className="px-5 py-4">Status / Integration</th>
              <th className="px-5 py-4">Default Margin</th>
              <th className="px-5 py-4">Active Projects</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suppliers.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4 font-semibold text-slate-900">{s.name}</td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${s.status === 'Manual' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-4">{s.margin}</td>
                <td className="px-5 py-4">{s.projects}</td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50"><Link className="h-4 w-4" /></button>
                    <button className="p-1.5 text-slate-400 hover:text-blue-600 rounded bg-slate-50"><Settings className="h-4 w-4" /></button>
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
