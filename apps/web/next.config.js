/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@repo/client", "@repo/contracts", "@repo/ui"],
};

export default nextConfig;
