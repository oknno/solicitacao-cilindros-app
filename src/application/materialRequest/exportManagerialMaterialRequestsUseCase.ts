import * as XLSX from "xlsx";
import { normalizeCenter } from "../../domain/materialRequest/normalizeCenter";
import type { UserAccessProfile } from "../../domain/accessControl";
import {
  calculateMaterialRequestStockImpact,
  type MaterialRequest,
  type MaterialRequestAttachment,
  type StockMaterial,
} from "../../domain/materialRequest";
import { evaluateStockAttention } from "../../domain/materialDashboard/stockAttentionPolicy";
import type { MaterialDashboardAttentionLabel } from "../../domain/materialDashboard";
import { getAllStockItems } from "../../services/sharepoint/repositories/stockMaterialRepository";
import { listAttachmentsByRequestId } from "../../services/sharepoint/repositories/materialRequestRepository";
import { type StockRecommendation } from "../../domain/materialRequest/stockTypes";
import type { MaterialRequestStatus } from "../../domain/materialRequest/status";

const NO_AVERAGE_CONSUMPTION = "Sem consumo médio";
const NO_CURRENT_STOCK = "Sem estoque atual";
const ATTACHMENTS_LOAD_ERROR = "Não foi possível carregar";

const STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  DRAFT: "Rascunho",
  RETURNED_TO_DRAFT: "Retornado para Rascunho",
  PENDING_LAMINATION_MANAGER_APPROVAL: "Pendente Gerente Laminação",
  PENDING_CTO_APPROVAL: "Pendente CTO",
  APPROVED: "Aprovada",
  REJECTED: "Reprovada",
};

const STOCK_RECOMMENDATION_LABELS: Record<StockRecommendation, string> = {
  PURCHASE_RECOMMENDED: "Compra recomendada",
  PURCHASE_RECOMMENDED_PARTIAL_STOCK: "Compra recomendada com estoque parcial",
  PURCHASE_NOT_RECOMMENDED: "Compra não recomendada",
  MANUAL_REVIEW_REQUIRED: "Requer análise manual",
};

type ExcelPrimitive = string | number | Date;
type ExcelCellValue = ExcelPrimitive | null | undefined;
type ColumnKind = "text" | "longText" | "number" | "integer" | "currency" | "percent" | "date";

type AttachmentLoadState = { attachments: MaterialRequestAttachment[] | null; failed: boolean };

type ManagerialExportRow = {
  request: MaterialRequest;
  stockMaterial: StockMaterial | null;
  attachments: MaterialRequestAttachment[] | null;
  attachmentLoadFailed: boolean;
  currentSignal: MaterialDashboardAttentionLabel[];
};

type ManagerialColumn = {
  header: string;
  kind: ColumnKind;
  width: number;
  getValue: (row: ManagerialExportRow) => ExcelCellValue;
};

function toIsoDatePrefix(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function mapStatusLabel(status: MaterialRequest["status"]): string {
  return STATUS_LABELS[status as MaterialRequestStatus] ?? status ?? "";
}

function mapStockRecommendationLabel(recommendation: MaterialRequest["stockRecommendation"]): string {
  return STOCK_RECOMMENDATION_LABELS[recommendation as StockRecommendation] ?? recommendation ?? "";
}

function parseDate(value: string | undefined): Date | "" {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date;
}

function getMaterialKey(input: { center?: string; materialCode?: string }): string {
  return `${normalizeCenter(input.center ?? "")}::${(input.materialCode ?? "").trim().toLocaleLowerCase("pt-BR")}`;
}

function indexStockMaterials(stockItems: StockMaterial[]): Map<string, StockMaterial> {
  const index = new Map<string, StockMaterial>();
  stockItems.forEach((item) => {
    const key = getMaterialKey(item);
    if (key !== "::" && !index.has(key)) index.set(key, item);
  });
  return index;
}

function hasAverageConsumption(material: StockMaterial | null): boolean {
  return typeof material?.averageAnnualConsumption === "number" && Number.isFinite(material.averageAnnualConsumption) && material.averageAnnualConsumption > 0;
}

function getCoverageValue(value: number | null): number | string {
  return value === null ? NO_AVERAGE_CONSUMPTION : value;
}

function getManagerDecision(request: MaterialRequest): string {
  if (!request.laminationManagerDecisionDate) return "";
  if (request.status === "REJECTED" && !request.ctoDecisionDate) return "Reprovada";
  return "Aprovada";
}

function getCtoDecision(request: MaterialRequest): string {
  if (!request.ctoDecisionDate) return "";
  if (request.status === "REJECTED") return "Reprovada";
  if (request.status === "APPROVED") return "Aprovada";
  return "";
}

function getAttachmentNames(row: ManagerialExportRow): string {
  if (row.attachmentLoadFailed) return ATTACHMENTS_LOAD_ERROR;
  return row.attachments?.map((attachment) => attachment.fileName).join("; ") ?? "";
}

function getAttachmentLinks(row: ManagerialExportRow): string {
  if (row.attachmentLoadFailed) return ATTACHMENTS_LOAD_ERROR;
  return row.attachments?.map((attachment) => attachment.url).filter(Boolean).join("; ") ?? "";
}

function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value);
}

