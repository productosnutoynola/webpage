import type { NextConfig } from "next";

// Fotos subidas desde el panel: bucket público "productos" de Supabase Storage.
const supabase = process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL) : null;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: supabase
      ? [{ protocol: supabase.protocol.replace(":", "") as "http" | "https", hostname: supabase.hostname, port: supabase.port, pathname: "/storage/v1/object/public/**" }]
      : [],
  },
  experimental: {
    // Las fotos se comprimen en el navegador antes de subirlas (≤ ~1 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
  async redirects() {
    // Sabores renombrados (oct 2026): conserva enlaces ya compartidos.
    return [
      { source: "/producto/cacao-crunch", destination: "/producto/melted-cocoa", permanent: true },
      { source: "/producto/frutos-rojos", destination: "/producto/berries", permanent: true },
    ];
  },
};

export default nextConfig;
