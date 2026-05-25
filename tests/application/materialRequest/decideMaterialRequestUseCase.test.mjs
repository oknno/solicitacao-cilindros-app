import assert from "node:assert/strict";
import test, { mock } from "node:test";

function buildPendingRequest(overrides = {}) {
  return {
    id: 10,
    requesterName: "Solicitante",
    materialCode: "MAT-001",
    materialDescription: "Material",
    center: "C100",
    requestedQuantity: 2,
    evaluatedStockTotalAtRequest: 1,
    stockRecommendation: "PURCHASE_RECOMMENDED",
    requestReason: "Necessidade",
    status: "PENDING_CTO_APPROVAL",
    ...overrides,
  };
}

test("decideMaterialRequestUseCase lança erro quando requestId é inválido", async () => {
  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  await assert.rejects(
    () =>
      decideMaterialRequestUseCase({
        requestId: 0,
        decision: "APPROVE",
        ctoApproverName: "CTO",
      }),
    /Informe uma solicitação válida\./,
  );
});

test("decideMaterialRequestUseCase lança erro quando CTO não tem nome", async () => {
  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  await assert.rejects(
    () =>
      decideMaterialRequestUseCase({
        requestId: 1,
        decision: "APPROVE",
        ctoApproverName: "   ",
      }),
    /Informe o nome do aprovador CTO\./,
  );
});

test("decideMaterialRequestUseCase lança erro quando solicitação não é encontrada", async () => {
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () => null,
      updateMaterialRequest: async () => {
        throw new Error("não deveria atualizar");
      },
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  await assert.rejects(
    () =>
      decideMaterialRequestUseCase({
        requestId: 11,
        decision: "APPROVE",
        ctoApproverName: "CTO",
      }),
    /Solicitação não encontrada\./,
  );
});

test("decideMaterialRequestUseCase lança erro quando solicitação não está pendente", async () => {
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () =>
        buildPendingRequest({ status: "APPROVED_BY_CTO" }),
      updateMaterialRequest: async () => {
        throw new Error("não deveria atualizar");
      },
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  await assert.rejects(
    () =>
      decideMaterialRequestUseCase({
        requestId: 11,
        decision: "APPROVE",
        ctoApproverName: "CTO",
      }),
    /A solicitação não está pendente de aprovação CTO\./,
  );
});

test("APPROVE em PURCHASE_NOT_RECOMMENDED sem justificativa lança erro", async () => {
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () =>
        buildPendingRequest({ stockRecommendation: "PURCHASE_NOT_RECOMMENDED" }),
      updateMaterialRequest: async () => {
        throw new Error("não deveria atualizar");
      },
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  await assert.rejects(
    () =>
      decideMaterialRequestUseCase({
        requestId: 11,
        decision: "APPROVE",
        ctoApproverName: "CTO",
      }),
    /Informe a justificativa do CTO para aprovar esta exceção\./,
  );
});

test("APPROVE em MANUAL_REVIEW_REQUIRED sem justificativa lança erro", async () => {
  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () =>
        buildPendingRequest({ stockRecommendation: "MANUAL_REVIEW_REQUIRED" }),
      updateMaterialRequest: async () => {
        throw new Error("não deveria atualizar");
      },
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  await assert.rejects(
    () =>
      decideMaterialRequestUseCase({
        requestId: 11,
        decision: "APPROVE",
        ctoApproverName: "CTO",
      }),
    /Informe a justificativa do CTO para aprovar esta exceção\./,
  );
});

test("APPROVE em PURCHASE_RECOMMENDED sem justificativa funciona", async () => {
  const request = buildPendingRequest({ stockRecommendation: "PURCHASE_RECOMMENDED" });

  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () => request,
      updateMaterialRequest: async (id, patch) => ({ ...request, id, ...patch }),
    },
  });

  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", {
    namedExports: {
      createMaterialRequestHistoryEntry: async (entry) => entry,
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  const result = await decideMaterialRequestUseCase({
    requestId: 10,
    decision: "APPROVE",
    ctoApproverName: "CTO",
  });

  assert.equal(result.request.status, "APPROVED_BY_CTO");
});

test("REJECT sem justificativa funciona", async () => {
  const request = buildPendingRequest({ stockRecommendation: "PURCHASE_NOT_RECOMMENDED" });

  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () => request,
      updateMaterialRequest: async (id, patch) => ({ ...request, id, ...patch }),
    },
  });

  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", {
    namedExports: {
      createMaterialRequestHistoryEntry: async (entry) => entry,
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  const result = await decideMaterialRequestUseCase({
    requestId: 10,
    decision: "REJECT",
    ctoApproverName: "CTO",
  });

  assert.equal(result.request.status, "REJECTED_BY_CTO");
});

test("RETURN_FOR_ADJUSTMENT sem justificativa funciona", async () => {
  const request = buildPendingRequest({ stockRecommendation: "MANUAL_REVIEW_REQUIRED" });

  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () => request,
      updateMaterialRequest: async (id, patch) => ({ ...request, id, ...patch }),
    },
  });

  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", {
    namedExports: {
      createMaterialRequestHistoryEntry: async (entry) => entry,
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  const result = await decideMaterialRequestUseCase({
    requestId: 10,
    decision: "RETURN_FOR_ADJUSTMENT",
    ctoApproverName: "CTO",
  });

  assert.equal(result.request.status, "RETURNED_FOR_ADJUSTMENT");
});

test("cria histórico após decisão", async () => {
  const request = buildPendingRequest();
  let historyPayload;

  mock.module("../../../src/services/sharepoint/repositories/materialRequestRepository.ts", {
    namedExports: {
      getMaterialRequestById: async () => request,
      updateMaterialRequest: async (id, patch) => ({ ...request, id, ...patch }),
    },
  });

  mock.module("../../../src/services/sharepoint/repositories/materialRequestHistoryRepository.ts", {
    namedExports: {
      createMaterialRequestHistoryEntry: async (entry) => {
        historyPayload = entry;
        return entry;
      },
    },
  });

  const { decideMaterialRequestUseCase } = await import(
    "../../../src/application/materialRequest/decideMaterialRequestUseCase.ts"
  );

  await decideMaterialRequestUseCase({
    requestId: 10,
    decision: "REJECT",
    ctoApproverName: "CTO Nome",
    ctoApproverEmail: "cto@empresa.com",
  });

  assert.equal(historyPayload.action, "REJECTED_BY_CTO");
  assert.equal(historyPayload.previousStatus, "PENDING_CTO_APPROVAL");
  assert.equal(historyPayload.newStatus, "REJECTED_BY_CTO");
  assert.equal(historyPayload.performedByName, "CTO Nome");
  assert.equal(historyPayload.performedByEmail, "cto@empresa.com");
});
