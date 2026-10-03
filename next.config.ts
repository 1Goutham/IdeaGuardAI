import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  agentRules: false,
};

// Enables "use workflow" / "use step" for durable background analysis runs.
export default withWorkflow(nextConfig);
