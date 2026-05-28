export const STOCK_FIELDS = {
  title: "Title",
  materialCode: "Material",
  description: "Description",
  center: "Center",
  evaluatedStockTotal: "EvaluatedStockTotal",
  totalStockValueBRL: "TotalStockValueBRL",
  consumption2021: "Consumption2021",
  consumption2022: "Consumption2022",
  consumption2023: "Consumption2023",
  consumption2024: "Consumption2024",
  consumption2025: "Consumption2025",
  consumption2026: "Consumption2026",
  historicalTotal: "HistoricalTotal",
  consumptionYearsCount: "ConsumptionYearsCount",
  averageAnnualConsumption: "AverageAnnualConsumption",
  averagePrice: "AveragePrice",
  importDate: "ImportDate",
} as const;

export const MATERIAL_REQUEST_FIELDS = {
  title: "Title",

  requesterName: "RequesterName",
  requesterEmail: "RequesterEmail",

  materialCode: "Material",
  materialDescription: "MaterialDescription",
  center: "Center",

  requestedQuantity: "RequestedQuantity",
  evaluatedStockTotal: "EvaluatedStockTotal",
  stockRecommendation: "StockRecommendation",
  requestReason: "RequestReason",
  requesterJustification: "RequesterJustification",
  requestStatus: "RequestStatus",

  laminationManagerName: "LaminationManagerName",
  laminationManagerEmail: "LaminationManagerEmail",
  laminationManagerJustification: "LaminationManagerJustification",
  laminationManagerDecisionDate: "LaminationManagerDecisionDate",

  ctoApproverName: "CTOApproverName",
  ctoApproverEmail: "CTOApproverEmail",
  ctoJustification: "CTOJustification",
  ctoDecisionDate: "CTODecisionDate",
} as const;

export const MATERIAL_REQUEST_HISTORY_FIELDS = {
  title: "Title",
  requestId: "RequestId",
  action: "Action",
  previousStatus: "PreviousStatus",
  newStatus: "NewStatus",
  performedByName: "PerformedByName",
  performedByEmail: "PerformedByEmail",
  performedAt: "PerformedAt",
  comment: "Comment",
} as const;
