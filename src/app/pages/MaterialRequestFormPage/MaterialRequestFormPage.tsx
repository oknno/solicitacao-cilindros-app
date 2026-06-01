import { useEffect, useMemo, useState } from "react";
import {
  analyzeMaterialRequestStockUseCase,
  createMaterialRequestUseCase,
  getCurrentMaterialRequestUserUseCase,
  getStockCentersUseCase,
  getStockMaterialsByCenterUseCase,
  type AnalyzeMaterialRequestStockOutput,
  updateMaterialRequestDraftUseCase,
} from "../../../application/materialRequest";
import type { StockMaterial } from "../../../domain/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { MaterialStockAnalysisSection } from "../../components/materialRequest/MaterialStockAnalysisSection";
import { useToast } from "../../components/notifications/useToast";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";
import { uiTokens } from "../../components/ui/tokens";
import { wizardLayoutStyles } from "../ProjectsPage/components/wizard/wizardLayoutStyles";

const MANUAL_NOT_FOUND_OPTION = "__NOT_FOUND__";
const MAX_REASON_LENGTH = 1000;
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_EXTENSIONS = [".pdf", ".xlsx", ".xls"];

function normalizeMaterialKey(value: string | number | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function normalizeFormText(value: string | number | null | undefined): string {
  return String(value ?? "").trim();
}

interface MaterialRequestFormPageProps {
  onBack: () => void;
  onCreated: () => void;
  inModal?: boolean;
  mode?: "create" | "edit";
  initialRequest?: MaterialRequest;
}


function resolveAnalysisTone(result: AnalyzeMaterialRequestStockOutput | null, isManualMaterial: boolean, requestedQuantity: number): keyof typeof uiTokens.stateTones {
  if (isManualMaterial) return "warning";
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0 || !result) return "neutral";

  const { recommendation, evaluatedStockTotal } = result.stockAnalysis;
  if (recommendation === "PURCHASE_NOT_RECOMMENDED") return "danger";
  if (recommendation === "PURCHASE_RECOMMENDED_PARTIAL_STOCK") return "warning";
  if (recommendation === "PURCHASE_RECOMMENDED" && evaluatedStockTotal === 0) return "danger";
  if (recommendation === "PURCHASE_RECOMMENDED") return "success";
  if (recommendation === "MANUAL_REVIEW_REQUIRED") return "warning";
  if (evaluatedStockTotal === 0) return "success";
  return "neutral";
}

function buildAnalysisMessage(result: AnalyzeMaterialRequestStockOutput | null, isManualMaterial: boolean, requestedQuantity: number): string {
  if (isManualMaterial) return "Material não encontrado na base atual de estoque. A solicitação seguirá para análise manual.";
  if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) return "Informe a quantidade solicitada para concluir a análise de estoque.";
  if (!result) return "Informe os dados do material para concluir a análise de estoque.";

  const { evaluatedStockTotal, recommendation } = result.stockAnalysis;
  if (recommendation === "PURCHASE_RECOMMENDED") return "Não há estoque disponível para este material.";
  if (recommendation === "PURCHASE_RECOMMENDED_PARTIAL_STOCK") return "O estoque atual é insuficiente para atender integralmente a solicitação.";
  if (recommendation === "PURCHASE_NOT_RECOMMENDED") return "Há estoque suficiente para a quantidade solicitada. A compra não é recomendada sem justificativa.";
  if (recommendation === "MANUAL_REVIEW_REQUIRED") return "Material não encontrado na base atual de estoque. A solicitação seguirá para análise manual.";
  if (evaluatedStockTotal === 0) return "Não há estoque disponível para este material.";
  return "Análise de estoque concluída.";
}

