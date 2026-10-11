import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/components/pwa/register";
import "./globals.css";
import "./planner.css";
import "./planner-timeline.css";
import { ThemeProvider } from "@/components/theme-provider";
export const metadata: Metadata = {
  title: "DayFlow — Plan tomorrow tonight",
  description: "A calm, tomorrow-first personal planner.",
  applicationName: "DayFlow",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "DayFlow" },
  icons: {
    icon: "/icons/dayflow-mark.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};
export const viewport: Viewport = {
  themeColor: "#7954b3",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider>
          {children}
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
