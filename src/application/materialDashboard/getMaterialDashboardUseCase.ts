import type { MaterialRequestStatus } from "../../domain/materialRequest/status";
import type { MaterialRequest } from "../../domain/materialRequest/types";
import type { StockMaterial } from "../../domain/materialRequest/stockTypes";
import {
  calculateCoverageYears,
  calculateTotalStockValueBRL,
  evaluateStockAttention,
  formatDashboardRequestStatus,
  formatDashboardStockRecommendation,
  isHighCoverage,
  isZeroStock,
  toDashboardNumber,
  type DashboardAttentionMaterial,
  type DashboardOpenRequest,
  type DashboardStockRankingItem,
  type MaterialDashboardKpis,
  type MaterialDashboardResult,
  type MaterialDashboardSeverity,
} from "../../domain/materialDashboard";
import { getMaterialRequests } from "../../services/sharepoint/repositories/materialRequestRepository";
import { getAllStockItems } from "../../services/sharepoint/repositories/stockMaterialRepository";

const OPEN_DASHBOARD_STATUSES = new Set<MaterialRequestStatus>([
  "PENDING_LAMINATION_MANAGER_APPROVAL",
  "PENDING_CTO_APPROVAL",
  "RETURNED_FOR_ADJUSTMENT",
]);

const SEVERITY_ORDER: Record<MaterialDashboardSeverity, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

function buildMaterialKey(center: string, materialCode: string): string {
  return `${center.trim().toUpperCase()}::${materialCode.trim().toUpperCase()}`;
}

function buildOpenRequestsByMaterial(openRequests: MaterialRequest[]): Map<string, MaterialRequest[]> {
  const index = new Map<string, MaterialRequest[]>();

  for (const request of openRequests) {
    const key = buildMaterialKey(request.center, request.materialCode);
    const current = index.get(key) ?? [];
    current.push(request);
    index.set(key, current);
  }

  return index;
}

function findStockMaterialByRequest(stockIndex: Map<string, StockMaterial>, request: MaterialRequest): StockMaterial | undefined {
  return stockIndex.get(buildMaterialKey(request.center, request.materialCode));
}

function calculateDaysOpen(createdAt?: string): number | null {
  if (!createdAt) return null;

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) return null;

  const millisecondsOpen = Date.now() - createdDate.getTime();
  if (millisecondsOpen < 0) return 0;

  return Math.floor(millisecondsOpen / (1000 * 60 * 60 * 24));
}

function toRankingItem(material: StockMaterial): DashboardStockRankingItem {
  const coverageYears = calculateCoverageYears(material);

  return {
    center: material.center,
    material: material.materialCode,
    description: material.description,
    evaluatedStockTotal: toDashboardNumber(material.evaluatedStockTotal),
    averagePrice: toDashboardNumber(material.averagePrice),
    totalStockValueBRL: calculateTotalStockValueBRL(material),
    averageAnnualConsumption: toDashboardNumber(material.averageAnnualConsumption),
    coverageYears,
    historicalTotal: toDashboardNumber(material.historicalTotal),
    consumptionYearsCount: toDashboardNumber(material.consumptionYearsCount),
  };
}

function buildOpenRequestViewModels(input: {
  openRequests: MaterialRequest[];
  stockIndex: Map<string, StockMaterial>;
}): DashboardOpenRequest[] {
  return input.openRequests.map((request) => {
    const stockMaterial = findStockMaterialByRequest(input.stockIndex, request);
    const evaluatedStockTotal = stockMaterial?.evaluatedStockTotal ?? request.evaluatedStockTotalAtRequest;
    const stockTotal = toDashboardNumber(evaluatedStockTotal);
    const averagePrice = toDashboardNumber(stockMaterial?.averagePrice);
    const averageAnnualConsumption = toDashboardNumber(stockMaterial?.averageAnnualConsumption);
    const projectedStockTotal = stockTotal + toDashboardNumber(request.requestedQuantity);
    const currentCoverageYears = averageAnnualConsumption > 0 ? stockTotal / averageAnnualConsumption : null;
    const coverageAfterRequestYears = averageAnnualConsumption > 0 ? projectedStockTotal / averageAnnualConsumption : null;

    return {
      id: request.id ?? null,
      center: request.center,
      material: request.materialCode,
      description: request.materialDescription,
      requestedQuantity: request.requestedQuantity,
      evaluatedStockTotal,
      averagePrice,
      averageAnnualConsumption,
      consumption2021: toDashboardNumber(stockMaterial?.consumption2021),
      consumption2022: toDashboardNumber(stockMaterial?.consumption2022),
      consumption2023: toDashboardNumber(stockMaterial?.consumption2023),
      consumption2024: toDashboardNumber(stockMaterial?.consumption2024),
      consumption2025: toDashboardNumber(stockMaterial?.consumption2025),
      consumption2026: toDashboardNumber(stockMaterial?.consumption2026),
      projectedStockTotal,
      estimatedRequestedValueBRL: toDashboardNumber(request.requestedQuantity) * averagePrice,
      requestedStockRatio: stockTotal > 0 ? toDashboardNumber(request.requestedQuantity) / stockTotal : null,
      currentCoverageYears,
      coverageAfterRequestYears,
      coverageIncreaseYears: currentCoverageYears !== null && coverageAfterRequestYears !== null ? coverageAfterRequestYears - currentCoverageYears : null,
      materialFound: Boolean(stockMaterial),
      stockRecommendation: request.stockRecommendation,
      stockRecommendationLabel: formatDashboardStockRecommendation(request.stockRecommendation),
      requestStatus: request.status,
      requestStatusLabel: formatDashboardRequestStatus(request.status),
      requesterName: request.requesterName,
      requesterEmail: request.requesterEmail,
      daysOpen: calculateDaysOpen(request.createdAt),
    };
  });
}

