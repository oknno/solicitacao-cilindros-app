import assert from "node:assert/strict";
import test from "node:test";

import { escapeODataFilterLiterals } from "../../../src/services/sharepoint/odataFilter.ts";

test("mantém operadores OData intactos em filtro simples sem literal", () => {
  const filter = "projectsIdId eq 123";

  assert.equal(escapeODataFilterLiterals(filter), "projectsIdId eq 123");
});

test("escapa apenas literais em filtro composto", () => {
  const filter = "(Title eq 'CAPEX 2026') or (Owner eq 'O''Brien')";

  assert.equal(
    escapeODataFilterLiterals(filter),
    "(Title eq 'CAPEX%202026') or (Owner eq 'O''Brien')"
  );
});