function buildColumns(): ManagerialColumn[] {
  return [
    { header: "ID Solicitação", kind: "integer", width: 16, getValue: ({ request }) => request.id ?? "" },
    { header: "Título", kind: "text", width: 28, getValue: ({ request }) => request.title ?? "" },
    { header: "Data da Solicitação", kind: "date", width: 22, getValue: ({ request }) => parseDate(request.createdAt) },
    { header: "Status", kind: "text", width: 28, getValue: ({ request }) => mapStatusLabel(request.status) },
    { header: "Centro", kind: "text", width: 12, getValue: ({ request }) => text(request.center) },
    { header: "Solicitante", kind: "text", width: 26, getValue: ({ request }) => request.requesterName },
    { header: "E-mail do Solicitante", kind: "text", width: 34, getValue: ({ request }) => request.requesterEmail ?? "" },
    { header: "Material", kind: "text", width: 18, getValue: ({ request }) => text(request.materialCode) },
    { header: "Descrição do Material", kind: "longText", width: 42, getValue: ({ request }) => request.materialDescription },
    { header: "Quantidade Solicitada", kind: "number", width: 22, getValue: ({ request }) => request.requestedQuantity },

    { header: "Estoque Atual", kind: "number", width: 16, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).currentStock : "" },
    { header: "Preço Médio", kind: "currency", width: 16, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).averagePrice : "" },
    { header: "Valor Atual em Estoque", kind: "currency", width: 22, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).currentStockValue : "" },
    { header: "Consumo Total Histórico", kind: "number", width: 24, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).historicalTotalConsumption : "" },
    { header: "Anos com Movimentação", kind: "integer", width: 22, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).consumptionYearsCount : "" },
    { header: "Média Anual de Consumo", kind: "number", width: 24, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).averageAnnualConsumption : "" },
    { header: "Cobertura Atual", kind: "number", width: 20, getValue: (row) => row.stockMaterial ? getCoverageValue(calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).currentCoverageYears) : NO_AVERAGE_CONSUMPTION },
    { header: "Sinalização Atual", kind: "longText", width: 34, getValue: (row) => row.currentSignal.join("; ") },
    { header: "Parecer do Sistema", kind: "text", width: 34, getValue: ({ request }) => mapStockRecommendationLabel(request.stockRecommendation) },

    { header: "Estoque Projetado", kind: "number", width: 18, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).projectedStock : "" },
    { header: "Aumento Absoluto", kind: "number", width: 18, getValue: ({ request }) => request.requestedQuantity },
    { header: "Aumento Percentual", kind: "percent", width: 20, getValue: (row) => {
      const impact = row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity) : null;
      return impact?.percentageIncrease ?? NO_CURRENT_STOCK;
    } },
    { header: "Valor Estimado da Solicitação", kind: "currency", width: 28, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).estimatedRequestValue : "" },
    { header: "Valor Projetado em Estoque", kind: "currency", width: 26, getValue: (row) => row.stockMaterial ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).projectedStockValue : "" },
    { header: "Cobertura Após Solicitação", kind: "number", width: 26, getValue: (row) => row.stockMaterial ? getCoverageValue(calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).projectedCoverageYears) : NO_AVERAGE_CONSUMPTION },
    { header: "Variação da Cobertura", kind: "number", width: 24, getValue: (row) => row.stockMaterial && hasAverageConsumption(row.stockMaterial) ? calculateMaterialRequestStockImpact(row.stockMaterial, row.request.requestedQuantity).coverageVariationYears : NO_AVERAGE_CONSUMPTION },

    { header: "Motivo da Solicitação", kind: "longText", width: 34, getValue: ({ request }) => request.requestReason },
    { header: "Justificativa do Solicitante", kind: "longText", width: 44, getValue: ({ request }) => request.requesterJustification ?? "" },

    { header: "Nome do Gerente Aprovador", kind: "text", width: 30, getValue: ({ request }) => request.laminationManagerName ?? "" },
    { header: "E-mail do Gerente", kind: "text", width: 34, getValue: ({ request }) => request.laminationManagerEmail ?? "" },
    { header: "Decisão do Gerente", kind: "text", width: 20, getValue: ({ request }) => getManagerDecision(request) },
    { header: "Justificativa do Gerente", kind: "longText", width: 44, getValue: ({ request }) => request.laminationManagerJustification ?? "" },
    { header: "Data da Decisão do Gerente", kind: "date", width: 26, getValue: ({ request }) => parseDate(request.laminationManagerDecisionDate) },

    { header: "Nome do CTO Aprovador", kind: "text", width: 30, getValue: ({ request }) => request.ctoApproverName ?? "" },
    { header: "E-mail do CTO", kind: "text", width: 34, getValue: ({ request }) => request.ctoApproverEmail ?? "" },
    { header: "Decisão do CTO", kind: "text", width: 18, getValue: ({ request }) => getCtoDecision(request) },
    { header: "Justificativa do CTO", kind: "longText", width: 44, getValue: ({ request }) => request.ctoJustification ?? "" },
    { header: "Data da Decisão do CTO", kind: "date", width: 24, getValue: ({ request }) => parseDate(request.ctoDecisionDate) },

    { header: "REFROL", kind: "text", width: 16, getValue: ({ request }) => text(request.technicalData?.refrol) },
    { header: "SITE", kind: "text", width: 16, getValue: ({ request }) => text(request.technicalData?.site) },
    { header: "MILL", kind: "text", width: 16, getValue: ({ request }) => text(request.technicalData?.mill) },
    { header: "STAND TYPE", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.standType) },
    { header: "ROLL TYPE", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.rollType) },
    { header: "STAND LOCAL NAME", kind: "text", width: 24, getValue: ({ request }) => text(request.technicalData?.standLocalName) },
    { header: "PROFILE", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.profile) },
    { header: "PROFILE Code", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.profileCode) },
    { header: "ROLL DRAWING", kind: "text", width: 22, getValue: ({ request }) => text(request.technicalData?.rollDrawing) },
    { header: "GROOVES (CALIBER) DRAWING", kind: "text", width: 30, getValue: ({ request }) => text(request.technicalData?.groovesCaliberDrawing) },
    { header: "CALIBRATION NEED", kind: "text", width: 22, getValue: ({ request }) => text(request.technicalData?.calibrationNeed) },
    { header: "DIAM EXT", kind: "text", width: 16, getValue: ({ request }) => text(request.technicalData?.diamExt) },
    { header: "SCRAP DIAM", kind: "text", width: 16, getValue: ({ request }) => text(request.technicalData?.scrapDiam) },
    { header: "DIAM INT", kind: "text", width: 16, getValue: ({ request }) => text(request.technicalData?.diamInt) },
    { header: "LENGTH TABLE", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.lengthTable) },
    { header: "LENGTH TOTAL", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.lengthTotal) },
    { header: "FINAL WEIGHT", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.finalWeight) },
    { header: "NEEDED HARDNESS", kind: "text", width: 22, getValue: ({ request }) => text(request.technicalData?.neededHardness) },
    { header: "TECHNOLOGY", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.technology) },
    { header: "GRADE", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.grade) },
    { header: "DELIVERY", kind: "text", width: 18, getValue: ({ request }) => text(request.technicalData?.delivery) },

    { header: "Quantidade de Anexos", kind: "integer", width: 20, getValue: (row) => row.attachmentLoadFailed ? "" : row.attachments?.length ?? 0 },
    { header: "Nomes dos Anexos", kind: "longText", width: 44, getValue: getAttachmentNames },
    { header: "Links dos Anexos", kind: "longText", width: 56, getValue: getAttachmentLinks },
  ];
}

