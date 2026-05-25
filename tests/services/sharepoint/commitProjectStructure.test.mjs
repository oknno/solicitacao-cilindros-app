import assert from "node:assert/strict";
import test, { mock } from "node:test";

mock.module("../../../src/services/sharepoint/projectsApi.ts", {
  namedExports: {
    updateProject: async () => {},
    deleteProject: async () => {}
  }
});
mock.module("../../../src/services/sharepoint/milestonesApi.ts", {
  namedExports: {
    createMilestone: async () => 1,
    deleteMilestone: async () => {},
    getMilestonesByProject: async () => [],
    updateMilestone: async () => {}
  }
});
mock.module("../../../src/services/sharepoint/activitiesApi.ts", {
  namedExports: {
    createActivity: async () => 1,
    deleteActivity: async () => {},
    getActivitiesBatchByProject: async () => [],
    updateActivity: async () => {}
  }
});
mock.module("../../../src/services/sharepoint/pepsApi.ts", {
  namedExports: {
    createPep: async () => 1,
    deletePep: async () => {},
    getPepsBatchByProject: async () => [],
    updatePep: async () => {}
  }
});

const { CommitProjectStructureError, commitProjectStructure } = await import("../../../src/services/sharepoint/commitProjectStructure.ts");

function makeDraft(overrides = {}) {
  return { Title: "Projeto X", ...overrides };
}

function makeDeps(overrides = {}) {
  const calls = [];
  const log = (name, ...args) => calls.push({ name, args });

  const deps = {
    updateProject: async (...args) => log("updateProject", ...args),
    deleteProject: async (...args) => log("deleteProject", ...args),
    createMilestone: async (...args) => {
      log("createMilestone", ...args);
      return 100 + calls.filter((c) => c.name === "createMilestone").length;
    },
    deleteMilestone: async (...args) => log("deleteMilestone", ...args),
    getMilestonesByProject: async () => [],
    updateMilestone: async (...args) => log("updateMilestone", ...args),
    createActivity: async (...args) => {
      log("createActivity", ...args);
      return 200 + calls.filter((c) => c.name === "createActivity").length;
    },
    deleteActivity: async (...args) => log("deleteActivity", ...args),
    getActivitiesBatchByProject: async () => [],
    updateActivity: async (...args) => log("updateActivity", ...args),
    createPep: async (...args) => {
      log("createPep", ...args);
      return 300 + calls.filter((c) => c.name === "createPep").length;
    },
    deletePep: async (...args) => log("deletePep", ...args),
    getPepsBatchByProject: async () => [],
    updatePep: async (...args) => log("updatePep", ...args),
    ...overrides
  };

  return { deps, calls };
}

test("criação completa persiste projeto, milestones, atividades e PEPs", async () => {
  const { deps, calls } = makeDeps();

  const result = await commitProjectStructure({
    projectId: null,
    normalizedProject: makeDraft(),
    needStructure: true,
    milestones: [{ tempId: "ms_tmp_1", Title: "M1" }],
    activities: [{ tempId: "ac_tmp_1", Title: "A1", milestoneTempId: "ms_tmp_1" }],
    peps: [{ tempId: "pp_tmp_1", Title: "PEP 1", year: 2026, amountBrl: 1000, activityTempId: "ac_tmp_1" }],
    createProject: async () => 77,
    apis: deps
  });

  assert.equal(result.projectId, 77);
  assert.deepEqual(result.journal.milestoneIds, [101]);
  assert.deepEqual(result.journal.activityIds, [201]);
  assert.deepEqual(result.journal.pepIds, [301]);
  assert.equal(result.journal.createdProjectId, 77);
  assert.equal(calls.some((c) => c.name === "createMilestone"), true);
  assert.equal(calls.some((c) => c.name === "createActivity"), true);
  assert.equal(calls.some((c) => c.name === "createPep"), true);
});

