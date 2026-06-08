import assert from "node:assert/strict";
import test from "node:test";

import { buildUserAccessProfile } from "../../../src/domain/accessControl/accessPolicy.ts";
import { getMaterialRequestCommandPermissions } from "../../../src/domain/permissions/commandBarPolicy.ts";

const requester = buildUserAccessProfile({ userEmail: "user@empresa.com", roles: ["USER"], centers: ["4000"] });

function permissionsFor(status, profile = requester, selectedRequesterEmail = "user@empresa.com", selectedCenter = "4000") {
  return getMaterialRequestCommandPermissions({
    accessProfile: profile,
    hasSelection: true,
    selectedStatus: status,
    selectedRequesterEmail,
    selectedCenter,
  });
}

test("solicitante pode voltar status somente enquanto a solicitação aguarda o gerente", () => {
  assert.equal(permissionsFor("PENDING_LAMINATION_MANAGER_APPROVAL").canReturnStatus, true);
  assert.equal(permissionsFor("PENDING_CTO_APPROVAL").canReturnStatus, false);
  assert.equal(permissionsFor("DRAFT").canReturnStatus, false);
  assert.equal(permissionsFor("RETURNED_TO_DRAFT").canReturnStatus, false);
});

test("RETURNED_TO_DRAFT permanece editável e reenviável pelo solicitante", () => {
  const returnedToDraft = permissionsFor("RETURNED_TO_DRAFT");
  assert.equal(returnedToDraft.canEdit, true);
  assert.equal(returnedToDraft.canSubmit, true);
});

test("USER não pode aprovar ou reprovar solicitações visíveis", () => {
  const pending = permissionsFor("PENDING_LAMINATION_MANAGER_APPROVAL", requester, "other@empresa.com", "4000");

  assert.equal(pending.canShowApprove, false);
  assert.equal(pending.canApprove, false);
  assert.equal(pending.canReject, false);
});

test("MANAGER aprova somente solicitação pendente de gerente em centro vinculado", () => {
  const manager = buildUserAccessProfile({ userEmail: "manager@empresa.com", roles: ["MANAGER"], centers: ["4000"] });

  assert.equal(permissionsFor("PENDING_LAMINATION_MANAGER_APPROVAL", manager, "other@empresa.com", "4000").canApprove, true);
  assert.equal(permissionsFor("PENDING_LAMINATION_MANAGER_APPROVAL", manager, "other@empresa.com", "4100").canApprove, false);
  assert.equal(permissionsFor("PENDING_CTO_APPROVAL", manager, "other@empresa.com", "4000").canApprove, false);
});

test("CTO aprova somente solicitação pendente de CTO", () => {
  const cto = buildUserAccessProfile({ userEmail: "cto@empresa.com", roles: ["CTO"] });

  assert.equal(permissionsFor("PENDING_CTO_APPROVAL", cto, "other@empresa.com", "4000").canApprove, true);
  assert.equal(permissionsFor("PENDING_LAMINATION_MANAGER_APPROVAL", cto, "other@empresa.com", "4000").canApprove, false);
});
