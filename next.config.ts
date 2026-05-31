import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "tqmxkpptpyufzjxtcwzs.supabase.co",
      },
    ],
  },
};

export default nextConfig;
