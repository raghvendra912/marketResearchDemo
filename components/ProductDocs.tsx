"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, BookOpen } from "lucide-react";

export default function ProductDocs() {
  const [openSection, setOpenSection] = useState<number | null>(0);

  const features = [
    {
      id: 0,
      title: "Core Project Dashboard",
      description: "A centralized hub to track all active market research surveys. It monitors your incidence rates (IR), abandon rates (AB), and cost per interview (CPI). Interactive charts help you visualize traffic flow between 'Live', 'Pending', and 'Paused' projects."
    },
    {
      id: 1,
      title: "Supplier & Routing Intelligence",
      description: "Direct API integrations with sample providers like Cint and Prime Sample. You can set global default margins, track supplier CPIs alongside client CPI profits, and assign multiple suppliers visually per project without touching code."
    },
    {
      id: 2,
      title: "Client Center (CRM)",
      description: "Monitor your active B2B clients, assign sales representatives, and track global revenue directly through the project lifecycle. Register new clients on the fly with custom onboarding metrics."
    },
    {
      id: 3,
      title: "Survey Redirect Engine (End Links)",
      description: "An automated URL builder that generates universal routing links. Securely pass identification variables (?rid=[ID]) while categorizing user drops into Complete, Terminate, Overquota, and Security statuses."
    },
    {
      id: 4,
      title: "Flamingo De-Duplication Tool",
      description: "A dropzone-enabled interface designed to upload CSV files of respondent IDs. It rapidly cross-references your external completes with internal tracking to ensure you don't overpay for duplicated data."
    },
    {
      id: 5,
      title: "AI-Powered Automation",
      description: "Leverages an integrated OpenAI Codex system. Admins can approve user feedback, which automatically dispatches an AI agent to write code patches, create pull requests, and deploy structural updates to your Vercel instance."
    }
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      <div className="mt-4 mb-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 mb-4">
          <BookOpen className="h-6 w-6 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Platform Documentation</h2>
        <p className="mt-2 text-slate-600 text-lg">
          Explore the robust suite of modules powering your Market Research Operations system.
        </p>
      </div>

      <div className="space-y-4">
        {features.map((feature) => {
          const isOpen = openSection === feature.id;
          
          return (
            <div key={feature.id} className="rounded-xl border border-slate-200/60 bg-white/80 overflow-hidden shadow-sm backdrop-blur-lg transition-all">
              <button 
                onClick={() => setOpenSection(isOpen ? null : feature.id)}
                className="flex w-full items-center justify-between p-5 text-left bg-transparent hover:bg-slate-50/50 transition-colors"
                type="button"
              >
                <h3 className="text-lg font-bold text-slate-900">{feature.title}</h3>
                <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-slate-400">
                  <ChevronDown className="h-5 w-5" />
                </motion.div>
              </button>
              
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="border-t border-slate-100 p-5 pt-4">
                      <p className="text-slate-600 font-medium leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
