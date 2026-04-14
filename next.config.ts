import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql", "nodemailer", "bcryptjs"],
};

export default nextConfig;
