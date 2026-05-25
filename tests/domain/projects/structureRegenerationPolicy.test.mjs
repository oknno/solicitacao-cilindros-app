import test from "node:test";
import assert from "node:assert/strict";

import { decideStructureRegeneration } from "../../../src/domain/projects/structureRegenerationPolicy.ts";

test("bloqueia quando há marco concluído", () => {
  const result = decideStructureRegeneration({ hasCompletedMilestone: true, hasManualConfirmation: true });
  assert.equal(result.allowed, false);
  assert.equal(Boolean(result.reason), true);
});

test("exige confirmação de impacto quando não houve confirmação manual", () => {
  const result = decideStructureRegeneration({ hasCompletedMilestone: false, hasManualConfirmation: false });
  assert.equal(result.allowed, false);
  assert.equal(result.requiresImpactConfirmation, true);
});

test("permite regeneração quando não há marco concluído e confirmação foi feita", () => {
  const result = decideStructureRegeneration({ hasCompletedMilestone: false, hasManualConfirmation: true });
  assert.equal(result.allowed, true);
});
