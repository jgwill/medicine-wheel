import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ceremonies" };

export default function CeremoniesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
