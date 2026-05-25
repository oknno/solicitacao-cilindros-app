import { useCallback, useMemo, useState } from "react";

import { getProjectsPage, UnitFilterLimitError } from "../../../../services/sharepoint/projectsApi";
import type { ProjectRow } from "../../../../services/sharepoint/projectsApi";
import type { ProjectsFilters } from "../CommandBar";
import { normalizeError } from "../../../../application/errors/appError";

export type LoadState = "idle" | "loading" | "error";

type UseProjectsListDeps = {
  getProjectsPage: typeof getProjectsPage;
};

type UseProjectsListOptions = {
  initialItems?: ProjectRow[];
  initialNextLink?: string;
  initialState?: LoadState;
  allowedUnits?: string[];
  isAdmin?: boolean;
};

const PAGE_SIZE = 15;
const DEFAULT_FILTERS: ProjectsFilters = { searchTitle: "", status: "", unit: "", requesterName: "", sortBy: "Id", sortDir: "desc" };

export function useProjectsList(
  initialFilters: ProjectsFilters,
  options: UseProjectsListOptions = {},
  deps: UseProjectsListDeps = { getProjectsPage }
) {
  const [items, setItems] = useState<ProjectRow[]>(options.initialItems ?? []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [nextLink, setNextLink] = useState<string | undefined>(options.initialNextLink);
  const [state, setState] = useState<LoadState>(options.initialState ?? "idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [filters, setFilters] = useState<ProjectsFilters>(initialFilters);

  const selected = useMemo(() => items.find((x) => x.Id === selectedId) ?? null, [items, selectedId]);

  const loadFirstPage = useCallback(async () => {
    setState("loading");
    setErrorMsg("");

    try {
      const res = await deps.getProjectsPage({
        top: PAGE_SIZE,
        searchTitle: filters.searchTitle,
        requesterContains: filters.requesterName || undefined,
        statusEquals: filters.status || undefined,
        unitEquals: filters.unit || undefined,
        unitIn: options.isAdmin ? undefined : options.allowedUnits,
        orderBy: filters.sortBy,
        orderDir: filters.sortDir
      });

      setItems(res.items);
      setSelectedId((currentSelectedId) =>
        currentSelectedId !== null && res.items.some((item) => item.Id === currentSelectedId)
          ? currentSelectedId
          : null
      );
      setNextLink(res.nextLink);
      setState("idle");
    } catch (e: unknown) {
      const appError =
        e instanceof UnitFilterLimitError
          ? { userMessage: e.userMessage }
          : normalizeError(e, "Erro ao carregar Projects.");
      setState("error");
      setErrorMsg(appError.userMessage);
      if (!(e instanceof UnitFilterLimitError)) {
        console.error(e);
      }
    }
  }, [deps, filters, options.allowedUnits, options.isAdmin]);

  const loadMore = useCallback(async () => {
    const paginationCursor = nextLink;
    if (!paginationCursor) return;

    setState("loading");
    setErrorMsg("");

    try {
      const res = await deps.getProjectsPage({ nextLink: paginationCursor });
      setItems((prev) => prev.concat(res.items));
      setNextLink(res.nextLink);
      setState("idle");
    } catch (e: unknown) {
      const appError = normalizeError(e, "Erro ao carregar mais Projects.");
      setState("error");
      setErrorMsg(appError.userMessage);
      console.error(e);
    }
  }, [deps, nextLink]);

  const clearFilters = useCallback(async () => {
    setState("loading");
    setErrorMsg("");
    setFilters(DEFAULT_FILTERS);

    try {
      const res = await deps.getProjectsPage({
        top: PAGE_SIZE,
        unitIn: options.isAdmin ? undefined : options.allowedUnits,
        orderBy: DEFAULT_FILTERS.sortBy,
        orderDir: DEFAULT_FILTERS.sortDir
      });

      setItems(res.items);
      setSelectedId((currentSelectedId) =>
        currentSelectedId !== null && res.items.some((item) => item.Id === currentSelectedId)
          ? currentSelectedId
          : null
      );
      setNextLink(res.nextLink);
      setState("idle");
    } catch (e: unknown) {
      const appError =
        e instanceof UnitFilterLimitError
          ? { userMessage: e.userMessage }
          : normalizeError(e, "Erro ao carregar Projects.");
      setState("error");
      setErrorMsg(appError.userMessage);
      if (!(e instanceof UnitFilterLimitError)) {
        console.error(e);
      }
    }
  }, [deps, options.allowedUnits, options.isAdmin]);

  return {
    items,
    selected,
    selectedId,
    setSelectedId,
    nextLink,
    state,
    errorMsg,
    filters,
    setFilters,
    clearFilters,
    loadFirstPage,
    loadMore
  };
}