async function loadAttachmentsByRequest(requests: MaterialRequest[]): Promise<Map<number, AttachmentLoadState>> {
  const requestIds = Array.from(new Set(requests.flatMap((request) => (typeof request.id === "number" && Number.isInteger(request.id) && request.id > 0 ? [request.id] : []))));
  const entries: Array<readonly [number, AttachmentLoadState]> = await Promise.all(requestIds.map(async (requestId) => {
    try {
      return [requestId, { attachments: await listAttachmentsByRequestId(requestId), failed: false }] as const;
    } catch (error) {
      console.error("[ExportManagerialMaterialRequests] Não foi possível carregar anexos da solicitação.", { requestId, error });
      return [requestId, { attachments: null, failed: true }] as const;
    }
  }));

  return new Map(entries);
}

function buildRows(requests: MaterialRequest[], stockItems: StockMaterial[], attachmentsByRequest: Map<number, AttachmentLoadState>): ManagerialExportRow[] {
  const stockIndex = indexStockMaterials(stockItems);

  return requests.map((request) => {
    const stockMaterial = stockIndex.get(getMaterialKey(request)) ?? null;
    const attachmentsState = request.id ? attachmentsByRequest.get(request.id) : undefined;
    const currentSignal = stockMaterial
      ? evaluateStockAttention({ material: stockMaterial, relatedOpenRequests: requests.filter((candidate) => getMaterialKey(candidate) === getMaterialKey(request)) }).attentionLabels
      : [];

    return {
      request,
      stockMaterial,
      attachments: attachmentsState?.attachments ?? [],
      attachmentLoadFailed: attachmentsState?.failed ?? false,
      currentSignal,
    };
  });
}

