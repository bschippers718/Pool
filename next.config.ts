import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phone testing over LAN in dev (Next blocks cross-origin dev assets by default).
  allowedDevOrigins: ["10.0.0.233", "localhost"],
};

export default nextConfig;
