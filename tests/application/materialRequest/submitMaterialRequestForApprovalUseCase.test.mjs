import assert from "node:assert/strict";
import test, { mock } from "node:test";

function buildRequest(overrides = {}) {
  return {
    id: 17,
    requesterName: "Solicitante",
    requesterEmail: "user@empresa.com",
    materialCode: "MAT-01",
    materialDescription: "Cilindro",
    center: "9860",
    requestedQuantity: 2,
    evaluatedStockTotalAtRequest: 1,
    stockRecommendation: "PURCHASE_RECOMMENDED",
    requestReason: "Necessidade",
    status: "DRAFT",
    ...overrides,
  };
}
const accessProfile = {
  userEmail: "user@empresa.com",
  roles: ["USER"],
  centers: [],
  dataScope: "OWN_REQUESTS",
  permissions: {},
};


test("submitMaterialRequestForApprovalUseCase lança erro quando requestId é inválido", async () => {
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  await assert.rejects(() => submitMaterialRequestForApprovalUseCase({ requestId: 0, performedByName: "Usuário", accessProfile }), /Informe uma solicitação válida\./);
});

test("submitMaterialRequestForApprovalUseCase lança erro quando performedByName é vazio", async () => {
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  await assert.rejects(() => submitMaterialRequestForApprovalUseCase({ requestId: 1, performedByName: "   ", accessProfile }), /Informe o usuário responsável pelo envio\./);
});

test("submitMaterialRequestForApprovalUseCase lança erro quando solicitação não é encontrada", async () => {
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { getMaterialRequestById: async () => null, updateMaterialRequest: async () => { throw new Error("não deveria atualizar"); } } });
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  await assert.rejects(() => submitMaterialRequestForApprovalUseCase({ requestId: 12, performedByName: "Usuário", accessProfile }), /Solicitação não encontrada\./);
});

test("status DRAFT muda para PENDING_LAMINATION_MANAGER_APPROVAL", async () => {
  const request = buildRequest({ status: "DRAFT" });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { getMaterialRequestById: async () => request, updateMaterialRequest: async (id, patch) => ({ ...request, id, ...patch }) } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: { createMaterialRequestHistoryEntry: async (entry) => entry } });
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  const out = await submitMaterialRequestForApprovalUseCase({ requestId: 17, performedByName: "Usuário", accessProfile });
  assert.equal(out.request.status, "PENDING_LAMINATION_MANAGER_APPROVAL");
});

test("status REJECTED muda para PENDING_LAMINATION_MANAGER_APPROVAL", async () => {
  const request = buildRequest({ status: "REJECTED" });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { getMaterialRequestById: async () => request, updateMaterialRequest: async (id, patch) => ({ ...request, id, ...patch }) } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: { createMaterialRequestHistoryEntry: async (entry) => entry } });
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  const out = await submitMaterialRequestForApprovalUseCase({ requestId: 17, performedByName: "Usuário", accessProfile });
  assert.equal(out.request.status, "PENDING_LAMINATION_MANAGER_APPROVAL");
});

test("status PENDING_CTO_APPROVAL lança erro", async () => {
  const request = buildRequest({ status: "PENDING_CTO_APPROVAL" });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { getMaterialRequestById: async () => request, updateMaterialRequest: async () => { throw new Error("não deveria atualizar"); } } });
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  await assert.rejects(() => submitMaterialRequestForApprovalUseCase({ requestId: 17, performedByName: "Usuário", accessProfile }), /A solicitação não pode ser enviada para aprovação neste status\./);
});

test("status APPROVED lança erro", async () => {
  const request = buildRequest({ status: "APPROVED" });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { getMaterialRequestById: async () => request, updateMaterialRequest: async () => { throw new Error("não deveria atualizar"); } } });
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  await assert.rejects(() => submitMaterialRequestForApprovalUseCase({ requestId: 17, performedByName: "Usuário", accessProfile }), /A solicitação não pode ser enviada para aprovação neste status\./);
});

test("cria histórico com action SUBMITTED", async () => {
  const request = buildRequest({ status: "DRAFT" });
  let payload;
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: { getMaterialRequestById: async () => request, updateMaterialRequest: async (id, patch) => ({ ...request, id, ...patch }) } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: { createMaterialRequestHistoryEntry: async (entry) => { payload = entry; return entry; } } });
  const { submitMaterialRequestForApprovalUseCase } = await import("../../../src/application/materialRequest/submitMaterialRequestForApprovalUseCase.ts");
  await submitMaterialRequestForApprovalUseCase({ requestId: 17, performedByName: "Usuário Teste", performedByEmail: "user@empresa.com", accessProfile });
  assert.equal(payload.action, "SUBMITTED");
  assert.equal(payload.previousStatus, "DRAFT");
  assert.equal(payload.newStatus, "PENDING_LAMINATION_MANAGER_APPROVAL");
});
