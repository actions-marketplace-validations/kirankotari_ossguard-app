import { Analyzer, AnalyzerContext, CheckResult } from "./types";

/** Common secret patterns to scan for in PR diffs */
const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/ },
  { name: "AWS Secret Key", regex: /(?:aws_secret_access_key|secret_key)\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}/i },
  { name: "GitHub Token", regex: /gh[ps]_[A-Za-z0-9_]{36,}/ },
  { name: "Generic API Key", regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?[A-Za-z0-9]{20,}/i },
  { name: "Generic Secret", regex: /(?:secret|password|passwd|token)\s*[:=]\s*['"]?[A-Za-z0-9/+=!@#$%^&*]{16,}/i },
  { name: "Private Key", regex: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/ },
  { name: "Slack Token", regex: /xox[bpors]-[0-9]{10,}-[a-zA-Z0-9-]+/ },
  { name: "npm Token", regex: /npm_[A-Za-z0-9]{36}/ },
];

/**
 * Scan the PR diff for potential leaked secrets.
 */
export const analyzeSecrets: Analyzer = async (
  ctx: AnalyzerContext
): Promise<CheckResult[]> => {
  const config = ctx.config.checks.secrets;
  if (!config.enabled) {
    return [
      {
        id: "secrets",
        name: "Secrets Scan",
        status: "skip",
        severity: config.severity,
        message: "Check disabled",
      },
    ];
  }

  try {
    // Get the PR diff
    const { data: files } = await ctx.octokit.pulls.listFiles({
      owner: ctx.owner,
      repo: ctx.repo,
      pull_number: ctx.prNumber,
      per_page: 100,
    });

    const findings: string[] = [];

    for (const file of files) {
      // Only check added lines in the patch
      if (!file.patch) continue;
      // Skip binary files and lock files
      if (file.filename.endsWith(".lock") || file.filename.endsWith(".sum")) continue;

      const addedLines = file.patch
        .split("\n")
        .filter((line) => line.startsWith("+") && !line.startsWith("+++"));

      for (const line of addedLines) {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(line)) {
            findings.push(`\`${file.filename}\`: possible ${pattern.name}`);
            break; // One finding per line is enough
          }
        }
      }
    }

    if (findings.length === 0) {
      return [
        {
          id: "secrets",
          name: "Secrets Scan",
          status: "pass",
          severity: config.severity,
          message: "No secrets detected in PR diff",
        },
      ];
    }

    const examples = findings.slice(0, 3).join(", ");
    return [
      {
        id: "secrets",
        name: "Secrets Scan",
        status: "fail",
        severity: config.severity,
        message: `${findings.length} potential secret(s) found. ${examples}`,
      },
    ];
  } catch {
    return [
      {
        id: "secrets",
        name: "Secrets Scan",
        status: "warn",
        severity: config.severity,
        message: "Could not scan PR diff for secrets",
      },
    ];
  }
};
