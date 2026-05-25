import assert from "node:assert/strict";
import test from "node:test";

import {
  mapMaterialRequestToSharePointPayload,
  mapSharePointMaterialRequest
} from "../../../src/services/sharepoint/mappers/materialRequestMapper.ts";

test("mapSharePointMaterialRequest converte RequestedQuantity texto para número", () => {
  const mapped = mapSharePointMaterialRequest({
    Id: 1,
    Title: "Solicitação 1",
    RequesterName: "João",
    Material: "MAT-001",
    MaterialDescription: "Material",
    Center: "C100",
    RequestedQuantity: "10",
    EvaluatedStockTotal: "25,5",
    StockRecommendation: "REQUEST_JUSTIFICATION_REQUIRED",
    RequestReason: "Reposição",
    RequestStatus: "DRAFT"
  });

  assert.equal(mapped.requestedQuantity, 10);
  assert.equal(mapped.evaluatedStockTotalAtRequest, 25.5);
});

test("mapSharePointMaterialRequest retorna null para EvaluatedStockTotal vazio", () => {
  const mapped = mapSharePointMaterialRequest({
    Id: 2,
    RequesterName: "Maria",
    Material: "MAT-002",
    MaterialDescription: "Material 2",
    Center: "C200",
    RequestedQuantity: "5",
    EvaluatedStockTotal: "",
    StockRecommendation: "NO_STOCK",
    RequestReason: "Urgência",
    RequestStatus: "PENDING_CTO_APPROVAL"
  });

  assert.equal(mapped.evaluatedStockTotalAtRequest, null);
});

test("mapMaterialRequestToSharePointPayload converte números para texto e preserva status técnicos", () => {
  const payload = mapMaterialRequestToSharePointPayload({
    requesterName: "Ana",
    requesterEmail: "ana@empresa.com",
    materialCode: "MAT-003",
    materialDescription: "Material 3",
    center: "C300",
    requestedQuantity: 12,
    evaluatedStockTotalAtRequest: 30.75,
    stockRecommendation: "REQUEST_JUSTIFICATION_REQUIRED",
    requestReason: "Projeto",
    status: "APPROVED_BY_CTO",
    ctoApproverName: "Diretor CTO",
    ctoApproverEmail: "cto@empresa.com",
    ctoJustification: "Aprovado por exceção",
    ctoDecisionDate: "2026-05-25T12:00:00.000Z"
  });

  assert.equal(payload.RequestedQuantity, "12");
  assert.equal(payload.EvaluatedStockTotal, "30.75");
  assert.equal(payload.RequestStatus, "APPROVED_BY_CTO");
  assert.equal(payload.StockRecommendation, "REQUEST_JUSTIFICATION_REQUIRED");
  assert.equal(payload.CTOApproverName, "Diretor CTO");
  assert.equal(payload.CTOApproverEmail, "cto@empresa.com");
  assert.equal(payload.CTOJustification, "Aprovado por exceção");
  assert.equal(payload.CTODecisionDate, "2026-05-25T12:00:00.000Z");
  assert.equal("CtoApproverName" in payload, false);
  assert.equal("CtoApproverEmail" in payload, false);
  assert.equal("CtoJustification" in payload, false);
  assert.equal("CtoDecisionDate" in payload, false);
});
