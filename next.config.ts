import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep skill/runtime logs (.cursor/**) out of the webpack watcher so
  // verify-aussie-eats/.run/log growth cannot thrash Fast Refresh.
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          "**/.git/**",
          "**/node_modules/**",
          "**/.next/**",
          "**/.cursor/**",
        ],
      };
    }
    return config;
  },
};

export default nextConfig;
