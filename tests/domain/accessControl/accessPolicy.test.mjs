import assert from "node:assert/strict";
import test from "node:test";
import { assertCanDecideMaterialRequest, buildUserAccessProfile, filterMaterialRequestsByAccess } from "../../../src/domain/accessControl/accessPolicy.ts";

const request = (center, requesterEmail = "requester@example.com", status = "PENDING_LAMINATION_MANAGER_APPROVAL") => ({ center, requesterEmail, status });

test("USER visualiza solicitações enviadas dos centros vinculados sem depender do solicitante", () => {
  const profile = buildUserAccessProfile({ userEmail: "user@example.com", roles: ["USER"], centers: ["9860"] });
  const requests = [
    request("9860", "other@example.com", "PENDING_LAMINATION_MANAGER_APPROVAL"),
    request("9860", "another@example.com", "PENDING_CTO_APPROVAL"),
    request("9860", "other@example.com", "APPROVED"),
    request("9860", "other@example.com", "REJECTED"),
    request("9999", "other@example.com", "APPROVED"),
  ];

  assert.equal(profile.dataScope, "ASSIGNED_CENTERS");
  assert.deepEqual(filterMaterialRequestsByAccess(profile, requests).map((item) => item.status), [
    "PENDING_LAMINATION_MANAGER_APPROVAL",
    "PENDING_CTO_APPROVAL",
    "APPROVED",
    "REJECTED",
  ]);
});

test("USER e MANAGER visualizam DRAFT e RETURNED_TO_DRAFT somente quando são criadores", () => {
  const user = buildUserAccessProfile({ userEmail: "user@example.com", roles: ["USER"], centers: ["9860"] });
  const manager = buildUserAccessProfile({ userEmail: "manager@example.com", roles: ["MANAGER"], centers: ["9860"] });
  const requests = [
    request("9860", "user@example.com", "DRAFT"),
    request("9860", "other@example.com", "DRAFT"),
    request("9860", "manager@example.com", "RETURNED_TO_DRAFT"),
    request("9860", "other@example.com", "RETURNED_TO_DRAFT"),
  ];

  assert.deepEqual(filterMaterialRequestsByAccess(user, requests).map((item) => item.requesterEmail), ["user@example.com"]);
  assert.deepEqual(filterMaterialRequestsByAccess(manager, requests).map((item) => item.requesterEmail), ["manager@example.com"]);
});

test("MANAGER visualiza e decide somente solicitações dos centros vinculados", () => {
  const profile = buildUserAccessProfile({ userEmail: "manager@example.com", roles: ["MANAGER"], centers: ["9860"] });
  assert.deepEqual(filterMaterialRequestsByAccess(profile, [request("9860", "other@example.com"), request("9999", "other@example.com")]).map((item) => item.center), ["9860"]);
  assert.doesNotThrow(() => assertCanDecideMaterialRequest(profile, request("9860", "other@example.com"), "LAMINATION_MANAGER"));
  assert.throws(() => assertCanDecideMaterialRequest(profile, request("9999", "other@example.com"), "LAMINATION_MANAGER"), /deste centro/);
});

test("USER sem centro mantém fallback seguro e visualiza somente solicitações próprias", () => {
  const profile = buildUserAccessProfile({ userEmail: "USER@example.com", roles: [] });
  assert.deepEqual(profile.roles, ["USER"]);
  assert.equal(profile.dataScope, "OWN_REQUESTS");
  assert.deepEqual(filterMaterialRequestsByAccess(profile, [request("9860", "user@EXAMPLE.com"), request("9999", "other@example.com")]).map((item) => item.center), ["9860"]);
});

test("MANAGER não visualiza rascunhos de terceiros e CTO visualiza somente etapas CTO e históricas", () => {
  const manager = buildUserAccessProfile({ userEmail: "manager@example.com", roles: ["MANAGER"], centers: ["9860"] });
  const cto = buildUserAccessProfile({ userEmail: "cto@example.com", roles: ["CTO"] });
  const statuses = ["DRAFT", "RETURNED_TO_DRAFT", "PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"];
  const requests = statuses.map((status) => ({ ...request("9860", "other@example.com"), status }));

  assert.deepEqual(filterMaterialRequestsByAccess(manager, requests).map((item) => item.status), ["PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);
  assert.deepEqual(filterMaterialRequestsByAccess(cto, requests).map((item) => item.status), ["PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"]);
});

test("ADMIN visualiza todos os centros e status", () => {
  const admin = buildUserAccessProfile({ userEmail: "admin@example.com", roles: ["ADMIN"] });
  const statuses = ["DRAFT", "RETURNED_TO_DRAFT", "PENDING_LAMINATION_MANAGER_APPROVAL", "PENDING_CTO_APPROVAL", "APPROVED", "REJECTED"];
  const requests = statuses.map((status, index) => request(String(9800 + index), "other@example.com", status));

  assert.deepEqual(filterMaterialRequestsByAccess(admin, requests).map((item) => item.status), statuses);
});
