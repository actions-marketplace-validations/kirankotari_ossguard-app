import * as yaml from "js-yaml";
import { Context } from "probot";

/** Per-check configuration */
export interface CheckConfig {
  enabled: boolean;
  severity: "error" | "warning" | "info";
}

/** Repository-level OSSGuard configuration (.github/ossguard.yml) */
export interface OSSGuardConfig {
  checks: {
    "pin-actions": CheckConfig;
    "security-policy": CheckConfig;
    license: CheckConfig;
    sbom: CheckConfig;
    scorecard: CheckConfig;
    secrets: CheckConfig;
    container: CheckConfig;
    "branch-protection": CheckConfig;
    codeql: CheckConfig;
    "dependency-review": CheckConfig;
  };
  /** Minimum severity to block a PR via status check */
  blockOn: "error" | "warning" | "info";
  /** Comment style: "full" table or "compact" summary */
  commentStyle: "full" | "compact";
}

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

/**
 * Load OSSGuard configuration from .github/ossguard.yml in the repository.
 * Falls back to defaults if the file is missing or malformed.
 */
export async function loadConfig(
  context: Context<"pull_request">
): Promise<OSSGuardConfig> {
  try {
    const { data } = await context.octokit.repos.getContent({
      owner: context.repo().owner,
      repo: context.repo().repo,
      path: ".github/ossguard.yml",
      ref: context.payload.pull_request.head.sha,
    });

    if ("content" in data && data.content) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const parsed = yaml.load(content) as Partial<OSSGuardConfig>;
      return mergeConfig(parsed);
    }
  } catch {
    // File not found — use defaults
  }

  return DEFAULT_CONFIG;
}

/** Deep-merge user config with defaults */
function mergeConfig(partial: Partial<OSSGuardConfig>): OSSGuardConfig {
  const config = { ...DEFAULT_CONFIG };

  if (partial.blockOn) {
    config.blockOn = partial.blockOn;
  }
  if (partial.commentStyle) {
    config.commentStyle = partial.commentStyle;
  }
  if (partial.checks) {
    for (const [key, value] of Object.entries(partial.checks)) {
      const checkKey = key as keyof OSSGuardConfig["checks"];
      if (checkKey in config.checks && value) {
        config.checks[checkKey] = {
          ...config.checks[checkKey],
          ...(typeof value === "boolean"
            ? { enabled: value }
            : (value as Partial<CheckConfig>)),
        };
      }
    }
  }

  return config;
}
