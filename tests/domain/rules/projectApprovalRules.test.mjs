import assert from "node:assert/strict";
import test from "node:test";

import { executeProjectApprovalRules } from "../../../src/domain/rules/projectApprovalRules.ts";

function hasError(resultId, results) {
  return results.some((result) => result.id === resultId && result.level === "error");
}

test("retorna erro quando não há marcos", () => {
  const results = executeProjectApprovalRules({
    projectStatus: "rascunho",
    milestonesCount: 0,
    activitiesCount: 1,
    pepsCount: 1,
    totalProjectBrl: 10,
  });

  assert.equal(hasError("milestones.required", results), true);
});

test("retorna erro quando não há atividades", () => {
  const results = executeProjectApprovalRules({
    projectStatus: "rascunho",
    milestonesCount: 1,
    activitiesCount: 0,
    pepsCount: 1,
    totalProjectBrl: 10,
  });

  assert.equal(hasError("activities.required", results), true);
});

test("retorna erro quando o total é inválido", () => {
  const results = executeProjectApprovalRules({
    projectStatus: "rascunho",
    milestonesCount: 1,
    activitiesCount: 1,
    pepsCount: 1,
    totalProjectBrl: 0,
  });

  assert.equal(hasError("total.invalid", results), true);
});

test("retorna erro quando o status bloqueia envio", () => {
  const results = executeProjectApprovalRules({
    projectStatus: "aprovado",
    milestonesCount: 1,
    activitiesCount: 1,
    pepsCount: 1,
    totalProjectBrl: 10,
  });

  assert.equal(hasError("status.blocked", results), true);
});
