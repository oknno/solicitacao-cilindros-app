import assert from "node:assert/strict";
import test from "node:test";

import { formatDateTime } from "../../src/app/components/materialRequest/materialRequestSummaryFormatters.ts";

test("formatDateTime formata data ISO válida em dd/MM/yyyy, HH:mm", () => {
  assert.equal(formatDateTime("2026-06-11T14:35:00Z"), "11/06/2026, 14:35");
});

test("formatDateTime retorna fallback para valor ausente ou inválido", () => {
  assert.equal(formatDateTime(undefined), "-");
  assert.equal(formatDateTime(null), "-");
  assert.equal(formatDateTime(""), "-");
  assert.equal(formatDateTime("data inválida"), "-");
});
