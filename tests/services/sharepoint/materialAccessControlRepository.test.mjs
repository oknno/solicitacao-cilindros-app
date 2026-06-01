import assert from "node:assert/strict";
import test from "node:test";
import { mapSharePointMaterialAccessControlItem } from "../../../src/services/sharepoint/materialAccessControlRepository.ts";

test("mapeia somente linha ativa válida normalizando e-mail, papel e centro", () => {
  assert.deepEqual(mapSharePointMaterialAccessControlItem({ Id: 7, Title: " gestor ", UserEmail: " Gestor@Empresa.com ", Role: " manager ", Center: " 9860 ", IsActive: " true " }), {
    id: 7, title: "gestor", userEmail: "gestor@empresa.com", role: "MANAGER", center: "9860",
  });
});

test("ignora linhas inativas, sem e-mail ou com papel inválido", () => {
  assert.equal(mapSharePointMaterialAccessControlItem({ UserEmail: "a@b.com", Role: "ADMIN", IsActive: "FALSE" }), null);
  assert.equal(mapSharePointMaterialAccessControlItem({ UserEmail: "", Role: "ADMIN", IsActive: "TRUE" }), null);
  assert.equal(mapSharePointMaterialAccessControlItem({ UserEmail: "a@b.com", Role: "OWNER", IsActive: "TRUE" }), null);
});
