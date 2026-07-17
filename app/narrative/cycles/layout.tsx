import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cycles" };

export default function CyclesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
