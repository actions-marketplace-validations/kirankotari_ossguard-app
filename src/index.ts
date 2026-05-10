import { Probot } from "probot";
import { loadConfig } from "./config";
import { runAllAnalyzers, AnalyzerContext } from "./analyzers";
import { buildComment, getConclusion } from "./comment";

const COMMENT_TAG = "<!-- ossguard-app -->";

export default function ossguardApp(app: Probot): void {
  app.log.info("OSSGuard App loaded");

  app.on(
    ["pull_request.opened", "pull_request.synchronize", "pull_request.reopened"],
    async (context) => {
      const { pull_request: pr } = context.payload;
      const { owner, repo } = context.repo();

      app.log.info(
        `Scanning PR #${pr.number} on ${owner}/${repo} (head: ${pr.head.sha})`
      );

      // Load repo-specific configuration
      const config = await loadConfig(context);

      // Build analyzer context
      const analyzerCtx: AnalyzerContext = {
        octokit: context.octokit,
        owner,
        repo,
        headSha: pr.head.sha,
        baseSha: pr.base.sha,
        prNumber: pr.number,
        config,
      };

      // Run all analyzers
      const results = await runAllAnalyzers(analyzerCtx);

      // Build PR comment
      const commentBody = `${COMMENT_TAG}\n${buildComment(results, config)}`;

      // Find existing OSSGuard comment to update (avoid duplicates)
      const { data: comments } = await context.octokit.issues.listComments({
        owner,
        repo,
        issue_number: pr.number,
        per_page: 100,
      });

      const existingComment = comments.find(
        (c) => c.body?.includes(COMMENT_TAG)
      );

      if (existingComment) {
        await context.octokit.issues.updateComment({
          owner,
          repo,
          comment_id: existingComment.id,
          body: commentBody,
        });
        app.log.info(`Updated comment on PR #${pr.number}`);
      } else {
        await context.octokit.issues.createComment({
          owner,
          repo,
          issue_number: pr.number,
          body: commentBody,
        });
        app.log.info(`Created comment on PR #${pr.number}`);
      }

      // Set commit status check
      const conclusion = getConclusion(results, config);
      const description =
        conclusion === "success"
          ? "All checks passed"
          : conclusion === "neutral"
            ? "Warnings found"
            : "Issues found — check PR comment for details";

      await context.octokit.repos.createCommitStatus({
        owner,
        repo,
        sha: pr.head.sha,
        state: conclusion === "failure" ? "failure" : "success",
        description,
        context: "ossguard",
        target_url: `https://github.com/${owner}/${repo}/pull/${pr.number}#issuecomment-${existingComment?.id || ""}`,
      });

      app.log.info(
        `PR #${pr.number}: ${conclusion} (${results.length} checks run)`
      );
    }
  );
}
