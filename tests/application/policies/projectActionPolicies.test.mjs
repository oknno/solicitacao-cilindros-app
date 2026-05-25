import assert from "node:assert/strict";
import test from "node:test";

import {
  canBack,
  canApprove,
  canDelete,
  canEdit,
  canReject,
  canSend,
  getCommandBarPolicies,
  PROJECT_STATUSES,
} from "../../../src/application/policies/projectActionPolicies.ts";

const scenarios = [
  {
    name: "Rascunho",
    project: { status: "Rascunho" },
    expected: { edit: true, delete: true, send: true, back: false, approve: false, reject: false },
  },
  {
    name: "Em Aprovação",
    project: { status: "Em Aprovação" },
    expected: { edit: false, delete: false, send: false, back: true, approve: true, reject: true },
  },
  {
    name: "Aprovado",
    project: { status: "Aprovado" },
    expected: { edit: false, delete: false, send: false, back: false, approve: false, reject: false },
  },
  {
    name: "Reprovado",
    project: { status: "Reprovado" },
    expected: { edit: true, delete: false, send: true, back: false, approve: false, reject: false },
  },
  {
    name: "sem status",
    project: { status: "" },
    expected: { edit: true, delete: true, send: false, back: false, approve: false, reject: false },
  },
  {
    name: "status desconhecido",
    project: { status: "Cancelado" },
    expected: { edit: false, delete: false, send: false, back: false, approve: false, reject: false },
  },
];

test("lista de status de projeto conhecidos pela command bar", () => {
  assert.deepEqual([...PROJECT_STATUSES], ["Rascunho", "Em Aprovação", "Aprovado", "Reprovado"]);
});

for (const scenario of scenarios) {
test(`canEdit/canDelete/canSend/canBack/canApprove/canReject para status ${scenario.name}`, () => {
    const editResult = canEdit(scenario.project);
    const deleteResult = canDelete(scenario.project);
    const sendResult = canSend(scenario.project);
    const backResult = canBack(scenario.project);
    const approveResult = canApprove(scenario.project);
    const rejectResult = canReject(scenario.project);

    assert.equal(editResult.ok, scenario.expected.edit);
    assert.equal(deleteResult.ok, scenario.expected.delete);
    assert.equal(sendResult.ok, scenario.expected.send);
    assert.equal(backResult.ok, scenario.expected.back);
    assert.equal(approveResult.ok, scenario.expected.approve);
    assert.equal(rejectResult.ok, scenario.expected.reject);
  });
}

test("fallback seguro sem projeto selecionado", () => {
  const policies = getCommandBarPolicies(null);
  assert.equal(policies.view.ok, false);
  assert.equal(policies.edit.ok, false);
  assert.equal(policies.delete.ok, false);
  assert.equal(policies.sendToApproval.ok, false);
  assert.equal(policies.backToDraft.ok, false);
  assert.equal(policies.approve.ok, false);
  assert.equal(policies.reject.ok, false);
  assert.equal(policies.edit.reason, "Selecione um projeto.");
});

test("troca rápida de seleção recalcula ações", () => {
  const draftPolicies = getCommandBarPolicies({ status: "Rascunho" });
  const approvedPolicies = getCommandBarPolicies({ status: "Aprovado" });

  assert.equal(draftPolicies.sendToApproval.ok, true);
  assert.equal(approvedPolicies.sendToApproval.ok, false);
});

test("em reprovado mantém envio permitido e voltar status desabilitado", () => {
  const rejectedPolicies = getCommandBarPolicies({ status: "Reprovado" });
  assert.equal(rejectedPolicies.sendToApproval.ok, true);
  assert.equal(rejectedPolicies.backToDraft.ok, false);
  assert.equal(rejectedPolicies.backToDraft.reason, "Projeto reprovado não pode voltar status.");
});
