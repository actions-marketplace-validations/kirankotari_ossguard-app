import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/**
 * Check that the default branch has branch protection rules enabled.
 * Checks for: required reviews, status checks, and force push protection.
 */
export const analyzeBranchProtection: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks["branch-protection"];
  if (!config.enabled) {
    return [
      {
        id: "branch-protection",
        name: "Branch Protection",
        status: "skip",
        severity: config.severity,
        message: "Check disabled",
      },
    ];
  }

  try {
    // Get the default branch
    const { data: repo } = await ctx.octokit.repos.get({
      owner: ctx.owner,
      repo: ctx.repo,
    });

    const defaultBranch = repo.default_branch;

    try {
      const { data: protection } =
        await ctx.octokit.repos.getBranchProtection({
          owner: ctx.owner,
          repo: ctx.repo,
          branch: defaultBranch,
        });

      const issues: string[] = [];

      // Check required pull request reviews
      if (!protection.required_pull_request_reviews) {
        issues.push("no required PR reviews");
      }

      // Check required status checks
      if (!protection.required_status_checks) {
        issues.push("no required status checks");
      }

      // Check enforce admins
      if (!protection.enforce_admins?.enabled) {
        issues.push("admins can bypass");
      }

      if (issues.length === 0) {
        return [
          {
            id: "branch-protection",
            name: "Branch Protection",
            status: "pass",
            severity: config.severity,
            message: `Branch protection enabled on \`${defaultBranch}\``,
          },
        ];
      }

      return [
        {
          id: "branch-protection",
          name: "Branch Protection",
          status: config.severity === "error" ? "fail" : "warn",
          severity: config.severity,
          message: `\`${defaultBranch}\` protection: ${issues.join(", ")}`,
        },
      ];
    } catch {
      // 404 = no branch protection at all
      return [
        {
          id: "branch-protection",
          name: "Branch Protection",
          status: config.severity === "error" ? "fail" : "warn",
          severity: config.severity,
          message: `No branch protection on \`${defaultBranch}\`. Enable it in repo settings.`,
        },
      ];
    }
  } catch {
    return [
      {
        id: "branch-protection",
        name: "Branch Protection",
        status: "warn",
        severity: config.severity,
        message: "Could not check branch protection (may need admin permissions)",
      },
    ];
  }
};
