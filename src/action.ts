import * as core from "@actions/core";
import * as github from "@actions/github";
import * as yaml from "js-yaml";
import { OSSGuardConfig } from "./config";
import { runAllAnalyzers, AnalyzerContext } from "./analyzers";
import { buildComment, getConclusion } from "./comment";

const COMMENT_TAG = "<!-- ossguard-app -->";

async function loadConfigFromFile(
  configPath: string,
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  ref: string
): Promise<OSSGuardConfig> {
  const DEFAULT_CONFIG: OSSGuardConfig = {
    checks: {
      "pin-actions": { enabled: true, severity: "warning" },
      "security-policy": { enabled: true, severity: "warning" },
      license: { enabled: true, severity: "warning" },
      sbom: { enabled: false, severity: "info" },
      scorecard: { enabled: true, severity: "info" },
      secrets: { enabled: true, severity: "error" },
      container: { enabled: true, severity: "warning" },
      "branch-protection": { enabled: true, severity: "info" },
      codeql: { enabled: true, severity: "warning" },
      "dependency-review": { enabled: true, severity: "info" },
    },
    blockOn: "error",
    commentStyle: "full",
  };

  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: configPath,
      ref,
    });

    if ("content" in data && data.content) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const parsed = yaml.load(content) as Partial<OSSGuardConfig>;
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {
    // Config file not found — use defaults
  }

  return DEFAULT_CONFIG;
}

async function run(): Promise<void> {
  try {
    const token = core.getInput("github-token");
    const configPath = core.getInput("config-path");
    const octokit = github.getOctokit(token);

    const pr = github.context.payload.pull_request;
    if (!pr) {
      core.setFailed("This action only works on pull_request events");
      return;
    }

    const owner = github.context.repo.owner;
    const repo = github.context.repo.repo;
    const prNumber = pr.number;
    const headSha = pr.head.sha;
    const baseSha = pr.base.sha;

    core.info(`Scanning PR #${prNumber} on ${owner}/${repo} (head: ${headSha})`);

    // Load config
    const config = await loadConfigFromFile(configPath, octokit, owner, repo, headSha);

    // Build analyzer context
    const analyzerCtx: AnalyzerContext = {
      octokit: octokit as unknown as AnalyzerContext["octokit"],
      owner,
      repo,
      headSha,
      baseSha,
      prNumber,
      config,
    };

    // Run all analyzers
    const results = await runAllAnalyzers(analyzerCtx);

    // Build PR comment
    const commentBody = `${COMMENT_TAG}\n${buildComment(results, config)}`;

    // Find existing OSSGuard comment
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });

    const existingComment = comments.find(
      (c: { body?: string }) => c.body?.includes(COMMENT_TAG)
    );

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      core.info(`Updated comment on PR #${prNumber}`);
    } else {
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      core.info(`Created comment on PR #${prNumber}`);
    }

    // Set commit status
    const conclusion = getConclusion(results, config);
    const description =
      conclusion === "success"
        ? "All checks passed"
        : conclusion === "neutral"
          ? "Warnings found"
          : "Issues found — check PR comment";

    await octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha: headSha,
      state: conclusion === "failure" ? "failure" : "success",
      description,
      context: "ossguard",
    });

    core.info(`PR #${prNumber}: ${conclusion} (${results.length} checks run)`);

    // Set action outputs
    core.setOutput("conclusion", conclusion);
    core.setOutput("checks-run", results.length.toString());

    const failCount = results.filter((r) => r.status === "fail").length;
    const warnCount = results.filter((r) => r.status === "warn").length;
    core.setOutput("errors", failCount.toString());
    core.setOutput("warnings", warnCount.toString());

    if (conclusion === "failure") {
      core.setFailed(`OSSGuard found ${failCount} error(s)`);
    }
  } catch (error) {
    core.setFailed(`OSSGuard action failed: ${error}`);
  }
}

run();
