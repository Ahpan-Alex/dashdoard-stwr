import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.100.107", "192.168.100.103", "127.0.0.1"],
  turbopack: {
    root: dir,
  },
};

export default nextConfig;
