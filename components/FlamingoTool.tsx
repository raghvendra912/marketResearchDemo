"use client";

import { motion } from "framer-motion";
import { UploadCloud, FileType, CheckCircle2 } from "lucide-react";

export default function FlamingoTool() {
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-3xl mx-auto">
      <div className="text-center space-y-2 mt-8">
        <h2 className="text-2xl font-bold text-slate-900">Flamingo De-Duplication Tool</h2>
        <p className="text-slate-500">Upload Respondent IDs to cross-reference against universal completes.</p>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-12 text-center transition-colors hover:bg-blue-50 cursor-pointer">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <UploadCloud className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-slate-800">Drag & Drop .CSV Files</h3>
        <p className="mt-1 text-sm text-slate-500">or click to browse from your computer. Max file size: 50MB.</p>
        
        <button className="mt-6 rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50">
          Select Files
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-800 mb-4 border-b border-slate-100 pb-2">Recent Operations</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 select-none">
            <div className="flex items-center gap-3">
              <FileType className="h-5 w-5 text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-slate-700">Project_Alpha_Completes.csv</p>
                <p className="text-xs text-slate-500">12,450 rows processed • 2 mins ago</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">100% Clean</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
