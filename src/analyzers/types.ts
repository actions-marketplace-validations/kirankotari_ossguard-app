import { Context } from "probot";
import { OSSGuardConfig } from "../config";

/** Result of a single security check */
export interface CheckResult {
  /** Machine-readable check ID (matches config key) */
  id: string;
  /** Human-readable check name */
  name: string;
  /** Outcome */
  status: "pass" | "warn" | "fail" | "skip";
  /** Severity from config */
  severity: "error" | "warning" | "info";
  /** One-line explanation shown in PR comment */
  message: string;
  /** Optional file path that triggered the result */
  file?: string;
  /** Optional line number */
  line?: number;
}

/** Context passed to each analyzer */
export interface AnalyzerContext {
  octokit: Context<"pull_request">["octokit"];
  owner: string;
  repo: string;
  headSha: string;
  baseSha: string;
  prNumber: number;
  config: OSSGuardConfig;
}

/** An analyzer function that performs one category of checks */
export type Analyzer = (ctx: AnalyzerContext) => Promise<CheckResult[]>;
