import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono, Work_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-bricolage",
});
const work = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-work",
});
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-dm-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://productosnutoynola.com"),
  title: "Nuto & Nola · Granola artesanal",
  description:
    "Granola Cinnamon Roll, Melted Cocoa y Berries. Prepara tus snacks, desayunos y postres sin sentirte culpable. Envío gratis en Bogotá desde $100.000.",
  icons: { icon: "/img/logo.png" },
  openGraph: { images: ["/img/flatlay.jpg"], locale: "es_CO", siteName: "Nuto & Nola" },
};

export const viewport: Viewport = { themeColor: "#5F1637" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${bricolage.variable} ${work.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
