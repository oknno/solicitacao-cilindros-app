import assert from "node:assert/strict";
import test from "node:test";

import {
  mapMaterialRequestHistoryToSharePointPayload,
  mapSharePointMaterialRequestHistory
} from "../../../src/services/sharepoint/mappers/materialRequestHistoryMapper.ts";

test("mapSharePointMaterialRequestHistory converte RequestId texto para número", () => {
  const mapped = mapSharePointMaterialRequestHistory({
    Id: 10,
    RequestId: "123",
    Action: "UPDATED",
    NewStatus: "DRAFT",
    PerformedByName: "Carlos",
    PerformedAt: "2026-05-25T10:00:00.000Z",
    Comment: ""
  });

  assert.equal(mapped.requestId, 123);
  assert.equal(mapped.comment, undefined);
});

test("mapMaterialRequestHistoryToSharePointPayload salva RequestId como texto e aceita comentário vazio", () => {
  const payload = mapMaterialRequestHistoryToSharePointPayload({
    requestId: 123,
    action: "CREATED",
    newStatus: "DRAFT",
    performedByName: "Carlos",
    performedAt: "2026-05-25T10:00:00.000Z",
    comment: ""
  });

  assert.equal(payload.RequestId, "123");
  assert.equal(payload.Comment, "");
});