test("atualização com estrutura ativa limpa órfãos apenas de atividades e PEPs", async () => {
  const { deps, calls } = makeDeps({
    getMilestonesByProject: async () => [{ Id: 1, Title: "M1" }, { Id: 2, Title: "Órfão" }],
    getActivitiesBatchByProject: async () => [{ Id: 11 }, { Id: 12 }],
    getPepsBatchByProject: async () => [{ Id: 21 }, { Id: 22 }]
  });

  const result = await commitProjectStructure({
    projectId: 9,
    normalizedProject: makeDraft(),
    needStructure: true,
    milestones: [{ tempId: "ms_1", Title: "M1" }, { tempId: "ms_2", Title: "Órfão" }],
    activities: [{ tempId: "ac_11", Title: "A1", milestoneTempId: "ms_1" }],
    peps: [{ tempId: "pp_21", Title: "PEP 21", year: 2026, amountBrl: 50, activityTempId: "ac_11" }],
    createProject: async () => 9,
    apis: deps
  });

  assert.deepEqual(calls.filter((c) => c.name === "deletePep").map((c) => c.args[0]), [22]);
  assert.deepEqual(calls.filter((c) => c.name === "deleteActivity").map((c) => c.args[0]), [12]);
  assert.deepEqual(calls.filter((c) => c.name === "deleteMilestone").map((c) => c.args[0]), []);
  assert.equal(result.journal.diagnostics.some((d) => d.stage === "cleanup-peps" && d.status === "success"), true);
  assert.equal(result.journal.diagnostics.some((d) => d.stage === "cleanup-activities" && d.status === "success"), true);
  assert.equal(result.journal.diagnostics.some((d) => d.stage === "cleanup-milestones"), false);
});

test("transição KEY→não-KEY com purge remove estrutura e mantém somente PEPs desejados", async () => {
  const { deps, calls } = makeDeps({
    getMilestonesByProject: async () => [{ Id: 1, Title: "M1" }, { Id: 2, Title: "M2" }],
    getActivitiesBatchByProject: async () => [{ Id: 11 }, { Id: 12 }],
    getPepsBatchByProject: async () => [{ Id: 21 }, { Id: 22 }]
  });

  await commitProjectStructure({
    projectId: 44,
    normalizedProject: makeDraft(),
    needStructure: false,
    purgeStructureWhenNotNeeded: true,
    milestones: [],
    activities: [{ tempId: "ac_11", Title: "A1", milestoneTempId: "ms_1" }],
    peps: [{ tempId: "pp_21", Title: "PEP 21", year: 2026, amountBrl: 99, activityTempId: "ac_11" }],
    createProject: async () => 44,
    apis: deps
  });

  assert.deepEqual(calls.filter((c) => c.name === "deletePep").map((c) => c.args[0]), [22]);
  assert.deepEqual(calls.filter((c) => c.name === "deleteActivity").map((c) => c.args[0]), [11, 12]);
  assert.deepEqual(calls.filter((c) => c.name === "deleteMilestone").map((c) => c.args[0]), [1, 2]);
  assert.equal(calls.some((c) => c.name === "updatePep" && c.args[0] === 21), true);
});


test("estrutura ativa permite inclusão de marcos", async () => {
  const { deps, calls } = makeDeps({
    getMilestonesByProject: async () => [{ Id: 1, Title: "M1" }]
  });

  await commitProjectStructure({
    projectId: 9,
    normalizedProject: makeDraft(),
    needStructure: true,
    milestones: [{ tempId: "ms_1", Title: "M1" }, { tempId: "ms_tmp_2", Title: "M2" }],
    activities: [],
    peps: [],
    createProject: async () => 9,
    apis: deps
  });

  assert.equal(calls.some((c) => c.name === "createMilestone"), true);
});

test("estrutura ativa permite renomeação e reordenação de marcos", async () => {
  const { deps, calls } = makeDeps({
    getMilestonesByProject: async () => [{ Id: 1, Title: "M1" }, { Id: 2, Title: "M2" }]
  });

  await commitProjectStructure({
    projectId: 9,
    normalizedProject: makeDraft(),
    needStructure: true,
    milestones: [{ tempId: "ms_2", Title: "M2" }, { tempId: "ms_1", Title: "M1 RENOMEADO" }],
    activities: [],
    peps: [],
    createProject: async () => 9,
    apis: deps
  });

  assert.equal(calls.some((c) => c.name === "updateMilestone"), true);
});

