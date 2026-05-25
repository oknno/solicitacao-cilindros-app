import assert from "node:assert/strict";
import test, { mock } from "node:test";

test("resolveAuthorization concede acesso total quando usuário está em UnitGroups/ADMIN", async () => {
  mock.module("../../../src/services/sharepoint/spConfig.ts", {
    namedExports: {
      spConfig: { siteUrl: "https://sharepoint.local" }
    }
  });

  mock.module("../../../src/services/sharepoint/spHttp.ts", {
    namedExports: {
      spGetJson: async (url) => {
        if (url.includes("/_api/web/currentuser?")) {
          return { Id: 77, IsSiteAdmin: false };
        }

        if (url.includes("/_api/web/currentuser/groups?")) {
          return { value: [{ Id: 301, Title: "Visitantes" }] };
        }

        if (url.includes("/lists/getbytitle('UnitGroups')/items?")) {
          return {
            value: [
              { Title: "ADMIN", members: [{ Id: 301, Title: "Grupo 301" }] },
              { Title: "FIN", members: [{ Id: 900, Title: "Outro" }] }
            ]
          };
        }

        throw new Error(`URL inesperada: ${url}`);
      }
    }
  });

  const { resolveAuthorization } = await import("../../../src/services/sharepoint/authorizationApi.ts");

  const result = await resolveAuthorization();

  assert.deepEqual(result, { isAdmin: true, hasAccess: true, allowedUnits: [] });
});

test("resolveAuthorization não promove para admin quando título não é exatamente ADMIN", async () => {
  mock.reset();

  mock.module("../../../src/services/sharepoint/spConfig.ts", {
    namedExports: {
      spConfig: { siteUrl: "https://sharepoint.local" }
    }
  });

  mock.module("../../../src/services/sharepoint/spHttp.ts", {
    namedExports: {
      spGetJson: async (url) => {
        if (url.includes("/_api/web/currentuser?")) {
          return { Id: 42, IsSiteAdmin: false };
        }

        if (url.includes("/_api/web/currentuser/groups?")) {
          return { value: [] };
        }

        if (url.includes("/lists/getbytitle('UnitGroups')/items?")) {
          return {
            value: [
              { Title: "Admin", members: [{ Id: 42, Title: "Usuário" }] },
              { Title: "ENG", members: [{ Id: 42, Title: "Usuário" }] }
            ]
          };
        }

        throw new Error(`URL inesperada: ${url}`);
      }
    }
  });

  const { resolveAuthorization } = await import("../../../src/services/sharepoint/authorizationApi.ts?case-sensitive-admin");

  const result = await resolveAuthorization();

  assert.deepEqual(result, { isAdmin: false, hasAccess: true, allowedUnits: ["Admin", "ENG"] });
});
