import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: {
    default: "GTSDB Cloud — Managed Timeseries Database",
    template: "%s · GTSDB Cloud",
  },
  description:
    "GTSDB Cloud is a freemium managed timeseries database platform built on the MIT-licensed GTSDB engine. Sub-millisecond reads, WAL-first storage, and a beautiful cloud console.",
  keywords: [
    "timeseries",
    "database",
    "GTSDB",
    "IoT",
    "managed database",
    "DBaaS",
    "InfluxDB alternative",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
