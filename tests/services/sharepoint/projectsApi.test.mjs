import assert from "node:assert/strict";
import test, { mock } from "node:test";

import {
  buildProjectsQueryPlan,
  mergeProjectChunkResults,
  UnitFilterLimitError
} from "../../../src/services/sharepoint/projectsQueryPlanner.ts";

test("buildProjectsQueryPlan mantém GET simples com poucas unidades", () => {
  const plan = buildProjectsQueryPlan({
    top: 15,
    orderExpr: "Id desc",
    searchTitle: "CAPEX",
    unitIn: ["U1", "U2", "U3"]
  });

  assert.equal(plan.mode, "single");
  assert.match(plan.filters ?? "", /substringof\('CAPEX',Title\)/);
  assert.match(plan.filters ?? "", /unit eq 'U1'/);
  assert.match(plan.filters ?? "", /unit eq 'U3'/);
});

test("buildProjectsQueryPlan entra em modo chunked com muitas unidades", () => {
  const units = Array.from({ length: 33 }, (_, idx) => `UNIT-${idx + 1}`);

  const plan = buildProjectsQueryPlan({
    top: 15,
    orderExpr: "Id desc",
    statusEquals: "Aprovado",
    unitIn: units
  });

  assert.equal(plan.mode, "chunked");
  assert.equal(plan.chunkFilters.length, 3);
  assert.match(plan.chunkFilters[0], /status eq 'Aprovado'/);
  assert.match(plan.chunkFilters[2], /UNIT-33/);
});

test("mergeProjectChunkResults deduplica, ordena e aplica top final", () => {
  const merged = mergeProjectChunkResults({
    chunks: [
      [
        { Id: 2, Title: "Projeto B", approvalYear: 2024 },
        { Id: 9, Title: "Projeto Z", approvalYear: 2025 }
      ],
      [
        { Id: 2, Title: "Projeto B duplicado", approvalYear: 2023 },
        { Id: 5, Title: "Projeto M", approvalYear: 2026 }
      ]
    ],
    orderBy: "Id",
    orderDir: "desc",
    top: 2
  });

  assert.deepEqual(
    merged.map((item) => item.Id),
    [9, 5]
  );
});

test("buildProjectsQueryPlan lança erro específico quando limite de unidades é excedido", () => {
  const units = Array.from({ length: 181 }, (_, idx) => `UNIT-${idx + 1}`);

  assert.throws(
    () =>
      buildProjectsQueryPlan({
        top: 15,
        orderExpr: "Id desc",
        unitIn: units
      }),
    (error) => error instanceof UnitFilterLimitError
  );
});

test("getProjectsPage em modo chunked mantém paginação, deduplicação e ordenação entre chunks", async () => {
  const unitIn = Array.from({ length: 30 }, (_, idx) => `UNIT-${idx + 1}`);
  const chunk1Filter = `(${unitIn.slice(0, 15).map((unit) => `unit eq '${unit}'`).join(" or ")})`;
  const chunk2Filter = `(${unitIn.slice(15).map((unit) => `unit eq '${unit}'`).join(" or ")})`;

  const firstChunk1UrlPart = `$filter=${chunk1Filter}`;
  const firstChunk2UrlPart = `$filter=${chunk2Filter}`;
  const nextChunk1 = "https://sharepoint.local/chunk1/page2";
  const nextChunk2 = "https://sharepoint.local/chunk2/page2";
  const calls = [];

  mock.module("../../../src/services/sharepoint/spConfig.ts", {
    namedExports: {
      spConfig: { siteUrl: "https://sharepoint.local", projectsListTitle: "Projetos" }
    }
  });
  mock.module("../../../src/services/sharepoint/listSchemaCache.ts", {
    namedExports: {
      getListFieldsCached: async () => null
    }
  });
  mock.module("../../../src/services/sharepoint/spHttp.ts", {
    namedExports: {
      spGetJson: async (url) => {
        calls.push(url);

        if (url.includes(firstChunk1UrlPart)) {
          return {
            value: [
              { Id: 11, Title: "P11" },
              { Id: 13, Title: "P13" },
              { Id: 15, Title: "P15" },
              { Id: 17, Title: "P17" },
              { Id: 19, Title: "P19" },
              { Id: 21, Title: "P21" },
              { Id: 23, Title: "P23" },
              { Id: 25, Title: "P25" },
              { Id: 27, Title: "P27" },
              { Id: 29, Title: "P29" }
            ],
            "@odata.nextLink": nextChunk1
          };
        }
        if (url.includes(firstChunk2UrlPart)) {
          return {
            value: [
              { Id: 12, Title: "P12" },
              { Id: 13, Title: "P13-dup" },
              { Id: 14, Title: "P14" },
              { Id: 16, Title: "P16" },
              { Id: 18, Title: "P18" },
              { Id: 20, Title: "P20" },
              { Id: 22, Title: "P22" },
              { Id: 24, Title: "P24" },
              { Id: 26, Title: "P26" },
              { Id: 28, Title: "P28" }
            ],
            "@odata.nextLink": nextChunk2
          };
        }
        if (url === nextChunk1) {
          return {
            value: [{ Id: 30, Title: "P30" }, { Id: 32, Title: "P32" }, { Id: 34, Title: "P34" }]
          };
        }
        if (url === nextChunk2) {
          return {
            value: [{ Id: 31, Title: "P31" }, { Id: 33, Title: "P33" }, { Id: 35, Title: "P35" }]
          };
        }
        throw new Error(`URL inesperada: ${url}`);
      },
      spPostJson: async () => ({}),
      spPatchJson: async () => ({}),
      getDigest: async () => "digest"
    }
  });

  const { getProjectsPage } = await import("../../../src/services/sharepoint/projectsApi.ts");

  const firstPage = await getProjectsPage({
    top: 15,
    unitIn,
    orderBy: "Id",
    orderDir: "desc"
  });

  assert.equal(Boolean(firstPage.nextLink), true);
  assert.equal(firstPage.items.length, 15);
  assert.deepEqual(
    firstPage.items.map((item) => item.Id),
    [29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15]
  );

  const secondPage = await getProjectsPage({ nextLink: firstPage.nextLink });
  const concatenated = firstPage.items.concat(secondPage.items);

  assert.deepEqual(
    concatenated.map((item) => item.Id),
    [
      29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 35, 34, 33, 32, 31, 30, 14, 13, 12, 11
    ]
  );
  assert.equal(new Set(concatenated.map((item) => item.Id)).size, concatenated.length);
  assert.equal(secondPage.nextLink, undefined);
  assert.equal(calls.includes(nextChunk1), true);
  assert.equal(calls.includes(nextChunk2), true);
});
