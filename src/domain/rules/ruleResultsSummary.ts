import type { RuleResult, RuleResultsSummary } from "./types";

export function summarizeRuleResults(results: RuleResult[]): RuleResultsSummary {
  const errors = results.filter((result) => result.level === "error");
  const warns = results.filter((result) => result.level === "warn");
  const oks = results.filter((result) => result.level === "ok");

  return {
    ok: errors.length === 0,
    errors,
    warns,
    oks,
  };
}
