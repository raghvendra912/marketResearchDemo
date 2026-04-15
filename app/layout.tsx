import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import FeedbackWidget from "./FeedbackWidget";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "Survey Response Collector",
  description: "Public survey response collection module",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body className="font-sans antialiased bg-slate-50 text-slate-900 min-h-screen">
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
