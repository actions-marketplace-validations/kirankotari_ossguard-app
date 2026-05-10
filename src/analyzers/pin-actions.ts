import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/**
 * Check that GitHub Actions in workflow files are pinned to commit SHAs,
 * not mutable tags like @v4 or @main.
 */
export const analyzePinActions: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks["pin-actions"];
  if (!config.enabled) {
    return [
      {
        id: "pin-actions",
        name: "Dependency Pinning",
        status: "skip",
        severity: config.severity,
        message: "Check disabled",
      },
    ];
  }

  const results: CheckResult[] = [];

  try {
    // Get workflow files from the PR head
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

    if (workflowFiles.length === 0) {
      results.push({
        id: "pin-actions",
        name: "Dependency Pinning",
        status: "pass",
        severity: config.severity,
        message: "No workflow files found",
      });
      return results;
    }

    let unpinnedCount = 0;
    const unpinnedExamples: string[] = [];

    for (const file of workflowFiles) {
      if (!file.sha || !file.path) continue;

      const { data: blob } = await ctx.octokit.git.getBlob({
        owner: ctx.owner,
        repo: ctx.repo,
        file_sha: file.sha,
      });

      const content = Buffer.from(blob.content, "base64").toString("utf-8");
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        // Match `uses: owner/repo@ref` patterns
        const match = line.match(/uses:\s+([^@\s]+)@([^\s#]+)/);
        if (match) {
          const ref = match[2];
          // SHA pins are 40 hex chars
          const isSha = /^[0-9a-f]{40}$/i.test(ref);
          if (!isSha) {
            unpinnedCount++;
            if (unpinnedExamples.length < 3) {
              unpinnedExamples.push(
                `\`${file.path}\`: \`${match[1]}@${ref}\``
              );
            }
          }
        }
      }
    }

    if (unpinnedCount === 0) {
      results.push({
        id: "pin-actions",
        name: "Dependency Pinning",
        status: "pass",
        severity: config.severity,
        message: "All GitHub Actions are pinned to commit SHAs",
      });
    } else {
      const examples = unpinnedExamples.join(", ");
      results.push({
        id: "pin-actions",
        name: "Dependency Pinning",
        status: config.severity === "error" ? "fail" : "warn",
        severity: config.severity,
        message: `${unpinnedCount} action(s) not pinned to SHA. E.g. ${examples}`,
      });
    }
  } catch (error) {
    results.push({
      id: "pin-actions",
      name: "Dependency Pinning",
      status: "warn",
      severity: config.severity,
      message: "Could not analyze workflow files",
    });
  }

  return results;
};
