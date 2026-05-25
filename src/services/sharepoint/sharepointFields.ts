export const STOCK_FIELDS = {
  title: "Title",
  materialCode: "Material",
  description: "Description",
  center: "Center",
  evaluatedStockTotal: "EvaluatedStockTotal",
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
  ctoJustification: "CtoJustification",
  ctoApproverName: "CtoApproverName",
  ctoApproverEmail: "CtoApproverEmail",
  ctoDecisionDate: "CtoDecisionDate",
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
