import { useEffect, useState } from "react";

import "./index.css";
import { getProjectsPage, UnitFilterLimitError } from "./services/sharepoint/projectsApi";
import type { ProjectRow } from "./services/sharepoint/projectsApi";
import { resolveAuthorization } from "./services/sharepoint/authorizationApi";
import { ProjectsPage } from "./app/pages/ProjectsPage/ProjectsPage";
import { BootstrapLoader } from "./app/components/BootstrapLoader";
import { ToastProvider } from "./app/components/notifications/ToastProvider";

type BootState = "loading" | "ready" | "error";

type BootstrapData = {
  items: ProjectRow[];
  nextLink?: string;
  allowedUnits: string[];
  isAdmin: boolean;
  hasAccess: boolean;
};

const DEFAULT_MIN_BOOT_DURATION_MS_NON_PROD = 3000;
const LOADING_TITLES = ["Carregando solicitações", "Carregando atividades", "Carregando KPIs"];
const LOADING_TITLE_INTERVAL_MS = 1000;

const INITIAL_FILTERS = {
  searchTitle: "",
  status: "",
  unit: "",
  sortBy: "Id" as const,
  sortDir: "desc" as const
};

function getMinBootDurationMs() {
  const rawValue = import.meta.env.VITE_MIN_BOOT_DURATION_MS;
  const parsedValue = Number(rawValue);
  const fallback = import.meta.env.PROD ? 0 : DEFAULT_MIN_BOOT_DURATION_MS_NON_PROD;

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return fallback;
  }

  return parsedValue;
}

export default function App() {
  const [bootState, setBootState] = useState<BootState>("loading");
  const [bootstrapData, setBootstrapData] = useState<BootstrapData>({
    items: [],
    allowedUnits: [],
    isAdmin: false,
    hasAccess: false
  });
  const [bootError, setBootError] = useState("");
  const [loadingTitleIndex, setLoadingTitleIndex] = useState(0);
  const minBootDurationMs = getMinBootDurationMs();

  useEffect(() => {
    if (bootState !== "loading") return;

    const intervalId = window.setInterval(() => {
      setLoadingTitleIndex((currentIndex) => (currentIndex + 1) % LOADING_TITLES.length);
    }, LOADING_TITLE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [bootState]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const bootStartedAt = Date.now();
      setBootState("loading");
      setBootError("");
      setLoadingTitleIndex(0);

      try {
        const authz = await resolveAuthorization();

        if (!authz.hasAccess) {
          const remainingDelay = Math.max(0, minBootDurationMs - (Date.now() - bootStartedAt));
          if (remainingDelay > 0) {
            await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
          }

          if (cancelled) return;
          setBootstrapData({
            items: [],
            nextLink: undefined,
            allowedUnits: authz.allowedUnits,
            isAdmin: authz.isAdmin,
            hasAccess: false
          });
          setBootState("ready");
          return;
        }

        const result = await getProjectsPage({
          top: 15,
          searchTitle: INITIAL_FILTERS.searchTitle,
          statusEquals: INITIAL_FILTERS.status || undefined,
          unitEquals: INITIAL_FILTERS.unit || undefined,
          unitIn: authz.isAdmin ? undefined : authz.allowedUnits,
          orderBy: INITIAL_FILTERS.sortBy,
          orderDir: INITIAL_FILTERS.sortDir
        });

        const remainingDelay = Math.max(0, minBootDurationMs - (Date.now() - bootStartedAt));
        if (remainingDelay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
        }

        if (cancelled) return;
        setBootstrapData({
          ...result,
          allowedUnits: authz.allowedUnits,
          isAdmin: authz.isAdmin,
          hasAccess: true
        });
        setBootState("ready");
      } catch (error) {
        const loadErrorMessage =
          error instanceof UnitFilterLimitError
            ? error.userMessage
            : "Não foi possível carregar as solicitações iniciais. Tente novamente em instantes.";
        if (!(error instanceof UnitFilterLimitError)) {
          console.error(error);
        }

        const remainingDelay = Math.max(0, minBootDurationMs - (Date.now() - bootStartedAt));
        if (remainingDelay > 0) {
          await new Promise((resolve) => window.setTimeout(resolve, remainingDelay));
        }

        if (cancelled) return;
        setBootError(loadErrorMessage);
        setBootState("error");
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [minBootDurationMs]);

  let mainContent;
  if (bootState === "loading") {
    mainContent = (
      <BootstrapLoader title={LOADING_TITLES[loadingTitleIndex]} subtitle="Conectando ao SharePoint..." />
    );
  } else if (bootState === "error") {
    mainContent = (
      <BootstrapLoader
        title="Falha ao iniciar"
        subtitle={bootError || "Não foi possível conectar ao SharePoint no carregamento inicial."}
      />
    );
  } else {
    mainContent = (
      <ProjectsPage
        initialItems={bootstrapData.items}
        initialNextLink={bootstrapData.nextLink}
        allowedUnits={bootstrapData.allowedUnits}
        isAdmin={bootstrapData.isAdmin}
        hasAccess={bootstrapData.hasAccess}
        skipInitialLoad
      />
    );
  }

  return (
    <ToastProvider>
      <div className="capex-app">
        <main className="capex-container">{mainContent}</main>
      </div>
    </ToastProvider>
  );
}
