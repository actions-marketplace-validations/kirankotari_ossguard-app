import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/**
 * Check that the repository has dependency review configured
 * (e.g. GitHub's dependency-review-action or Dependabot/Renovate).
 */
export const analyzeDependencyReview: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks["dependency-review"];
  if (!config.enabled) {
    return [
      {
        id: "dependency-review",
        name: "Dependency Review",
        status: "skip",
        severity: config.severity,
        message: "Check disabled",
      },
    ];
  }

  try {
    const { data: tree } = await ctx.octokit.git.getTree({
      owner: ctx.owner,
      repo: ctx.repo,
      tree_sha: ctx.headSha,
      recursive: "1",
    });

    // Check for Dependabot config
    const hasDependabot = tree.tree.some(
      (f) => f.path === ".github/dependabot.yml" || f.path === ".github/dependabot.yaml"
    );

    // Check for Renovate config
    const hasRenovate = tree.tree.some(
      (f) =>
        f.path === "renovate.json" ||
        f.path === "renovate.json5" ||
        f.path === ".renovaterc" ||
        f.path === ".renovaterc.json"
    );

    // Check for dependency-review-action in workflows
    let hasDependencyReview = false;
    const workflowFiles = tree.tree.filter(
      (f) =>
        f.path?.startsWith(".github/workflows/") &&
        (f.path.endsWith(".yml") || f.path.endsWith(".yaml"))
    );

    for (const file of workflowFiles) {
      if (!file.sha || !file.path) continue;

      const { data: blob } = await ctx.octokit.git.getBlob({
        owner: ctx.owner,
        repo: ctx.repo,
        file_sha: file.sha,
      });

      const content = Buffer.from(blob.content, "base64").toString("utf-8");
      if (content.includes("dependency-review-action")) {
        hasDependencyReview = true;
        break;
      }
    }

    const tools: string[] = [];
    if (hasDependabot) tools.push("Dependabot");
    if (hasRenovate) tools.push("Renovate");
    if (hasDependencyReview) tools.push("dependency-review-action");

    if (tools.length > 0) {
      return [
        {
          id: "dependency-review",
          name: "Dependency Review",
          status: "pass",
          severity: config.severity,
          message: `Dependency management: ${tools.join(", ")}`,
        },
      ];
    }

    return [
      {
        id: "dependency-review",
        name: "Dependency Review",
        status: config.severity === "error" ? "fail" : "warn",
        severity: config.severity,
        message:
          "No dependency review tool found. Consider adding Dependabot, Renovate, or dependency-review-action.",
      },
    ];
  } catch {
    return [
      {
        id: "dependency-review",
        name: "Dependency Review",
        status: "warn",
        severity: config.severity,
        message: "Could not check dependency review configuration",
      },
    ];
  }
};
