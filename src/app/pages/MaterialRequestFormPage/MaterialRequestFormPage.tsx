import { useEffect, useMemo, useState } from "react";
import {
  analyzeMaterialRequestStockUseCase,
  createMaterialRequestUseCase,
  updateMaterialRequestDraftUseCase,
  getStockCentersUseCase,
  getStockMaterialsByCenterUseCase,
  type AnalyzeMaterialRequestStockOutput,
} from "../../../application/materialRequest";
import { StockAnalysisCard } from "../../components/materialRequest/StockAnalysisCard";
import { useToast } from "../../components/notifications/useToast";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Field } from "../../components/ui/Field";
import { StateMessage } from "../../components/ui/StateMessage";
import { uiTokens } from "../../components/ui/tokens";

const MANUAL_NOT_FOUND_OPTION = "__NOT_FOUND__";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
interface MaterialRequestFormPageProps { onBack: () => void; onCreated: () => void; inModal?: boolean; mode?: "create"|"edit"; initialRequest?: MaterialRequest; }
const requesterNameFallback = "Usuário atual";
const requesterEmailFallback = "";

export function MaterialRequestFormPage({ onBack, onCreated, inModal, mode = "create", initialRequest }: MaterialRequestFormPageProps) {
  const { notify } = useToast();
  const [center, setCenter] = useState("");
  const [materialSelection, setMaterialSelection] = useState("");
  const [manualMaterialCode, setManualMaterialCode] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requesterJustification, setRequesterJustification] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMaterialRequestStockOutput | null>(null);
  const [stockMaterials, setStockMaterials] = useState<Array<{ materialCode: string; description: string; evaluatedStockTotal: number | null }>>([]);
  const [centers, setCenters] = useState<string[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const parsedRequestedQuantity = useMemo(() => Number(requestedQuantity), [requestedQuantity]);
  const isManualMaterial = materialSelection === MANUAL_NOT_FOUND_OPTION;
  const selectedStockMaterial = stockMaterials.find((item) => item.materialCode === materialSelection) ?? null;

  useEffect(() => {
    if (!initialRequest) return;
    setCenter(initialRequest.center ?? "");
    setRequestedQuantity(String(initialRequest.requestedQuantity ?? ""));
    setRequestReason(initialRequest.requestReason ?? "");
    setRequesterJustification(initialRequest.requesterJustification ?? "");
    setMaterialDescription(initialRequest.materialDescription ?? "");
    setMaterialSelection(initialRequest.materialCode ?? "");
  }, [initialRequest]);

  useEffect(() => {
    setLoadingCenters(true);
    void getStockCentersUseCase().then(setCenters).catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar centros.")).finally(() => setLoadingCenters(false));
  }, []);

  useEffect(() => {
    setMaterialSelection("");
    setManualMaterialCode("");
    setMaterialDescription("");
    setAnalysisResult(null);
    if (!center.trim()) {
      setStockMaterials([]);
      return;
    }
    setLoadingMaterials(true);
    void getStockMaterialsByCenterUseCase({ center })
      .then((items) => setStockMaterials(items))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar materiais."))
      .finally(() => setLoadingMaterials(false));
  }, [center]);

  useEffect(() => {
    if (!isManualMaterial && selectedStockMaterial) {
      setMaterialDescription(selectedStockMaterial.description);
    }
    if (isManualMaterial) {
      setMaterialDescription("");
      setAnalysisResult({
        stockMaterial: null,
        stockAnalysis: {
          materialFound: false,
          evaluatedStockTotal: null,
          requestedQuantity: Number.isFinite(parsedRequestedQuantity) ? parsedRequestedQuantity : 0,
          recommendation: "MANUAL_REVIEW_REQUIRED",
          requiresRequesterJustification: true,
          message: "Material não encontrado na base de estoque. A solicitação requer análise manual.",
        },
      });
    } else {
      setAnalysisResult(null);
    }
  }, [isManualMaterial, selectedStockMaterial, parsedRequestedQuantity]);

  const canAnalyze = center.trim() && Number.isFinite(parsedRequestedQuantity) && parsedRequestedQuantity > 0
    && (isManualMaterial ? manualMaterialCode.trim() && materialDescription.trim() : materialSelection.trim() && materialSelection !== MANUAL_NOT_FOUND_OPTION);
  const justificationRequired = analysisResult?.stockAnalysis.requiresRequesterJustification ?? isManualMaterial;

  async function handleAnalyzeStock() {
    if (isManualMaterial) return;
    setError(""); setLoadingAnalysis(true);
    try { setAnalysisResult(await analyzeMaterialRequestStockUseCase({ center, materialCode: materialSelection, requestedQuantity: parsedRequestedQuantity })); }
    catch (e) { setAnalysisResult(null); setError(e instanceof Error ? e.message : "Não foi possível analisar o estoque."); }
    finally { setLoadingAnalysis(false); }
  }

  async function handleSubmit() {
    setError("");
    if (!center.trim()) return setError("Informe o centro da solicitação.");
    const effectiveCode = isManualMaterial ? manualMaterialCode : materialSelection;
    if (!effectiveCode.trim()) return setError("Informe o código do material.");
    if (isManualMaterial && !materialDescription.trim()) return setError("Informe a descrição do material.");
    if (!Number.isFinite(parsedRequestedQuantity) || parsedRequestedQuantity <= 0) return setError("Informe uma quantidade solicitada maior que zero.");
    if (!requestReason.trim()) return setError("Informe o motivo da solicitação.");
    if (justificationRequired && !requesterJustification.trim()) return setError("Informe a justificativa para prosseguir com esta solicitação.");
    setSending(true);
    try {
      if (mode === "edit" && initialRequest?.id) {
        await updateMaterialRequestDraftUseCase({ requestId: initialRequest.id, center, materialCode: effectiveCode, materialDescription, requestedQuantity: parsedRequestedQuantity, requestReason, requesterJustification, isManualMaterial, performedByName: requesterNameFallback, performedByEmail: requesterEmailFallback });
        notify("Solicitação atualizada com sucesso.", "success");
      } else {
        await createMaterialRequestUseCase({ requesterName: requesterNameFallback, requesterEmail: requesterEmailFallback, center, materialCode: effectiveCode, materialDescription, requestedQuantity: parsedRequestedQuantity, requestReason, requesterJustification, isManualMaterial });
        notify("Solicitação salva como rascunho.", "success");
      }
      onCreated();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível criar a solicitação."); }
    finally { setSending(false); }
  }

  const content = <div style={{ minHeight: "100%", padding: uiTokens.spacing.md, display: "grid", gridTemplateRows: "auto 1fr", gap: uiTokens.spacing.md }}>
    <Card><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: uiTokens.spacing.md, flexWrap: "wrap" }}><h2 style={{ margin: 0 }}>{mode === "edit" ? "Editar Solicitação de Material" : "Nova Solicitação de Material"}</h2><div style={{ display: "flex", gap: uiTokens.spacing.sm, flexWrap: "wrap" }}><Button onClick={onBack}>Voltar</Button><Button onClick={() => void handleAnalyzeStock()} disabled={!canAnalyze || loadingAnalysis || isManualMaterial}>{loadingAnalysis ? "Analisando..." : "Analisar Estoque"}</Button><Button tone="primary" onClick={() => void handleSubmit()} disabled={sending}>{sending ? "Salvando..." : mode === "edit" ? "Salvar Alterações" : "Salvar Rascunho"}</Button></div></div></Card>
    <div style={{ display: "grid", gap: uiTokens.spacing.md, alignContent: "start" }}>
      <Card><h3 style={{ margin: "0 0 12px" }}>Dados da Solicitação</h3><div style={{ display: "grid", gap: 12 }}>
        <Field label="Solicitante" layout="inline">{requesterNameFallback}</Field><Field label="E-mail do solicitante" layout="inline">{requesterEmailFallback || "-"}</Field>
        <Field label="Centro"><select value={center} onChange={(e) => setCenter(e.target.value)} style={{ width: "100%" }}><option value="">{loadingCenters ? "Carregando centros..." : "Selecione"}</option>{centers.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
        <Field label="Material"><select value={materialSelection} onChange={(e) => setMaterialSelection(e.target.value)} style={{ width: "100%" }} disabled={!center.trim() || loadingMaterials}><option value="">{!center.trim() ? "Selecione primeiro o centro para carregar os materiais disponíveis." : loadingMaterials ? "Carregando materiais do centro..." : stockMaterials.length ? "Selecione" : "Nenhum material encontrado para este centro."}</option>{stockMaterials.map((m) => <option key={m.materialCode} value={m.materialCode}>{`${m.materialCode} - ${m.description}`}</option>)}<option value={MANUAL_NOT_FOUND_OPTION}>Não encontrei o material</option></select></Field>
        {isManualMaterial ? <><Field label="Código do Material"><input value={manualMaterialCode} onChange={(e) => setManualMaterialCode(e.target.value)} style={{ width: "100%" }} /></Field><Field label="Descrição"><textarea value={materialDescription} onChange={(e) => setMaterialDescription(e.target.value)} rows={3} style={{ width: "100%", resize: "vertical" }} /></Field><StateMessage state="empty" message="Material não encontrado na base de estoque. A solicitação seguirá para análise manual." /></> : <Field label="Descrição"><input value={materialDescription} readOnly style={{ width: "100%" }} /></Field>}
        <Field label="Qtde. Solicitada"><input type="number" min={1} value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} style={{ width: "100%" }} /></Field>
        <Field label="Motivo da Solicitação"><textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value)} rows={4} style={{ width: "100%", resize: "vertical" }} /></Field>
      </div></Card>
      {analysisResult && <StockAnalysisCard stockMaterial={analysisResult.stockMaterial} stockAnalysis={analysisResult.stockAnalysis} requestedCenter={center.trim()} requestedMaterialCode={isManualMaterial ? manualMaterialCode.trim() : materialSelection.trim()} requestedDescription={materialDescription.trim()} isManualMaterial={isManualMaterial} />}
      {justificationRequired && <Card><h3 style={{ margin: "0 0 12px" }}>Justificativa do Solicitante</h3><Field label="Justificativa"><textarea value={requesterJustification} onChange={(e) => setRequesterJustification(e.target.value)} rows={5} style={{ width: "100%", resize: "vertical" }} /></Field></Card>}
      {error && <StateMessage state="error" message={error} />}
    </div></div>;

  if (inModal) return content;
  return <div style={{ background: uiTokens.colors.appBackground, minHeight: "100%" }}>{content}</div>;
}
