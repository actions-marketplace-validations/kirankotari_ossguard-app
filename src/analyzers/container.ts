import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/**
 * Check Dockerfile best practices:
 * - Base image pinned to digest
 * - No use of latest tag
 * - USER instruction present (non-root)
 */
export const analyzeContainer: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks.container;
  if (!config.enabled) {
    return [
      {
        id: "container",
        name: "Container Security",
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

    const dockerfiles = tree.tree.filter(
      (f) =>
        f.path &&
        (f.path === "Dockerfile" ||
          f.path.endsWith("/Dockerfile") ||
          f.path.match(/Dockerfile\./))
    );

    if (dockerfiles.length === 0) {
      return [
        {
          id: "container",
          name: "Container Security",
          status: "pass",
          severity: config.severity,
          message: "No Dockerfile found",
        },
      ];
    }

    const issues: string[] = [];

    for (const file of dockerfiles) {
      if (!file.sha || !file.path) continue;

      const { data: blob } = await ctx.octokit.git.getBlob({
        owner: ctx.owner,
        repo: ctx.repo,
        file_sha: file.sha,
      });

      const content = Buffer.from(blob.content, "base64").toString("utf-8");
      const lines = content.split("\n");

      let hasUser = false;

      for (const line of lines) {
        const trimmed = line.trim();

        // Check FROM instructions
        if (trimmed.toUpperCase().startsWith("FROM ")) {
          const image = trimmed.substring(5).trim().split(/\s+/)[0];
          if (image.includes(":latest")) {
            issues.push(`\`${file.path}\`: uses \`:latest\` tag`);
          } else if (!image.includes("@sha256:") && !image.includes("@")) {
            // Not pinned to digest (allow scratch and build stages)
            if (image !== "scratch" && !image.startsWith("$")) {
              issues.push(`\`${file.path}\`: base image not pinned to digest`);
            }
          }
        }

        if (trimmed.toUpperCase().startsWith("USER ")) {
          hasUser = true;
        }
      }

      if (!hasUser) {
        issues.push(`\`${file.path}\`: no USER instruction (runs as root)`);
      }
    }

    if (issues.length === 0) {
      return [
        {
          id: "container",
          name: "Container Security",
          status: "pass",
          severity: config.severity,
          message: "Dockerfile follows best practices",
        },
      ];
    }

    return [
      {
        id: "container",
        name: "Container Security",
        status: config.severity === "error" ? "fail" : "warn",
        severity: config.severity,
        message: issues.slice(0, 3).join("; "),
      },
    ];
  } catch {
    return [
      {
        id: "container",
        name: "Container Security",
        status: "warn",
        severity: config.severity,
        message: "Could not analyze Dockerfiles",
      },
    ];
  }
};
