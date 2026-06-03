import type { MaterialCenter } from "../domain/materialRequest/materialCenter";
import { normalizeCenter } from "../domain/materialRequest/normalizeCenter";
import { getActiveMaterialCenters } from "../services/sharepoint/materialCentersRepository";

function buildCenterKey(center: string): string {
  return normalizeCenter(center).toUpperCase();
}

function compareCenterForDisplay(left: string, right: string): number {
  const leftIsNumeric = /^\d+$/.test(left);
  const rightIsNumeric = /^\d+$/.test(right);

  if (leftIsNumeric && rightIsNumeric) return Number(left) - Number(right);
  if (leftIsNumeric !== rightIsNumeric) return leftIsNumeric ? -1 : 1;
  return left.localeCompare(right, "pt-BR", { numeric: true, sensitivity: "base" });
}

export async function listAvailableMaterialCenters(): Promise<MaterialCenter[]> {
  const centers = await getActiveMaterialCenters();
  const uniqueCenters = new Map<string, MaterialCenter>();

  for (const materialCenter of centers) {
    const normalizedCenter = normalizeCenter(materialCenter.center);
    if (!normalizedCenter) continue;

    const key = buildCenterKey(normalizedCenter);
    if (!uniqueCenters.has(key)) {
      uniqueCenters.set(key, { ...materialCenter, center: normalizedCenter });
    }
  }

  return [...uniqueCenters.values()].sort((left, right) => compareCenterForDisplay(left.center, right.center));
}

export async function listAvailableMaterialCenterCodes(): Promise<string[]> {
  const centers = await listAvailableMaterialCenters();
  return centers.map((materialCenter) => materialCenter.center);
}

export async function isActiveMaterialCenter(center: string): Promise<boolean> {
  const normalizedCenter = normalizeCenter(center);
  if (!normalizedCenter) return false;
  const key = buildCenterKey(normalizedCenter);
  const centers = await listAvailableMaterialCenters();
  return centers.some((materialCenter) => buildCenterKey(materialCenter.center) === key);
}
