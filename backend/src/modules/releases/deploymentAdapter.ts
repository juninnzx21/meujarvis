export type DeploymentRequest = { candidateId: string; commitSha: string; artifactDigest: string; target: "staging" | "production" };

/** Deployment is intentionally unavailable until separately authorized operational gates exist. */
export const deploymentAdapter = {
  enabled: false as const,
  async deploy(_request: DeploymentRequest): Promise<never> {
    throw new Error("RELEASE_DEPLOY_DISABLED");
  }
};
