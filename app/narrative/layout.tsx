import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Narrative", template: "%s · Medicine Wheel" },
};

export default function NarrativeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
