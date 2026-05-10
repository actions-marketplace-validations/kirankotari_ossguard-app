import { CheckResult } from "./analyzers/types";
import { OSSGuardConfig } from "./config";

const STATUS_ICONS: Record<CheckResult["status"], string> = {
  pass: "\u2705",
  warn: "\u26a0\ufe0f",
  fail: "\u274c",
  skip: "\u23ed\ufe0f",
};

const SEVERITY_LABELS: Record<string, string> = {
  error: "Error",
  warning: "Warning",
  info: "Info",
};

/** Build the PR comment body from check results */
export function buildComment(
  results: CheckResult[],
  config: OSSGuardConfig
): string {
  const enabled = results.filter((r) => r.status !== "skip");
  const issues = enabled.filter(
    (r) => r.status === "fail" || r.status === "warn"
  );

  const passed = enabled.filter((r) => r.status === "pass").length;
  const warnings = enabled.filter((r) => r.status === "warn").length;
  const errors = enabled.filter((r) => r.status === "fail").length;

  let body = "### OSSGuard Security Review\n\n";

  if (config.commentStyle === "full") {
    body += "| Check | Status | Severity | Details |\n";
    body += "|-------|--------|----------|---------|\n";

    for (const r of enabled) {
      const icon = STATUS_ICONS[r.status];
      const severity = SEVERITY_LABELS[r.severity] || r.severity;
      body += `| ${r.name} | ${icon} ${capitalize(r.status)} | ${severity} | ${r.message} |\n`;
    }
  } else {
    // Compact: only show issues
    if (issues.length > 0) {
      for (const r of issues) {
        const icon = STATUS_ICONS[r.status];
        body += `- ${icon} **${r.name}**: ${r.message}\n`;
      }
    }
  }

  body += "\n---\n";
  body += `**${passed} passed**`;
  if (warnings > 0) body += ` | **${warnings} warning${warnings > 1 ? "s" : ""}**`;
  if (errors > 0) body += ` | **${errors} error${errors > 1 ? "s" : ""}**`;
  body += "\n\n";

  if (issues.length === 0) {
    body += "> All checks passed! Your PR follows OpenSSF best practices.\n";
  } else {
    body +=
      "> Fix the issues above to improve your project's security posture. " +
      "[Learn more](https://github.com/kirankotari/ossguard)\n";
  }

  body += "\n<sub>Powered by [OSSGuard](https://github.com/kirankotari/ossguard-app)</sub>";

  return body;
}

/** Determine the overall status check conclusion */
export function getConclusion(
  results: CheckResult[],
  config: OSSGuardConfig
): "success" | "failure" | "neutral" {
  const severityLevel = { info: 0, warning: 1, error: 2 };
  const blockLevel = severityLevel[config.blockOn];

  for (const r of results) {
    if (r.status === "fail") {
      const level = severityLevel[r.severity] ?? 0;
      if (level >= blockLevel) {
        return "failure";
      }
    }
  }

  const hasWarnings = results.some((r) => r.status === "warn");
  return hasWarnings ? "neutral" : "success";
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