function calculateKpis(input: {
  stockItems: StockMaterial[];
  rankingItems: DashboardStockRankingItem[];
  openRequests: MaterialRequest[];
}): MaterialDashboardKpis {
  return {
    openRequestsCount: input.openRequests.length,
    pendingLaminationManagerCount: input.openRequests.filter((request) => request.status === "PENDING_LAMINATION_MANAGER_APPROVAL").length,
    pendingCtoCount: input.openRequests.filter((request) => request.status === "PENDING_CTO_APPROVAL").length,
    zeroStockMaterialsCount: input.stockItems.filter(isZeroStock).length,
    totalStockValueBRL: input.rankingItems.reduce((total, item) => total + item.totalStockValueBRL, 0),
    highCoverageMaterialsCount: input.rankingItems.filter((item) => isHighCoverage(item.coverageYears)).length,
  };
}

function buildAttentionMaterials(input: {
  stockItems: StockMaterial[];
  openRequestsByMaterial: Map<string, MaterialRequest[]>;
}): DashboardAttentionMaterial[] {
  return input.stockItems
    .map((material) => {
      const relatedOpenRequests = input.openRequestsByMaterial.get(buildMaterialKey(material.center, material.materialCode)) ?? [];
      const attention = evaluateStockAttention({ material, relatedOpenRequests });
      if (!attention.severity || attention.attentionLabels.length === 0) return null;

      return {
        ...toRankingItem(material),
        attentionLabels: attention.attentionLabels,
        severity: attention.severity,
      } satisfies DashboardAttentionMaterial;
    })
    .filter((item): item is DashboardAttentionMaterial => item !== null)
    .sort((left, right) => {
      const severityComparison = SEVERITY_ORDER[left.severity] - SEVERITY_ORDER[right.severity];
      if (severityComparison !== 0) return severityComparison;
      const lowStockComparison = Number(right.attentionLabels.includes("Uso frequente com estoque baixo")) - Number(left.attentionLabels.includes("Uso frequente com estoque baixo"));
      if (lowStockComparison !== 0) return lowStockComparison;
      const valueComparison = right.totalStockValueBRL - left.totalStockValueBRL;
      if (valueComparison !== 0) return valueComparison;
      return (right.coverageYears ?? -1) - (left.coverageYears ?? -1);
    });
}

function buildCenterOptions(stockItems: StockMaterial[], materialRequests: MaterialRequest[]): string[] {
  const centers = new Set<string>();

  for (const item of stockItems) {
    if (item.center.trim()) centers.add(item.center.trim());
  }

  for (const request of materialRequests) {
    if (request.center.trim()) centers.add(request.center.trim());
  }

  return Array.from(centers).sort((left, right) => left.localeCompare(right, "pt-BR", { numeric: true }));
}

export async function getMaterialDashboardUseCase(): Promise<MaterialDashboardResult> {
  const [stockItems, materialRequests] = await Promise.all([getAllStockItems(), getMaterialRequests()]);
  const openMaterialRequests = materialRequests.filter((request) => OPEN_DASHBOARD_STATUSES.has(request.status));
  const openRequestsByMaterial = buildOpenRequestsByMaterial(openMaterialRequests);
  const stockIndex = new Map(stockItems.map((item) => [buildMaterialKey(item.center, item.materialCode), item]));
  const rankingItems = stockItems.map(toRankingItem);

  return {
    kpis: calculateKpis({ stockItems, rankingItems, openRequests: openMaterialRequests }),
    requests: buildOpenRequestViewModels({ openRequests: materialRequests, stockIndex }),
    openRequests: buildOpenRequestViewModels({ openRequests: openMaterialRequests, stockIndex }),
    attentionMaterials: buildAttentionMaterials({ stockItems, openRequestsByMaterial }),
    stockItems: rankingItems,
    topStockValueItems: [...rankingItems]
      .sort((left, right) => right.totalStockValueBRL - left.totalStockValueBRL)
      .slice(0, 10),
    topCoverageItems: [...rankingItems]
      .filter((item) => item.coverageYears !== null)
      .sort((left, right) => (right.coverageYears ?? 0) - (left.coverageYears ?? 0))
      .slice(0, 10),
    centerOptions: buildCenterOptions(stockItems, materialRequests),
  };
}
