"use client";

import { motion } from "framer-motion";
import { Link2, Copy, Save } from "lucide-react";

export default function EndLinkManager() {
  const routes = [
    { label: "Complete Route", color: "text-emerald-600 bg-emerald-50", link: "https://yourdomain.com/l/[slug]?status=complete&rid=[ID]" },
    { label: "Terminate Route", color: "text-rose-600 bg-rose-50", link: "https://yourdomain.com/l/[slug]?status=terminate&rid=[ID]" },
    { label: "OverQuota Route", color: "text-amber-600 bg-amber-50", link: "https://yourdomain.com/l/[slug]?status=quotafull&rid=[ID]" },
    { label: "Security Route", color: "text-purple-600 bg-purple-50", link: "https://yourdomain.com/l/[slug]?status=security&rid=[ID]" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 flex flex-col items-center">
      <div className="w-full max-w-4xl text-center space-y-2 mt-4">
        <h2 className="text-2xl font-bold text-slate-900">Survey Redirect Engine</h2>
        <p className="text-slate-500">Configure global endpoints for your supplier traffic.</p>
      </div>

      <div className="w-full max-w-4xl rounded-xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-lg">
        <div className="space-y-6">
          {routes.map((route, i) => (
            <div key={i} className="flex flex-col gap-2">
              <label className={`w-fit px-3 py-1 rounded-full text-xs font-semibold ${route.color}`}>
                {route.label}
              </label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={route.link} 
                  readOnly
                  className="flex-1 rounded-md border border-slate-200 bg-slate-50 px-4 py-2 font-mono text-sm text-slate-600 outline-none"
                />
                <button className="flex items-center gap-2 rounded bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 transition-colors">
                  <Copy className="h-4 w-4" /> Copy
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
          <button className="flex items-center gap-2 rounded bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition-colors shadow-sm">
            <Save className="h-4 w-4" /> Save Configuration
          </button>
        </div>
      </div>
    </motion.div>
  );
}
