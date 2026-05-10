import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/**
 * Check that the repository has a LICENSE file.
 */
export const analyzeLicense: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks.license;
  if (!config.enabled) {
    return [
      {
        id: "license",
        name: "License",
        status: "skip",
        severity: config.severity,
        message: "Check disabled",
      },
    ];
  }

  try {
    const { data } = await ctx.octokit.rest.licenses.getForRepo({
      owner: ctx.owner,
      repo: ctx.repo,
    });

    if (data.license && data.license.spdx_id !== "NOASSERTION") {
      return [
        {
          id: "license",
          name: "License",
          status: "pass",
          severity: config.severity,
          message: `${data.license.spdx_id} license detected`,
        },
      ];
    }
  } catch {
    // API error, fall through
  }

  // Fallback: check for common license file names
  const paths = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"];
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
          id: "license",
          name: "License",
          status: "pass",
          severity: config.severity,
          message: `License file found at \`${path}\``,
        },
      ];
    } catch {
      // Not found, try next
    }
  }

  return [
    {
      id: "license",
      name: "License",
      status: config.severity === "error" ? "fail" : "warn",
      severity: config.severity,
      message: "No LICENSE file found. Open source projects should include a license.",
    },
  ];
};
