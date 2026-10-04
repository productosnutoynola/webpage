import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Sabores renombrados (oct 2026): conserva enlaces ya compartidos.
    return [
      { source: "/producto/cacao-crunch", destination: "/producto/melted-cocoa", permanent: true },
      { source: "/producto/frutos-rojos", destination: "/producto/berries", permanent: true },
    ];
  },
};

export default nextConfig;
