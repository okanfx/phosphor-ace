import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Fully static: the game is a client-side canvas experience, so there is
  // nothing for the serverless runtime to do beyond serving the shell.
  output: "standalone",
};

export default nextConfig;
