import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Platform",
  description: "Academic planning, transfer tracking, and networking for community college students.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
