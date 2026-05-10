import { describe, it, expect } from "vitest";
import { buildComment, getConclusion } from "../comment";
import { CheckResult } from "../analyzers/types";
import { OSSGuardConfig } from "../config";

const defaultConfig: OSSGuardConfig = {
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

describe("buildComment", () => {
  it("should build a full table comment", () => {
    const results: CheckResult[] = [
      { id: "license", name: "License", status: "pass", severity: "warning", message: "Apache-2.0" },
      { id: "secrets", name: "Secrets Scan", status: "pass", severity: "error", message: "No secrets found" },
    ];

    const comment = buildComment(results, defaultConfig);
    expect(comment).toContain("OSSGuard Security Review");
    expect(comment).toContain("License");
    expect(comment).toContain("Secrets Scan");
    expect(comment).toContain("2 passed");
  });

  it("should show warnings count", () => {
    const results: CheckResult[] = [
      { id: "license", name: "License", status: "pass", severity: "warning", message: "Found" },
      { id: "pin-actions", name: "Dependency Pinning", status: "warn", severity: "warning", message: "2 unpinned" },
    ];

    const comment = buildComment(results, defaultConfig);
    expect(comment).toContain("1 passed");
    expect(comment).toContain("1 warning");
  });

  it("should show compact style", () => {
    const config = { ...defaultConfig, commentStyle: "compact" as const };
    const results: CheckResult[] = [
      { id: "pin-actions", name: "Dependency Pinning", status: "warn", severity: "warning", message: "2 unpinned" },
    ];

    const comment = buildComment(results, config);
    expect(comment).toContain("**Dependency Pinning**");
    expect(comment).not.toContain("| Check |");
  });
});

describe("getConclusion", () => {
  it("should return success when all pass", () => {
    const results: CheckResult[] = [
      { id: "license", name: "License", status: "pass", severity: "warning", message: "Found" },
      { id: "secrets", name: "Secrets", status: "pass", severity: "error", message: "Clean" },
    ];

    expect(getConclusion(results, defaultConfig)).toBe("success");
  });

  it("should return neutral when warnings exist", () => {
    const results: CheckResult[] = [
      { id: "license", name: "License", status: "pass", severity: "warning", message: "Found" },
      { id: "pin-actions", name: "Pinning", status: "warn", severity: "warning", message: "Unpinned" },
    ];

    expect(getConclusion(results, defaultConfig)).toBe("neutral");
  });

  it("should return failure when error-severity check fails", () => {
    const results: CheckResult[] = [
      { id: "secrets", name: "Secrets", status: "fail", severity: "error", message: "Leaked!" },
    ];

    expect(getConclusion(results, defaultConfig)).toBe("failure");
  });

  it("should not fail on warn status even with error severity", () => {
    const results: CheckResult[] = [
      { id: "secrets", name: "Secrets", status: "warn", severity: "error", message: "Could not scan" },
    ];

    expect(getConclusion(results, defaultConfig)).toBe("neutral");
  });

  it("should not fail on warning-severity fail when blockOn is error", () => {
    const results: CheckResult[] = [
      { id: "pin-actions", name: "Pinning", status: "fail", severity: "warning", message: "Unpinned" },
    ];

    expect(getConclusion(results, defaultConfig)).not.toBe("failure");
  });
});
