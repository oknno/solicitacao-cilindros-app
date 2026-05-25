import { useMemo, useState } from "react";
import {
  analyzeMaterialRequestStockUseCase,
  createMaterialRequestUseCase,
  type AnalyzeMaterialRequestStockOutput,
} from "../../../application/materialRequest";
import { StockAnalysisCard } from "../../components/materialRequest/StockAnalysisCard";
import { useToast } from "../../components/notifications/useToast";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";

interface MaterialRequestFormPageProps {
  onBack: () => void;
  onCreated: () => void;
}

const requesterNameFallback = "Usuário atual";
const requesterEmailFallback = "";

export function MaterialRequestFormPage({ onBack, onCreated }: MaterialRequestFormPageProps) {
  const { notify } = useToast();
  const [materialCode, setMaterialCode] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requesterJustification, setRequesterJustification] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMaterialRequestStockOutput | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const parsedRequestedQuantity = useMemo(() => Number(requestedQuantity), [requestedQuantity]);
  const canAnalyze = materialCode.trim().length > 0 && Number.isFinite(parsedRequestedQuantity) && parsedRequestedQuantity > 0;
  const justificationRequired = analysisResult?.stockAnalysis.requiresRequesterJustification ?? false;

  async function handleAnalyzeStock() {
    setError("");
    setLoadingAnalysis(true);
    try {
      const result = await analyzeMaterialRequestStockUseCase({
        materialCode,
        requestedQuantity: parsedRequestedQuantity,
      });
      setAnalysisResult(result);
    } catch (e) {
      console.error(e);
      setAnalysisResult(null);
      setError(e instanceof Error ? e.message : "Não foi possível analisar o estoque.");
    } finally {
      setLoadingAnalysis(false);
    }
  }

  async function handleSubmit() {
    setError("");

    if (!materialCode.trim()) {
      setError("Informe o código do material.");
      return;
    }

    if (!Number.isFinite(parsedRequestedQuantity) || parsedRequestedQuantity <= 0) {
      setError("Informe uma quantidade solicitada maior que zero.");
      return;
    }

    if (!requestReason.trim()) {
      setError("Informe o motivo da solicitação.");
      return;
    }

    if (justificationRequired && !requesterJustification.trim()) {
      setError("Informe a justificativa para prosseguir com esta solicitação.");
      return;
    }

    setSending(true);
    try {
      await createMaterialRequestUseCase({
        requesterName: requesterNameFallback,
        requesterEmail: requesterEmailFallback,
        materialCode,
        requestedQuantity: parsedRequestedQuantity,
        requestReason,
        requesterJustification,
      });

      notify("Solicitação criada e enviada para aprovação CTO.", "success");
      onCreated();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Não foi possível criar a solicitação.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ background: uiTokens.colors.appBackground, minHeight: "100%", padding: uiTokens.spacing.md, display: "grid", gridTemplateRows: "auto 1fr", gap: uiTokens.spacing.md }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: uiTokens.spacing.md, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Nova Solicitação de Material</h2>
          <div style={{ display: "flex", gap: uiTokens.spacing.sm, flexWrap: "wrap" }}>
            <Button onClick={onBack}>Voltar</Button>
            <Button onClick={() => void handleAnalyzeStock()} disabled={!canAnalyze || loadingAnalysis}>
              {loadingAnalysis ? "Analisando..." : "Analisar Estoque"}
            </Button>
            <Button tone="primary" onClick={() => void handleSubmit()} disabled={sending}>
              {sending ? "Enviando..." : "Enviar para Aprovação CTO"}
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gap: uiTokens.spacing.md, alignContent: "start" }}>
        <Card>
          <h3 style={{ margin: "0 0 12px" }}>Dados da Solicitação</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <Field label="Solicitante" layout="inline">{requesterNameFallback}</Field>
            <Field label="E-mail do solicitante" layout="inline">{requesterEmailFallback || "-"}</Field>
            <Field label="Material">
              <input value={materialCode} onChange={(e) => setMaterialCode(e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label="Quantidade Solicitada">
              <input type="number" min={1} value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} style={{ width: "100%" }} />
            </Field>
            <Field label="Motivo da Solicitação">
              <textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} rows={4} style={{ width: "100%", resize: "vertical" }} />
            </Field>
          </div>
        </Card>

        {analysisResult && <StockAnalysisCard stockMaterial={analysisResult.stockMaterial} stockAnalysis={analysisResult.stockAnalysis} />}

        {justificationRequired && (
          <Card>
            <h3 style={{ margin: "0 0 12px" }}>Justificativa do Solicitante</h3>
            <p style={{ marginTop: 0 }}>
              Esta solicitação exige justificativa porque há estoque suficiente ou a análise requer validação manual.
            </p>
            <Field label="Justificativa">
              <textarea value={requesterJustification} onChange={(e) => setRequesterJustification(e.target.value)} rows={5} style={{ width: "100%", resize: "vertical" }} />
            </Field>
          </Card>
        )}

        {error && <StateMessage state="error" message={error} />}
      </div>
    </div>
  );
}
