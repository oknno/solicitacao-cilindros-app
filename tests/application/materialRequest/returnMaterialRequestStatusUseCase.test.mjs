import assert from "node:assert/strict";
import test, { mock } from "node:test";

const requesterProfile = {
  userEmail: "user@empresa.com",
  roles: ["USER"],
  centers: [],
  dataScope: "OWN_REQUESTS",
  permissions: {},
};

function buildRequest(status) {
  return { id: 17, requesterEmail: "user@empresa.com", center: "9860", status };
}

test("retorna solicitação pendente do gerente para RETURNED_TO_DRAFT e registra histórico específico", async () => {
  let request = buildRequest("PENDING_LAMINATION_MANAGER_APPROVAL");
  let updatePatch;
  let historyPayload;
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", { namedExports: {
    getMaterialRequestById: async () => request,
    updateMaterialRequest: async (_id, patch) => { updatePatch = patch; return { ...request, ...patch }; },
  } });
  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", { namedExports: {
    createMaterialRequestHistoryEntry: async (entry) => { historyPayload = entry; return entry; },
  } });
  const { returnMaterialRequestStatusUseCase } = await import("../../../src/application/materialRequest/returnMaterialRequestStatusUseCase.ts");
  const result = await returnMaterialRequestStatusUseCase({ requestId: 17, targetStatus: "RETURNED_TO_DRAFT", reason: "Precisa de ajuste", performedByName: "Usuário", accessProfile: requesterProfile });

  assert.deepEqual(updatePatch, { status: "RETURNED_TO_DRAFT" });
  assert.equal(result.request.status, "RETURNED_TO_DRAFT");
  assert.equal(historyPayload.action, "STATUS_RETURNED_TO_DRAFT");
  assert.equal(historyPayload.previousStatus, "PENDING_LAMINATION_MANAGER_APPROVAL");
  assert.equal(historyPayload.newStatus, "RETURNED_TO_DRAFT");
  assert.equal(historyPayload.comment, "Precisa de ajuste");

  request = buildRequest("PENDING_CTO_APPROVAL");
  await assert.rejects(
    () => returnMaterialRequestStatusUseCase({ requestId: 17, targetStatus: "RETURNED_TO_DRAFT", reason: "Ajustar", performedByName: "Usuário", accessProfile: requesterProfile }),
    /Não é possível voltar para rascunho uma solicitação que já foi enviada ao CTO\./,
  );
});
