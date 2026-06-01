export interface MaterialRequestTechnicalData {
  refrol?: string;
  site?: string;
  mill?: string;
  standType?: string;
  rollType?: string;
  standLocalName?: string;
  profile?: string;
  profileCode?: string;
  rollDrawing?: string;
  groovesCaliberDrawing?: string;
  calibrationNeed?: string;
  diamExt?: string;
  scrapDiam?: string;
  diamInt?: string;
  lengthTable?: string;
  lengthTotal?: string;
  finalWeight?: string;
  neededHardness?: string;
  technology?: string;
  grade?: string;
  delivery?: string;
}

export const MATERIAL_REQUEST_TECHNICAL_DATA_KEYS = [
  "refrol", "site", "mill", "standType", "rollType", "standLocalName",
  "profile", "profileCode", "rollDrawing", "groovesCaliberDrawing", "calibrationNeed",
  "diamExt", "scrapDiam", "diamInt", "lengthTable", "lengthTotal", "finalWeight",
  "neededHardness", "technology", "grade", "delivery",
] as const satisfies readonly (keyof MaterialRequestTechnicalData)[];

export function normalizeMaterialRequestTechnicalData(
  technicalData?: MaterialRequestTechnicalData,
): MaterialRequestTechnicalData | undefined {
  if (!technicalData) return undefined;

  return MATERIAL_REQUEST_TECHNICAL_DATA_KEYS.reduce<MaterialRequestTechnicalData>((normalized, key) => {
    const value = technicalData[key]?.trim();
    normalized[key] = value || undefined;
    return normalized;
  }, {});
}
