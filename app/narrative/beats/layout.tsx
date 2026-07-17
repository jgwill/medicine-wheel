import type { Metadata } from "next";

export const metadata: Metadata = { title: "Beats" };

export default function BeatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