function isTextKind(kind: ColumnKind): boolean {
  return kind === "text" || kind === "longText";
}

function applyWorksheetFormatting(worksheet: XLSX.WorkSheet, columns: ManagerialColumn[], rowCount: number): void {
  worksheet["!cols"] = columns.map((column) => ({ wch: column.width }));
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(rowCount, 0), c: columns.length - 1 } }) };
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 } as unknown as XLSX.WorkSheet["!freeze"];

  columns.forEach((column, columnIndex) => {
    const headerAddress = XLSX.utils.encode_cell({ r: 0, c: columnIndex });
    const headerCell = worksheet[headerAddress];
    if (headerCell) headerCell.s = { font: { bold: true } };

    for (let rowIndex = 1; rowIndex <= rowCount; rowIndex += 1) {
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      const cell = worksheet[address];
      if (!cell) continue;

      if (isTextKind(column.kind)) cell.t = "s";
      if (column.kind === "currency" && typeof cell.v === "number") cell.z = '"R$" #,##0.00';
      if (column.kind === "percent" && typeof cell.v === "number") cell.z = "0.00%";
      if (column.kind === "date" && cell.v instanceof Date) cell.z = "dd/mm/yyyy hh:mm";
      if (column.kind === "integer" && typeof cell.v === "number") cell.z = "#,##0";
      if (column.kind === "number" && typeof cell.v === "number") cell.z = "#,##0.00";
      if (column.kind === "longText") cell.s = { ...(cell.s ?? {}), alignment: { wrapText: true, vertical: "top" } };
    }
  });
}

function writeWorkbook(rows: ManagerialExportRow[]): void {
  const columns = buildColumns();
  const data = [columns.map((column) => column.header), ...rows.map((row) => columns.map((column) => column.getValue(row) ?? ""))];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  applyWorksheetFormatting(worksheet, columns, rows.length);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Relatório Gerencial");
  XLSX.writeFile(workbook, `Relatorio_Gerencial_Solicitacoes_${toIsoDatePrefix()}.xlsx`, { cellStyles: true });
}

export function canExportManagerialMaterialRequests(accessProfile: Pick<UserAccessProfile, "roles">): boolean {
  return accessProfile.roles.includes("ADMIN") || accessProfile.roles.includes("CTO");
}

export async function exportManagerialMaterialRequestsUseCase(input: {
  accessProfile: UserAccessProfile;
  requests: MaterialRequest[];
}): Promise<void> {
  if (!canExportManagerialMaterialRequests(input.accessProfile)) {
    throw new Error("Você não possui permissão para exportar o relatório gerencial.");
  }

  if (input.requests.length === 0) {
    throw new Error("Nenhuma solicitação disponível para exportação com os filtros atuais.");
  }

  const [stockItems, attachmentsByRequest] = await Promise.all([
    getAllStockItems(),
    loadAttachmentsByRequest(input.requests),
  ]);
  writeWorkbook(buildRows(input.requests, stockItems, attachmentsByRequest));
}
