import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("approveProject exige admin, status Em Aprovação e Código SAP", async () => {
  let lastUpdate = null;

  mock.module("../../../src/services/sharepoint/projectsApi.ts", {
    namedExports: {
      updateProject: async (id, payload) => {
        lastUpdate = { id, payload };
      }
    }
  });

  const { approveProject } = await import("../../../src/services/sharepoint/projectsWorkflow.ts");

  await assert.rejects(
    () => approveProject({ Id: 1, Title: "P", status: "Em Aprovação" }, { isAdmin: false, codigoSAP: "SAP-1" }),
    /Apenas administradores/
  );

  await assert.rejects(
    () => approveProject({ Id: 1, Title: "P", status: "Rascunho" }, { isAdmin: true, codigoSAP: "SAP-1" }),
    /Somente projetos com status Em Aprovação/
  );

  await assert.rejects(
    () => approveProject({ Id: 1, Title: "P", status: "Em Aprovação" }, { isAdmin: true, codigoSAP: "   " }),
    /Código SAP é obrigatório/
  );

  const result = await approveProject({ Id: 10, Title: "Projeto 10", status: "Em Aprovação" }, { isAdmin: true, codigoSAP: " SAP-900 " });

  assert.deepEqual(result, { newStatus: "Aprovado" });
  assert.deepEqual(lastUpdate, { id: 10, payload: { status: "Aprovado", codigoSAP: "SAP-900" } });
});

test("rejectProject exige admin e status Em Aprovação", async () => {
  mock.reset();
  let lastUpdate = null;

  mock.module("../../../src/services/sharepoint/projectsApi.ts", {
    namedExports: {
      updateProject: async (id, payload) => {
        lastUpdate = { id, payload };
      }
    }
  });

  const { rejectProject } = await import("../../../src/services/sharepoint/projectsWorkflow.ts?reject-case");

  await assert.rejects(
    () => rejectProject({ Id: 2, Title: "P2", status: "Aprovado" }, { isAdmin: true }),
    /Somente projetos com status Em Aprovação/
  );

  const result = await rejectProject({ Id: 9, Title: "Projeto 9", status: "Em Aprovação" }, { isAdmin: true });

  assert.deepEqual(result, { newStatus: "Reprovado" });
  assert.deepEqual(lastUpdate, { id: 9, payload: { status: "Reprovado" } });
});

test("sendToApproval permite reenviar projeto Reprovado e muda para Em Aprovação", async () => {
  mock.reset();
  let lastUpdate = null;

  mock.module("../../../src/services/sharepoint/projectsApi.ts", {
    namedExports: {
      updateProject: async (id, payload) => {
        lastUpdate = { id, payload };
      }
    }
  });

  const { sendToApproval } = await import("../../../src/services/sharepoint/projectsWorkflow.ts?resend-case");
  const result = await sendToApproval({ Id: 7, Title: "Projeto 7", status: "Reprovado" });

  assert.deepEqual(result, { newStatus: "Em Aprovação" });
  assert.deepEqual(lastUpdate, { id: 7, payload: { status: "Em Aprovação" } });
});
