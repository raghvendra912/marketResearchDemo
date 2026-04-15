"use client";

import { motion } from "framer-motion";
import { Sliders, Shield, Bell, Zap } from "lucide-react";

export default function SystemSettings() {
  const categories = [
    { id: "general", icon: Sliders, title: "General Variables" },
    { id: "security", icon: Shield, title: "Security Protocols" },
    { id: "alerts", icon: Bell, title: "Global Alerts" },
    { id: "automation", icon: Zap, title: "Agent Automations" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex gap-6">
      {/* Sidebar Nav */}
      <div className="w-64 shrink-0 rounded-xl border border-slate-200/60 bg-white/80 p-3 shadow-sm backdrop-blur-lg h-fit">
        {categories.map((cat, i) => (
          <button 
            key={cat.id} 
            className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              i === 0 ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.title}
          </button>
        ))}
      </div>

      {/* Main Settings Panel */}
      <div className="flex-1 rounded-xl border border-slate-200/60 bg-white/80 p-8 shadow-sm backdrop-blur-lg">
        <h3 className="text-xl font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">General Variables</h3>
        
        <div className="space-y-6 max-w-2xl">
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">Platform Default Margin (%)</label>
            <input type="number" defaultValue="25" className="rounded-md border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
            <p className="text-xs text-slate-500">The baseline profit margin expected across auto-routed suppliers.</p>
          </div>
          
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700">System Timezone</label>
            <select className="rounded-md border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option>UTC (Coordinated Universal Time)</option>
              <option>EST (Eastern Standard Time)</option>
              <option>PST (Pacific Standard Time)</option>
            </select>
          </div>

          <div className="pt-6">
            <button className="rounded bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors">
              Update Variables
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
