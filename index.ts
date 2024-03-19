import * as core from "@actions/core";
import * as github from "@actions/github";
import { components } from "@octokit/openapi-types";

export function isErrorWithMessage(error: unknown): error is Error {
  return error !== undefined && error !== null && typeof error === "object" && "message" in error;
}

async function main() {
  const ref = core.getInput("ref", { required: true });
  const sha = core.getInput("sha", { required: true });
  const deploymentPath = core.getInput("deploymentPath", { required: true, trimWhitespace: true });
  const deploymentEnvironment = core.getInput("deploymentEnvironment", { required: true, trimWhitespace: true });
  const deploymentName = core.getInput("deploymentName", { required: true, trimWhitespace: true });
  const packageName = core.getInput("packageName", { required: true, trimWhitespace: true });
  const packageVersion = core.getInput("packageVersion", { required: true, trimWhitespace: true });
  const percentage = parseInt(core.getInput("percentage", { required: true, trimWhitespace: true }), 10) | 0;
  const token = core.getInput("token", { required: true });

  if (isNaN(percentage) || percentage < 0 || percentage > 100) {
    throw new Error(`Invalid percentage ${JSON.stringify(core.getInput("percentage", { required: true }))}`);
  }

  // Check if the package was already deployed to the CDN
  try {
    const response = await fetch(`https://cdn.decentraland.org/${packageName}/${packageVersion}`, { method: "HEAD" });
    if (response.status >= 400) {
      throw new Error(`Package ${packageName}@${packageVersion} not found in the CDN`);
    }
  } catch (error) {
    throw new Error(
      `Failed to check if the package was deployed to the CDN: ${
        isErrorWithMessage(error) ? error.message : "Unknown error"
      }`
    );
  }

  const octokit = github.getOctokit(token, {
    previews: ["ant-man-preview", "flash-preview"],
  });

  const { owner, repo } = github.context.repo;

  const resp = await octokit.rest.repos.createDeployment({
    owner,
    repo,
    ref,
    environment: deploymentEnvironment,
    description: `Progressive deployment: ${deploymentName} in ${deploymentPath} ${deploymentEnvironment} at ${percentage}%`,
    auto_merge: false,
    required_contexts: [],
    // this task is handled by the webhooks-receiver
    task: "dcl/set-rollout",
    payload: {
      ref,
      sha,
      environment: deploymentEnvironment,
      path: deploymentPath,
      prefix: packageName,
      version: packageVersion,
      rolloutName: deploymentName,
      percentage,
    },
  });

  if (resp.status >= 400) {
    throw new Error("Failed to create a new deployment");
  }

  const data: components["schemas"]["deployment"] = resp.data as any;

  await octokit.rest.repos.createDeploymentStatus({
    repo,
    owner,
    deployment_id: data.id,
    environment_url: `https://decentraland.${deploymentEnvironment}/${deploymentPath}`,
    log_url: `https://github.com/${owner}/${repo}/actions/runs/${github.context.runId}`,
    state: "queued",
  });
}

main().catch(function (error) {
  core.setFailed(error.message);
  process.exit(1);
});
