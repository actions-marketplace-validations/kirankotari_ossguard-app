import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/**
 * Check that the repository has a SECURITY.md file
 * (vulnerability disclosure policy).
 */
export const analyzeSecurityPolicy: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks["security-policy"];
  if (!config.enabled) {
    return [
      {
        id: "security-policy",
        name: "Security Policy",
        status: "skip",
        severity: config.severity,
        message: "Check disabled",
      },
    ];
  }

  const paths = [
    "SECURITY.md",
    ".github/SECURITY.md",
    "docs/SECURITY.md",
    "security.md",
  ];

  for (const path of paths) {
    try {
      await ctx.octokit.repos.getContent({
        owner: ctx.owner,
        repo: ctx.repo,
        path,
        ref: ctx.headSha,
      });
      return [
        {
          id: "security-policy",
          name: "Security Policy",
          status: "pass",
          severity: config.severity,
          message: `SECURITY.md found at \`${path}\``,
          file: path,
        },
      ];
    } catch {
      // File not found at this path, try next
    }
  }

  return [
    {
      id: "security-policy",
      name: "Security Policy",
      status: config.severity === "error" ? "fail" : "warn",
      severity: config.severity,
      message:
        "No SECURITY.md found. Add a vulnerability disclosure policy. Run `ossguard init .` to generate one.",
    },
  ];
};
