import { useEffect, useMemo, useState } from "react";
import { getMaterialRequestHistoryUseCase, getMaterialRequestStockAnalysisUseCase } from "../../../application/materialRequest";
import type { MaterialRequestHistoryEntry } from "../../../domain/materialRequest/historyTypes";
import type { StockMaterial } from "../../../domain/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { AppModal } from "../common/AppModal";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";
import { MaterialRequestHistoryTimeline } from "./MaterialRequestHistoryTimeline";
import { MaterialStockAnalysisSection } from "./MaterialStockAnalysisSection";
import { MaterialRequestTechnicalDataViewSection } from "./MaterialRequestTechnicalDataSection";
import {
  CollapsibleSection,
  MaterialRequestMainInfoSection,
  MaterialRequestPreviousApprovalSection,
} from "./MaterialRequestViewSections";

export function MaterialRequestViewModal({ request, onClose }: { request: MaterialRequest; onClose: () => void }) {
  const [history, setHistory] = useState<MaterialRequestHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [stockMaterial, setStockMaterial] = useState<StockMaterial | null>(null);
  const [stockAnalysisError, setStockAnalysisError] = useState<string | null>(null);
  const [loadingStockAnalysis, setLoadingStockAnalysis] = useState(false);

  const hasHistory = useMemo(() => Boolean(request.id), [request.id]);

  useEffect(() => {
    let mounted = true;

    async function loadStockAnalysis() {
      setStockAnalysisError(null);
      setLoadingStockAnalysis(true);
      try {
        const result = await getMaterialRequestStockAnalysisUseCase(request);
        if (mounted) setStockMaterial(result.stockMaterial);
      } catch (e) {
        if (!mounted) return;
        setStockMaterial(null);
        setStockAnalysisError(e instanceof Error ? e.message : "Não foi possível carregar a análise do material.");
      } finally {
        if (mounted) setLoadingStockAnalysis(false);
      }
    }

    void loadStockAnalysis();
    return () => {
      mounted = false;
    };
  }, [request]);

  useEffect(() => {
    let mounted = true;

    async function loadHistory() {
      if (!request.id) {
        if (mounted) {
          setHistory([]);
          setHistoryError("Não foi possível identificar a solicitação para consultar o histórico.");
          setLoadingHistory(false);
        }
        return;
      }

      setLoadingHistory(true);
      setHistoryError(null);
      try {
        const result = await getMaterialRequestHistoryUseCase(request.id);
        if (mounted) setHistory(result);
      } catch (e) {
        if (mounted) setHistoryError(e instanceof Error ? e.message : "Não foi possível carregar o histórico da solicitação.");
      } finally {
        if (mounted) setLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      mounted = false;
    };
  }, [request.id]);

  return (
    <AppModal title={`Visualizar Solicitação #${request.id ?? ""}`} subtitle="Modo visualização: campos bloqueados." onClose={onClose}>
      <div style={{ padding: 14, display: "grid", gap: 16 }}>
        <MaterialRequestMainInfoSection request={request} title="1. Dados da Solicitação" />
        <MaterialRequestTechnicalDataViewSection technicalData={request.technicalData} />

        {stockAnalysisError ? <StateMessage state="error" message={stockAnalysisError} /> : null}
        {loadingStockAnalysis ? <StateMessage state="loading" message="Carregando análise do material..." /> : <MaterialStockAnalysisSection stockMaterial={stockMaterial} requestedQuantity={request.requestedQuantity} mode="view" />}

        <MaterialRequestPreviousApprovalSection
          title="Aprovação Gerente Laminação"
          approverName={request.laminationManagerName}
          approverEmail={request.laminationManagerEmail}
          decisionDate={request.laminationManagerDecisionDate}
          justification={request.laminationManagerJustification}
          collapsible
        />

        <MaterialRequestPreviousApprovalSection
          title="Aprovação CTO"
          approverName={request.ctoApproverName}
          approverEmail={request.ctoApproverEmail}
          decisionDate={request.ctoDecisionDate}
          justification={request.ctoJustification}
          collapsible
        />

        {hasHistory && (
          <CollapsibleSection title="Histórico da Solicitação">
            {historyError ? <StateMessage state="error" message={historyError} /> : null}
            <MaterialRequestHistoryTimeline items={history} loading={loadingHistory} error={null} />
          </CollapsibleSection>
        )}

        {!hasHistory && <StateMessage state="empty" message="Histórico indisponível para solicitação sem ID." />}

        {request.id ? (
          <div style={{ fontSize: 12, color: uiTokens.colors.textMuted }}>
            ID da solicitação no SharePoint: <b>{request.id}</b>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
