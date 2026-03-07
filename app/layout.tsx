import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "Medicine Wheel — Relational Research",
  description: "Interactive visual layer for the Medicine Wheel — ceremonies, Four Directions, relational web, and narrative arcs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <Navigation />
          <main className="min-h-screen pt-16">{children}</main>
          <footer className="border-t border-border px-6 py-4 text-center text-sm text-muted-foreground">
            &ldquo;Research is Ceremony&rdquo; — Shawn Wilson
          </footer>
          <Toaster richColors position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
