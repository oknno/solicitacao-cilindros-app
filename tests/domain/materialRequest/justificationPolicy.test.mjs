import assert from "node:assert/strict";
import test from "node:test";

import {
  requiresCtoJustificationOnDecision,
  requiresRequesterJustification,
} from "../../../src/domain/materialRequest/justificationPolicy.ts";

test("compra recomendada não exige justificativa do solicitante", () => {
  assert.equal(requiresRequesterJustification("PURCHASE_RECOMMENDED"), false);
});

test("estoque parcial não exige justificativa do solicitante", () => {
  assert.equal(requiresRequesterJustification("PURCHASE_RECOMMENDED_PARTIAL_STOCK"), false);
});

test("compra não recomendada exige justificativa do solicitante", () => {
  assert.equal(requiresRequesterJustification("PURCHASE_NOT_RECOMMENDED"), true);
});

test("análise manual exige justificativa do solicitante", () => {
  assert.equal(requiresRequesterJustification("MANUAL_REVIEW_REQUIRED"), true);
});

test("CTO aprovando compra não recomendada exige justificativa", () => {
  assert.equal(
    requiresCtoJustificationOnDecision({
      recommendation: "PURCHASE_NOT_RECOMMENDED",
      decision: "APPROVE",
    }),
    true,
  );
});

test("CTO aprovando análise manual exige justificativa", () => {
  assert.equal(
    requiresCtoJustificationOnDecision({
      recommendation: "MANUAL_REVIEW_REQUIRED",
      decision: "APPROVE",
    }),
    true,
  );
});

test("CTO reprovando não exige justificativa obrigatória", () => {
  assert.equal(
    requiresCtoJustificationOnDecision({
      recommendation: "PURCHASE_NOT_RECOMMENDED",
      decision: "REJECT",
    }),
    false,
  );
});

test("CTO devolvendo não exige justificativa obrigatória", () => {
  assert.equal(
    requiresCtoJustificationOnDecision({
      recommendation: "MANUAL_REVIEW_REQUIRED",
      decision: "RETURN_FOR_ADJUSTMENT",
    }),
    false,
  );
});
