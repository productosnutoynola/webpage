import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Panel de administración · Nuto & Nola",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-crema text-tinta">{children}</div>;
}
