export type RuleLevel = "ok" | "warn" | "error";

export type RuleResult = {
  id: string;
  level: RuleLevel;
  title: string;
  message?: string;
};

export type RuleResultsSummary = {
  ok: boolean;
  errors: RuleResult[];
  warns: RuleResult[];
  oks: RuleResult[];
};
