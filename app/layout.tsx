import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import FeedbackWidget from "./FeedbackWidget";

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
    <html lang="en">
      <body>
        {children}
        <FeedbackWidget />
      </body>
    </html>
  );
}
