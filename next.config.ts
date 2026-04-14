import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["nodemailer", "bcryptjs"],
};

export default nextConfig;
