import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/**
 * Check that the repository has a CodeQL / SAST workflow configured.
 */
export const analyzeCodeQL: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks.codeql;
  if (!config.enabled) {
    return [
      {
        id: "codeql",
        name: "CodeQL / SAST",
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

      // Check for CodeQL or other SAST tool usage
      if (
        content.includes("github/codeql-action") ||
        content.includes("codeql-action/analyze") ||
        content.includes("codeql-action/init")
      ) {
        return [
          {
            id: "codeql",
            name: "CodeQL / SAST",
            status: "pass",
            severity: config.severity,
            message: `CodeQL configured in \`${file.path}\``,
            file: file.path,
          },
        ];
      }

      // Check for other SAST tools
      if (
        content.includes("semgrep") ||
        content.includes("sonarqube") ||
        content.includes("snyk")
      ) {
        return [
          {
            id: "codeql",
            name: "CodeQL / SAST",
            status: "pass",
            severity: config.severity,
            message: `SAST tool configured in \`${file.path}\``,
            file: file.path,
          },
        ];
      }
    }

    return [
      {
        id: "codeql",
        name: "CodeQL / SAST",
        status: config.severity === "error" ? "fail" : "warn",
        severity: config.severity,
        message:
          "No CodeQL or SAST workflow found. Consider adding static analysis.",
      },
    ];
  } catch {
    return [
      {
        id: "codeql",
        name: "CodeQL / SAST",
        status: "warn",
        severity: config.severity,
        message: "Could not analyze workflows for SAST configuration",
      },
    ];
  }
};
