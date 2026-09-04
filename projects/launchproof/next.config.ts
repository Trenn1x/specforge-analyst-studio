import type { NextConfig } from "next";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const requestedBasePath = process.env.PAGES_BASE_PATH?.trim();
const explicitBasePath = requestedBasePath
  ? `/${requestedBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";
const basePath = explicitBasePath || (
  process.env.GITHUB_ACTIONS === "true" && repositoryName
    ? `/${repositoryName}`
    : ""
);

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  reactStrictMode: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
