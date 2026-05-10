import { Analyzer, AnalyzerContext, CheckResult } from "./types";
import { analyzePinActions } from "./pin-actions";
import { analyzeSecurityPolicy } from "./security-policy";
import { analyzeLicense } from "./license";
import { analyzeSecrets } from "./secrets";
import { analyzeContainer } from "./container";

export { CheckResult, AnalyzerContext } from "./types";

/** All registered analyzers */
const analyzers: Analyzer[] = [
  analyzePinActions,
  analyzeSecurityPolicy,
  analyzeLicense,
  analyzeSecrets,
  analyzeContainer,
];

/**
 * Run all enabled analyzers and return combined results.
 */
export async function runAllAnalyzers(
  ctx: AnalyzerContext
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const analyzer of analyzers) {
    try {
      const checkResults = await analyzer(ctx);
      results.push(...checkResults);
    } catch (error) {
      // Individual analyzer failure shouldn't stop others
      console.error("Analyzer failed:", error);
    }
  }

  return results;
}
