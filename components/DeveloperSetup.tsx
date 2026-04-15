"use client";

import { motion } from "framer-motion";
import { DownloadCloud, TerminalSquare, RefreshCw, Send, GitPullRequest } from "lucide-react";

export default function DeveloperSetup() {
  const steps = [
    {
      id: 1,
      icon: <DownloadCloud className="h-6 w-6 text-blue-600" />,
      title: "1. Download the Codebase",
      desc: "Get a local copy of the project onto your computer.",
      commands: ["git clone https://github.com/raghvendra912/marketResearchDemo.git", "cd marketResearchDemo"],
    },
    {
      id: 2,
      icon: <TerminalSquare className="h-6 w-6 text-emerald-600" />,
      title: "2. Install Dependencies",
      desc: "Your computer needs to download the building blocks of this project (like React and Tailwind).",
      commands: ["npm install"],
    },
    {
      id: 3,
      icon: <RefreshCw className="h-6 w-6 text-purple-600" />,
      title: "3. Run the App Locally",
      desc: "Start a local server so you can view the application in your web browser.",
      commands: ["npm run dev"],
      note: "Open http://localhost:3000 in your browser to see the app running!",
    },
    {
      id: 4,
      icon: <Send className="h-6 w-6 text-amber-600" />,
      title: "4. Save Your Changes",
      desc: "Once you edit files in VS Code, you must stage and commit them to save versions.",
      commands: ["git add .", 'git commit -m "Describe your changes here"'],
    },
    {
      id: 5,
      icon: <GitPullRequest className="h-6 w-6 text-rose-600" />,
      title: "5. Upload to GitHub",
      desc: "Push your saved work back up to the cloud repository.",
      commands: ["git push"],
      note: "Vercel will usually detect this automatically and deploy your new updates live!",
    },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto space-y-6">
      <div className="mt-4 mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Developer Setup Guide</h2>
        <p className="mt-2 text-slate-600 text-lg">
          Welcome to the team! Follow this step-by-step guide to get the platform running on your system, even if you are not deeply technical.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step) => (
          <div key={step.id} className="rounded-2xl border border-slate-200/60 bg-white/80 p-6 shadow-sm backdrop-blur-lg flex gap-6 items-start">
            <div className="rounded-full bg-slate-50 p-3 shrink-0 ring-1 ring-slate-100 shadow-sm">
              {step.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="text-slate-600 mt-1">{step.desc}</p>
              
              <div className="mt-4 rounded-lg bg-slate-900 p-4 font-mono text-sm shadow-inner overflow-x-auto">
                <div className="flex flex-col gap-2">
                  {step.commands.map((cmd, idx) => (
                    <div key={idx} className="flex gap-3">
                      <span className="text-slate-500 select-none">$</span>
                      <span className="text-emerald-400 font-medium whitespace-nowrap">{cmd}</span>
                    </div>
                  ))}
                </div>
              </div>

              {step.note && (
                <div className="mt-4 rounded border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800 font-medium">
                  💡 {step.note}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
