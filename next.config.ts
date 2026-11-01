import type { NextConfig } from "next";

// GitHub Pages: statischer Export. Bei Projektseiten ohne eigene Domain
// (https://<user>.github.io/<repo>) BASE_PATH=/<repo> setzen.
const basePath = process.env.BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
