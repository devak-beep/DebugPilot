import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@neondatabase/serverless", "@prisma/adapter-neon", "nodemailer", "bcryptjs", "ws"],
};

export default nextConfig;
