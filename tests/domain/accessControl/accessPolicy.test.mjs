import assert from "node:assert/strict";
import test from "node:test";
import { assertCanDecideMaterialRequest, buildUserAccessProfile, canAccessMaterialRequest, filterMaterialRequestsByAccess } from "../../../src/domain/accessControl/accessPolicy.ts";

const request = (center, requesterEmail = "requester@example.com", status = "PENDING_LAMINATION_MANAGER_APPROVAL") => ({ center, requesterEmail, status });
const allStatuses = ["DRAFT", "RETURNED_TO_DRAFT", "PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"];

test("USER centro 4000 visualiza todos os status do centro sem depender do solicitante", () => {
  const profile = buildUserAccessProfile({ userEmail: "matheus@example.com", roles: ["USER"], centers: ["4000"] });
  const requests = [
    ...allStatuses.map((status) => request("4000", "ebert@example.com", status)),
    request("4100", "ebert@example.com", "DRAFT"),
    request("4100", "ebert@example.com", "APPROVED"),
  ];

  assert.equal(profile.dataScope, "ASSIGNED_CENTERS");
  assert.deepEqual(filterMaterialRequestsByAccess(profile, requests).map((item) => item.status), allStatuses);
});

test("USER centro 4000 visualiza DRAFT, RETURNED_TO_DRAFT e pendência gerencial criados por outro usuário", () => {
  const profile = buildUserAccessProfile({ userEmail: "matheus@example.com", roles: ["USER"], centers: ["4000"] });

  assert.equal(canAccessMaterialRequest(profile, request("4000", "ebert@example.com", "DRAFT")), true);
  assert.equal(canAccessMaterialRequest(profile, request("4000", "ebert@example.com", "RETURNED_TO_DRAFT")), true);
  assert.equal(canAccessMaterialRequest(profile, request("4000", "ebert@example.com", "PENDING_LAMINATION_MANAGER_APPROVAL")), true);
  assert.equal(canAccessMaterialRequest(profile, request("4100", "ebert@example.com", "DRAFT")), false);
});

test("USER sem centro mantém fallback seguro e visualiza somente solicitações próprias", () => {
  const profile = buildUserAccessProfile({ userEmail: "USER@example.com", roles: [] });
  assert.deepEqual(profile.roles, ["USER"]);
  assert.equal(profile.dataScope, "OWN_REQUESTS");
  assert.deepEqual(filterMaterialRequestsByAccess(profile, [request("9860", "user@EXAMPLE.com"), request("9999", "other@example.com")]).map((item) => item.center), ["9860"]);
});

test("USER centro 4000 não aprova nem reprova", () => {
  const profile = buildUserAccessProfile({ userEmail: "user@example.com", roles: ["USER"], centers: ["4000"] });

  assert.throws(() => assertCanDecideMaterialRequest(profile, request("4000", "other@example.com"), "LAMINATION_MANAGER"), /não possui permissão/);
  assert.throws(() => assertCanDecideMaterialRequest(profile, request("4000", "other@example.com", "PENDING_CTO_APPROVAL"), "CTO"), /não possui permissão/);
});

test("MANAGER visualiza e decide somente solicitações dos centros vinculados", () => {
  const profile = buildUserAccessProfile({ userEmail: "manager@example.com", roles: ["MANAGER"], centers: ["9860"] });
  assert.deepEqual(filterMaterialRequestsByAccess(profile, [request("9860", "other@example.com"), request("9999", "other@example.com")]).map((item) => item.center), ["9860"]);
  assert.doesNotThrow(() => assertCanDecideMaterialRequest(profile, request("9860", "other@example.com"), "LAMINATION_MANAGER"));
  assert.throws(() => assertCanDecideMaterialRequest(profile, request("9999", "other@example.com"), "LAMINATION_MANAGER"), /deste centro/);
});

test("MANAGER centro 4000 não visualiza DRAFT nem RETURNED_TO_DRAFT", () => {
  const manager = buildUserAccessProfile({ userEmail: "manager@example.com", roles: ["MANAGER"], centers: ["4000"] });
  const requests = allStatuses.map((status) => request("4000", "other@example.com", status));

  assert.deepEqual(filterMaterialRequestsByAccess(manager, requests).map((item) => item.status), ["PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);
});

test("CTO não visualiza DRAFT, RETURNED_TO_DRAFT nem PENDING_LAMINATION_MANAGER_APPROVAL", () => {
  const cto = buildUserAccessProfile({ userEmail: "cto@example.com", roles: ["CTO"] });
  const requests = allStatuses.map((status) => request("4000", "other@example.com", status));

  assert.deepEqual(filterMaterialRequestsByAccess(cto, requests).map((item) => item.status), ["PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);
});

test("ADMIN visualiza todos os centros e status", () => {
  const admin = buildUserAccessProfile({ userEmail: "admin@example.com", roles: ["ADMIN"] });
  const requests = allStatuses.map((status, index) => request(String(9800 + index), "other@example.com", status));

  assert.deepEqual(filterMaterialRequestsByAccess(admin, requests).map((item) => item.status), allStatuses);
});
