import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/pwa/register";
import "./globals.css";
export const metadata: Metadata = {
  title: "DayFlow — Plan tomorrow tonight",
  description: "A calm, tomorrow-first personal planner.",
  applicationName: "DayFlow",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DayFlow" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};
export const viewport: Viewport = {
  themeColor: "#334d43",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
