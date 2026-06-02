import type { MaterialRequest } from "../../../domain/materialRequest/types";
import type { MaterialRequestStatus } from "../../../domain/materialRequest/status";
import { normalizeCenter } from "../../../domain/materialRequest/normalizeCenter";

export interface MaterialRequestFilters {
  center?: string;
  material?: string;
  requester?: string;
  status?: MaterialRequestStatus | "";
  sort?: "ID_DESC" | "ID_ASC" | "QUANTITY_DESC" | "QUANTITY_ASC";
}

function normalizeText(value: string | undefined | null) {
  return (value ?? "").trim().toLocaleLowerCase("pt-BR");
}

export function hasActiveMaterialRequestFilters(filters: MaterialRequestFilters): boolean {
  return Boolean(
    normalizeText(filters.center)
    || normalizeText(filters.material)
    || normalizeText(filters.requester)
    || normalizeText(filters.status)
    || filters.sort,
  );
}

export function applyMaterialRequestFilters(items: MaterialRequest[], filters: MaterialRequestFilters): MaterialRequest[] {
  const center = normalizeText(normalizeCenter(filters.center));
  const material = normalizeText(filters.material);
  const requester = normalizeText(filters.requester);

  const filtered = items.filter((item) => {
    if (center && normalizeText(normalizeCenter(item.center)) !== center) return false;
    if (material && !normalizeText(item.materialCode).includes(material)) return false;
    if (requester && !normalizeText(item.requesterName).includes(requester)) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });

  const sorted = [...filtered];
  switch (filters.sort) {
    case "ID_ASC":
      sorted.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
      break;
    case "ID_DESC":
      sorted.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      break;
    case "QUANTITY_ASC":
      sorted.sort((a, b) => (a.requestedQuantity ?? 0) - (b.requestedQuantity ?? 0));
      break;
    case "QUANTITY_DESC":
      sorted.sort((a, b) => (b.requestedQuantity ?? 0) - (a.requestedQuantity ?? 0));
      break;
    default:
      break;
  }

  return sorted;
}
