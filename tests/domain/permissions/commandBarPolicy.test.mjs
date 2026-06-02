import assert from "node:assert/strict";
import test from "node:test";

import { buildUserAccessProfile } from "../../../src/domain/accessControl/accessPolicy.ts";
import { getMaterialRequestCommandPermissions } from "../../../src/domain/permissions/commandBarPolicy.ts";

const requester = buildUserAccessProfile({ userEmail: "user@empresa.com", roles: ["USER"] });

function permissionsFor(status) {
  return getMaterialRequestCommandPermissions({
    accessProfile: requester,
    hasSelection: true,
    selectedStatus: status,
    selectedRequesterEmail: "user@empresa.com",
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