test("estrutura ativa permite operações em marcos, atividades e PEPs", async () => {
  const { deps, calls } = makeDeps({
    getMilestonesByProject: async () => [{ Id: 1, Title: "M1" }, { Id: 2, Title: "M2" }],
    getActivitiesBatchByProject: async () => [{ Id: 11 }, { Id: 12 }],
    getPepsBatchByProject: async () => [{ Id: 21 }, { Id: 22 }]
  });

  await commitProjectStructure({
    projectId: 9,
    normalizedProject: makeDraft(),
    needStructure: true,
    milestones: [{ tempId: "ms_a", Title: "M1" }, { tempId: "ms_b", Title: "M2" }],
    activities: [
      { tempId: "ac_11", Title: "A1", milestoneTempId: "ms_a" },
      { tempId: "ac_tmp_2", Title: "A2", milestoneTempId: "ms_b" }
    ],
    peps: [{ tempId: "pp_21", Title: "PEP 21", year: 2026, amountBrl: 200, activityTempId: "ac_11" }],
    createProject: async () => 9,
    apis: deps
  });

  assert.equal(calls.some((c) => c.name === "createMilestone"), true);
  assert.equal(calls.some((c) => c.name === "createActivity"), true);
  assert.deepEqual(calls.filter((c) => c.name === "deleteActivity").map((c) => c.args[0]), [12]);
  assert.deepEqual(calls.filter((c) => c.name === "deletePep").map((c) => c.args[0]), [22]);
});
test("erro em etapa intermediária retorna CommitProjectStructureError com journal e failedStep", async () => {
  const { deps } = makeDeps({
    updateActivity: async () => {
      throw new Error("falha ao atualizar activity");
    }
  });

  await assert.rejects(
    commitProjectStructure({
      projectId: null,
      normalizedProject: makeDraft(),
      needStructure: true,
      milestones: [{ tempId: "ms_tmp_1", Title: "M1" }],
      activities: [{ tempId: "ac_11", Title: "A1", milestoneTempId: "ms_tmp_1" }],
      peps: [{ tempId: "pp_tmp_1", Title: "PEP", year: 2026, amountBrl: 10, activityTempId: "ac_11" }],
      createProject: async () => 501,
      apis: {
        ...deps,
        getActivitiesBatchByProject: async () => [{ Id: 11 }]
      }
    }),
    (error) => {
      assert.equal(error instanceof CommitProjectStructureError, true);
      assert.equal(error.failedStep?.entity, "activity");
      assert.equal(error.failedStep?.stage, "upsert-activities");
      assert.equal(error.rollback.status, "complete");
      assert.equal(error.rollback.summary.attempts, 2);
      assert.equal(error.rollback.summary.failed, 0);
      assert.equal(error.journal.diagnostics.some((d) => d.status === "failed" && d.stage === "upsert-activities"), true);
      return true;
    }
  );
});

test("rollback parcial expõe summary consistente para auditoria", async () => {
  const { deps } = makeDeps({
    updatePep: async () => {
      throw new Error("falha ao atualizar pep");
    },
    deleteActivity: async () => {
      throw new Error("falha no rollback da activity");
    }
  });

  await assert.rejects(
    commitProjectStructure({
      projectId: null,
      normalizedProject: makeDraft(),
      needStructure: true,
      milestones: [{ tempId: "ms_tmp_1", Title: "M1" }],
      activities: [{ tempId: "ac_tmp_1", Title: "A1", milestoneTempId: "ms_tmp_1" }],
      peps: [{ tempId: "pp_900", Title: "PEP existente", year: 2026, amountBrl: 10, activityTempId: "ac_tmp_1" }],
      createProject: async () => 777,
      apis: deps
    }),
    (error) => {
      assert.equal(error instanceof CommitProjectStructureError, true);
      assert.equal(error.failedStep?.entity, "pep");
      assert.equal(error.failedStep?.stage, "upsert-peps");
      assert.equal(error.rollback.status, "partial");
      assert.deepEqual(error.rollback.summary, {
        attempts: 3,
        failed: 1,
        succeeded: 2,
        failedByEntity: { activity: 1 }
      });
      assert.deepEqual(error.details?.rollbackPartialSummary, error.rollback.summary);
      assert.equal(error.journal.diagnostics.some((d) => d.phase === "rollback" && d.status === "failed" && d.entity === "activity"), true);
      return true;
    }
  );
});
