import assert from "node:assert/strict";
import test from "node:test";
import { assertCanDecideMaterialRequest, buildUserAccessProfile, filterMaterialRequestsByAccess } from "../../../src/domain/accessControl/accessPolicy.ts";

const request = (center, requesterEmail = "requester@example.com") => ({ center, requesterEmail });

test("MANAGER visualiza e decide somente solicitações dos centros vinculados", () => {
  const profile = buildUserAccessProfile({ userEmail: "manager@example.com", roles: ["MANAGER"], centers: ["9860"] });
  assert.deepEqual(filterMaterialRequestsByAccess(profile, [request("9860"), request("9999")]).map((item) => item.center), ["9860"]);
  assert.doesNotThrow(() => assertCanDecideMaterialRequest(profile, request("9860"), "LAMINATION_MANAGER"));
  assert.throws(() => assertCanDecideMaterialRequest(profile, request("9999"), "LAMINATION_MANAGER"), /deste centro/);
});

test("CTO visualiza todos os centros sem receber permissões administrativas", () => {
  const profile = buildUserAccessProfile({ userEmail: "cto@example.com", roles: ["CTO"] });
  assert.equal(profile.dataScope, "ALL_CENTERS");
  assert.equal(profile.permissions.canApproveAsCTO, true);
  assert.equal(profile.permissions.canUploadStock, false);
  assert.equal(profile.permissions.canManageAccess, false);
});

test("usuário sem papel configurado recebe fallback USER e visualiza somente solicitações próprias", () => {
  const profile = buildUserAccessProfile({ userEmail: "USER@example.com", roles: [] });
  assert.deepEqual(profile.roles, ["USER"]);
  assert.deepEqual(filterMaterialRequestsByAccess(profile, [request("9860", "user@EXAMPLE.com"), request("9999", "other@example.com")]).map((item) => item.center), ["9860"]);
});

test("MANAGER não visualiza rascunhos e CTO visualiza somente etapas CTO e históricas", () => {
  const manager = buildUserAccessProfile({ userEmail: "manager@example.com", roles: ["MANAGER"], centers: ["9860"] });
  const cto = buildUserAccessProfile({ userEmail: "cto@example.com", roles: ["CTO"] });
  const statuses = ["DRAFT", "PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"];
  const requests = statuses.map((status) => ({ ...request("9860"), status }));

  assert.deepEqual(filterMaterialRequestsByAccess(manager, requests).map((item) => item.status), ["PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);
  assert.deepEqual(filterMaterialRequestsByAccess(cto, requests).map((item) => item.status), ["PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);
});
