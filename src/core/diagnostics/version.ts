import type { DeploymentInfo } from "@/core/diagnostics/types";

export function getDeploymentInfo(): DeploymentInfo {
  const gitCommit =
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ||
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GIT_COMMIT?.trim() ||
    "unknown";

  const buildTimestamp =
    process.env.RAILWAY_BUILD_TIME?.trim() ||
    process.env.BUILD_TIMESTAMP?.trim() ||
    process.env.RAILWAY_DEPLOYMENT_CREATED_AT?.trim() ||
    "unknown";

  return {
    gitCommit,
    buildTimestamp,
    nodeVersion: process.version,
    version: process.env.npm_package_version?.trim() || "0.1.0",
  };
}