export function MaterialRequestFormPage({ onBack, onCreated, inModal, mode = "create", initialRequest }: MaterialRequestFormPageProps) {
  const { notify } = useToast();
  const [requesterName, setRequesterName] = useState("Usuário atual");
  const [requesterEmail, setRequesterEmail] = useState("");
  const [center, setCenter] = useState("");
  const [materialSelection, setMaterialSelection] = useState("");
  const [manualMaterialCode, setManualMaterialCode] = useState("");
  const [materialDescription, setMaterialDescription] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [requesterJustification, setRequesterJustification] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalyzeMaterialRequestStockOutput | null>(null);
  const [stockMaterials, setStockMaterials] = useState<StockMaterial[]>([]);
  const [materialsLoadedCenter, setMaterialsLoadedCenter] = useState("");
  const [centers, setCenters] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [forceShowJustification, setForceShowJustification] = useState(false);

  const parsedRequestedQuantity = useMemo(() => Number(requestedQuantity), [requestedQuantity]);
  const isManualMaterial = materialSelection === MANUAL_NOT_FOUND_OPTION;
  const normalizedMaterialSelection = normalizeMaterialKey(materialSelection);
  const selectedStockMaterial = stockMaterials.find((item) => normalizeMaterialKey(item.materialCode) === normalizedMaterialSelection) ?? null;
  const centerOptions = useMemo(() => {
    const options = [...centers];
    const normalizedCurrentCenter = normalizeMaterialKey(center);
    if (center.trim() && !options.some((option) => normalizeMaterialKey(option) === normalizedCurrentCenter)) {
      options.unshift(center.trim());
    }
    return options;
  }, [center, centers]);

  const effectiveMaterialCode = isManualMaterial ? manualMaterialCode.trim() : materialSelection.trim();
  const justificationRequired = !isManualMaterial && (forceShowJustification || analysisResult?.stockAnalysis.recommendation === "PURCHASE_NOT_RECOMMENDED");

  useEffect(() => {
    void getCurrentMaterialRequestUserUseCase().then((user) => {
      setRequesterName(user.name);
      setRequesterEmail(user.email);
    });
  }, []);

  useEffect(() => {
    if (!initialRequest) return;
    setCenter(normalizeFormText(initialRequest.center));
    setRequestedQuantity(String(initialRequest.requestedQuantity ?? ""));
    setRequestReason(initialRequest.requestReason ?? "");
    setRequesterJustification(initialRequest.requesterJustification ?? "");
    setMaterialDescription(initialRequest.materialDescription ?? "");
    setManualMaterialCode("");
    setMaterialSelection(normalizeFormText(initialRequest.materialCode));
  }, [initialRequest]);

  useEffect(() => {
    setLoadingCenters(true);
    void getStockCentersUseCase().then(setCenters).catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar centros.")).finally(() => setLoadingCenters(false));
  }, []);

  useEffect(() => {
    const normalizedCenter = normalizeFormText(center);
    const isEditingInitialCenter = mode === "edit" && normalizeMaterialKey(initialRequest?.center) === normalizeMaterialKey(normalizedCenter);

    setAnalysisResult(null);
    setMaterialsLoadedCenter("");
    if (!isEditingInitialCenter) {
      setMaterialSelection("");
      setManualMaterialCode("");
      setMaterialDescription("");
    }

    if (!normalizedCenter) {
      setStockMaterials([]);
      return;
    }

    let cancelled = false;
    setLoadingMaterials(true);
    void getStockMaterialsByCenterUseCase({ center: normalizedCenter })
      .then((items) => {
        if (cancelled) return;
        setStockMaterials(items);
        setMaterialsLoadedCenter(normalizedCenter);
      })
      .catch((e) => {
        if (cancelled) return;
        setStockMaterials([]);
        setError(e instanceof Error ? e.message : "Erro ao carregar materiais.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingMaterials(false);
      });

    return () => {
      cancelled = true;
    };
  }, [center, initialRequest?.center, mode]);

  useEffect(() => {
    if (mode !== "edit" || !initialRequest) return;
    if (!center.trim()) return;
    if (normalizeMaterialKey(center) !== normalizeMaterialKey(initialRequest.center)) return;
    if (normalizeMaterialKey(materialsLoadedCenter) !== normalizeMaterialKey(center)) return;

    const savedMaterialCode = normalizeFormText(initialRequest.materialCode);
    if (!savedMaterialCode) return;

    const matchingMaterial = stockMaterials.find((item) => normalizeMaterialKey(item.materialCode) === normalizeMaterialKey(savedMaterialCode));
    if (matchingMaterial) {
      setMaterialSelection(normalizeFormText(matchingMaterial.materialCode));
      setManualMaterialCode("");
      setMaterialDescription(matchingMaterial.description);
      return;
    }

    setMaterialSelection(MANUAL_NOT_FOUND_OPTION);
    setManualMaterialCode(savedMaterialCode);
    setMaterialDescription(initialRequest.materialDescription ?? "");
  }, [center, initialRequest, materialsLoadedCenter, mode, stockMaterials]);

  useEffect(() => {
    if (!isManualMaterial && selectedStockMaterial) {
      setMaterialDescription(selectedStockMaterial.description);
      setAnalysisResult((previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          stockAnalysis: {
            ...previous.stockAnalysis,
            evaluatedStockTotal: selectedStockMaterial.evaluatedStockTotal,
          },
        };
      });
    }
    if (isManualMaterial) {
      setAnalysisResult({ stockMaterial: null, stockAnalysis: { materialFound: false, evaluatedStockTotal: null, requestedQuantity: Number.isFinite(parsedRequestedQuantity) ? parsedRequestedQuantity : 0, recommendation: "MANUAL_REVIEW_REQUIRED", requiresRequesterJustification: false, message: "Material não encontrado na base atual de estoque. A solicitação requer análise manual." } });
    }
  }, [isManualMaterial, selectedStockMaterial, parsedRequestedQuantity]);

  useEffect(() => {
    const canRunAutomaticAnalysis = center.trim() && effectiveMaterialCode && Number.isFinite(parsedRequestedQuantity) && parsedRequestedQuantity > 0;
    if (!canRunAutomaticAnalysis || isManualMaterial) {
      if (!isManualMaterial) setAnalysisResult(null);
      return;
    }

    let cancelled = false;
    setLoadingAnalysis(true);
    setError("");
    void analyzeMaterialRequestStockUseCase({ center, materialCode: effectiveMaterialCode, requestedQuantity: parsedRequestedQuantity })
      .then((result) => {
        if (cancelled) return;
        setAnalysisResult(result);
      })
      .catch((e) => {
        if (cancelled) return;
        setAnalysisResult(null);
        setError(e instanceof Error ? e.message : "Não foi possível analisar o estoque.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingAnalysis(false);
      });

    return () => {
      cancelled = true;
    };
  }, [center, effectiveMaterialCode, isManualMaterial, parsedRequestedQuantity]);


  function handleMaterialSelectionChange(value: string) {
    setMaterialSelection(value);
    if (value === MANUAL_NOT_FOUND_OPTION) {
      setManualMaterialCode("");
      setMaterialDescription("");
    }
  }

  function handleAttachmentChange(file: File | null) {
    setAttachmentError("");
    if (!file) {
      setAttachment(null);
      return;
    }

    const lowerName = file.name.toLowerCase();
    const validExtension = ALLOWED_ATTACHMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
    if (!validExtension) {
      setAttachment(null);
      setAttachmentError("Formato inválido. Anexe um arquivo PDF ou Excel.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAttachment(null);
      setAttachmentError("O arquivo deve ter no máximo 10 MB.");
      return;
    }

    setAttachment(file);
  }

  async function handleSubmit() {
    setError("");
    setForceShowJustification(false);
    if (!requesterName.trim()) return setError("Não foi possível identificar o solicitante.");
    if (!center.trim()) return setError("Informe o centro da solicitação.");
    if (!effectiveMaterialCode) return setError("Informe o código do material.");
    if (isManualMaterial && !materialDescription.trim()) return setError("Informe a descrição do material.");
    if (!Number.isFinite(parsedRequestedQuantity) || parsedRequestedQuantity <= 0) return setError("Informe uma quantidade solicitada maior que zero.");
    if (!requestReason.trim()) return setError("Informe o motivo da solicitação.");
    if (requestReason.trim().length > MAX_REASON_LENGTH) return setError("O motivo deve ter no máximo 1000 caracteres.");
    if (attachmentError) return setError(attachmentError);

    let finalAnalysis = analysisResult;
    if (!isManualMaterial) {
      setLoadingAnalysis(true);
      try {
        finalAnalysis = await analyzeMaterialRequestStockUseCase({ center, materialCode: effectiveMaterialCode, requestedQuantity: parsedRequestedQuantity });
        setAnalysisResult(finalAnalysis);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Não foi possível analisar o estoque.");
        setLoadingAnalysis(false);
        return;
      }
      setLoadingAnalysis(false);
    }

    const requiresJustification = finalAnalysis?.stockAnalysis.recommendation === "PURCHASE_NOT_RECOMMENDED";
    if (requiresJustification && !requesterJustification.trim()) {
      setForceShowJustification(true);
      setError("Informe a justificativa para salvar esta solicitação.");
      return;
    }

    setSending(true);
    try {
      if (mode === "edit" && initialRequest?.id) {
        await updateMaterialRequestDraftUseCase({ requestId: initialRequest.id, center, materialCode: effectiveMaterialCode, materialDescription, requestedQuantity: parsedRequestedQuantity, requestReason, requesterJustification, isManualMaterial, performedByName: requesterName, performedByEmail: requesterEmail });
        notify("Solicitação atualizada com sucesso.", "success");
      } else {
        await createMaterialRequestUseCase({ requesterName, requesterEmail, center, materialCode: effectiveMaterialCode, materialDescription, requestedQuantity: parsedRequestedQuantity, requestReason, requesterJustification, isManualMaterial, attachment: attachment ?? undefined });
        notify("Solicitação salva como rascunho.", "success");
      }
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a solicitação.");
    } finally {
      setSending(false);
    }
  }

  const analysisMessage = buildAnalysisMessage(analysisResult, isManualMaterial, parsedRequestedQuantity);
  const analysisTone = resolveAnalysisTone(analysisResult, isManualMaterial, parsedRequestedQuantity);
  const analysisToneStyle = uiTokens.stateTones[analysisTone];

  const content = <div style={{ height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "minmax(0, 1fr) auto" }}>
    <div style={{ ...wizardLayoutStyles.body, padding: uiTokens.spacing.lg }}>
      <div style={{ ...wizardLayoutStyles.sectionStack, padding: 0 }}>
        <div style={wizardLayoutStyles.card}>
          <h3 style={{ margin: 0, fontSize: uiTokens.typography.lg, fontWeight: uiTokens.typography.titleWeight, color: uiTokens.colors.textStrong }}>Dados da solicitação</h3>
          <div style={{ ...wizardLayoutStyles.journeyStack, gap: uiTokens.spacing.md }}>
            <div style={wizardLayoutStyles.journeyPairGrid}>
              <Field label="Solicitante"><input value={requesterName} readOnly style={wizardLayoutStyles.input} /></Field>
              <Field label="E-mail do solicitante"><input value={requesterEmail || "-"} readOnly style={wizardLayoutStyles.input} /></Field>
            </div>
            <div style={wizardLayoutStyles.journeyPairGrid}>
              <Field label="Centro"><select value={center} onChange={(e) => setCenter(e.target.value)} style={wizardLayoutStyles.input}><option value="">{loadingCenters ? "Carregando centros..." : "Selecione"}</option>{centerOptions.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              <Field label="Material"><select value={materialSelection} onChange={(e) => handleMaterialSelectionChange(e.target.value)} style={wizardLayoutStyles.input} disabled={!center.trim() || loadingMaterials}><option value="">{!center.trim() ? "Selecione primeiro o centro para carregar os materiais disponíveis." : loadingMaterials ? "Carregando materiais do centro..." : stockMaterials.length ? "Selecione" : "Nenhum material encontrado para este centro."}</option>{stockMaterials.map((m) => <option key={normalizeFormText(m.materialCode)} value={normalizeFormText(m.materialCode)}>{`${normalizeFormText(m.materialCode)} - ${m.description}`}</option>)}<option value={MANUAL_NOT_FOUND_OPTION}>Não encontrei o material</option></select></Field>
            </div>

            {isManualMaterial && (
              <div style={wizardLayoutStyles.journeyPairGrid}>
                <Field label="Código do Material"><input value={manualMaterialCode} onChange={(e) => setManualMaterialCode(e.target.value)} style={wizardLayoutStyles.input} /></Field>
                <Field label="Descrição do Material"><input value={materialDescription} onChange={(e) => setMaterialDescription(e.target.value)} style={wizardLayoutStyles.input} /></Field>
              </div>
            )}

            {isManualMaterial ? (
              <Field label="Qtde. Solicitada"><input type="number" min={1} value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} style={wizardLayoutStyles.input} /></Field>
            ) : (
              <div style={wizardLayoutStyles.journeyPairGrid}>
                <Field label="Estoque Avaliado"><input value={selectedStockMaterial?.evaluatedStockTotal ?? analysisResult?.stockAnalysis.evaluatedStockTotal ?? ""} readOnly placeholder="-" style={{ ...wizardLayoutStyles.input, background: uiTokens.colors.surfaceMuted, borderColor: uiTokens.colors.border, color: uiTokens.colors.textMuted, cursor: "not-allowed" }} /></Field>
                <Field label="Qtde. Solicitada"><input type="number" min={1} value={requestedQuantity} onChange={(e) => setRequestedQuantity(e.target.value)} style={wizardLayoutStyles.input} /></Field>
              </div>
            )}

            {(isManualMaterial || selectedStockMaterial) && (
              <MaterialStockAnalysisSection stockMaterial={isManualMaterial ? null : selectedStockMaterial} requestedQuantity={parsedRequestedQuantity} mode="form" />
            )}

            {!isManualMaterial && (
              <div style={{ border: `1px solid ${analysisToneStyle.bd}`, background: analysisToneStyle.bg, color: analysisToneStyle.fg, borderRadius: uiTokens.radius.md, padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.lg}px`, fontSize: uiTokens.typography.sm, lineHeight: 1.4 }}>{loadingAnalysis ? "Atualizando análise de estoque..." : analysisMessage}</div>
            )}

            <Field label="Motivo da Solicitação"><textarea value={requestReason} onChange={(e) => setRequestReason(e.target.value.slice(0, MAX_REASON_LENGTH))} rows={3} style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }} /></Field>
            <p style={{ margin: 0, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>{requestReason.trim().length}/{MAX_REASON_LENGTH} caracteres</p>

            {justificationRequired && <Field label="Se há estoque, qual a necessidade da solicitação?"><textarea value={requesterJustification} onChange={(e) => setRequesterJustification(e.target.value.slice(0, MAX_REASON_LENGTH))} rows={4} style={{ ...wizardLayoutStyles.input, ...wizardLayoutStyles.textareaReadable }} /></Field>}
            {justificationRequired && <p style={{ margin: 0, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}>{requesterJustification.trim().length}/{MAX_REASON_LENGTH} caracteres</p>}

            <Field label="Anexo de apoio">
              <label style={{ display: "grid", gap: uiTokens.spacing.xs, justifyItems: "center", textAlign: "center", border: `1px dashed ${uiTokens.colors.borderStrong}`, borderRadius: uiTokens.radius.md, padding: `${uiTokens.spacing.md}px ${uiTokens.spacing.lg}px`, background: uiTokens.colors.surfaceMuted, cursor: "pointer" }}>
                <input type="file" accept=".pdf,.xlsx,.xls" onChange={(e) => handleAttachmentChange(e.target.files?.[0] ?? null)} style={{ display: "none" }} />
                <span style={{ fontSize: uiTokens.typography.md, color: uiTokens.colors.textStrong }}>Arraste aqui o arquivo</span>
                <span style={{ fontSize: uiTokens.typography.sm, color: uiTokens.colors.textMuted }}>ou clique para selecionar (PDF ou Excel)</span>
                {attachment && <span style={{ fontSize: uiTokens.typography.sm, color: uiTokens.colors.textStrong }}>Arquivo selecionado: {attachment.name}</span>}
              </label>
            </Field>
            {attachment && <p style={{ margin: 0, color: uiTokens.colors.textMuted, fontSize: uiTokens.typography.sm }}><button type="button" onClick={() => setAttachment(null)} style={{ border: `1px solid ${uiTokens.colors.border}`, background: uiTokens.colors.surface, color: uiTokens.colors.textStrong, borderRadius: uiTokens.radius.sm, padding: "4px 10px", cursor: "pointer" }}>Remover arquivo</button></p>}
            {attachmentError && <p style={{ margin: 0, color: uiTokens.colors.danger, fontSize: uiTokens.typography.sm }}>{attachmentError}</p>}
          </div>
        </div>

        {error && <p style={{ margin: 0, color: uiTokens.colors.danger, fontSize: uiTokens.typography.sm }}>{error}</p>}
      </div>
    </div>

    <div style={wizardLayoutStyles.footer}>
      <Button onClick={onBack} disabled={sending || loadingAnalysis}>Cancelar</Button>
      <div style={{ display: "flex", gap: uiTokens.spacing.sm }}>
        <Button tone="primary" onClick={() => void handleSubmit()} disabled={sending || loadingAnalysis}>{sending ? "Salvando..." : mode === "edit" ? "Salvar Alterações" : "Salvar Rascunho"}</Button>
      </div>
    </div>
  </div>;

  if (inModal) return content;
  return <div style={{ background: uiTokens.colors.appBackground, minHeight: "100%" }}>{content}</div>;
}
