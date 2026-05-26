import { useMemo, useRef, useState, type DragEvent } from "react";
import {
  importStockItemsFromExcelUseCase,
  type ImportStockItemsFromExcelOutput
} from "../../../application/stock/importStockItemsFromExcelUseCase";
import {
  replaceStockItemsUseCase,
  type ReplaceStockItemsProgress,
  type ReplaceStockItemsStage
} from "../../../application/stock/replaceStockItemsUseCase";
import { AppModal } from "../common/AppModal";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StateMessage } from "../ui/StateMessage";
import { uiTokens } from "../ui/tokens";

const STAGE_LABELS: Record<ReplaceStockItemsStage, string> = {
  VALIDATING: "Validando dados...",
  LOADING_EXISTING_ITEMS: "Carregando itens atuais...",
  DELETING_OLD_ITEMS: "Removendo base anterior",
  CREATING_NEW_ITEMS: "Importando nova base",
  COMPLETED: "Importação concluída",
  FAILED: "Falha na importação"
};

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}

export function StockImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportStockItemsFromExcelOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<ReplaceStockItemsProgress | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasColumnError = Boolean(result?.errors.some((error) => error.row === 0 && error.message.includes("Coluna obrigatória não encontrada")));
  const canConfirm = Boolean(file && result && result.items.length > 0 && result.invalidRows === 0 && !hasColumnError && !loading);
  const previewErrors = useMemo(() => result?.errors.slice(0, 8) ?? [], [result]);
  const previewItems = useMemo(() => result?.items ?? [], [result]);
  const isImporting = loading && Boolean(importProgress);

  async function onPick(nextFile: File) {
    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "xlsx" && extension !== "xls") {
      setLocalError("Formato inválido. Envie um arquivo Excel (.xlsx ou .xls).");
      return;
    }

    setLocalError(null);
    setFile(nextFile);
    setLoading(true);
    setImportProgress(null);
    try {
      const parsed = await importStockItemsFromExcelUseCase({ file: nextFile });
      setResult(parsed);
      if (parsed.errors.length > 0 && parsed.items.length === 0) {
        setLocalError("Não foi possível ler o arquivo.");
      }
    } catch {
      setResult(null);
      setLocalError("Não foi possível ler o arquivo.");
    } finally {
      setLoading(false);
    }
  }

  async function onConfirm() {
    if (!result || result.errors.length > 0) return;
    setLoading(true);
    try {
      await replaceStockItemsUseCase(result.items, {
        onProgress: (progress) => setImportProgress(progress)
      });
      alert("Estoque atualizado com sucesso.");
      onSuccess();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      alert(`Falha ao atualizar estoque: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function openPicker() {
    if (!isImporting) fileInputRef.current?.click();
  }


  function onReplaceFile() {
    if (isImporting) return;
    setFile(null);
    setResult(null);
    setLocalError(null);
    setImportProgress(null);
    setDropActive(false);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isImporting) return;
    setDropActive(false);
    const next = event.dataTransfer.files?.[0];
    if (next) void onPick(next);
  }

  return (
    <AppModal
      title="Atualizar Estoque"
      subtitle="Importe um arquivo Excel (.xlsx/.xls)."
      onClose={onClose}
      actions={
        <>
          <Button onClick={onClose} disabled={isImporting}>Cancelar</Button>
          <Button tone="primary" onClick={() => void onConfirm()} disabled={!canConfirm}>
            {loading ? "Importando..." : "Confirmar Atualização"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: uiTokens.spacing.md }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: "none" }}
          onChange={(e) => {
            const next = e.target.files?.[0];
            if (next) void onPick(next);
            e.currentTarget.value = "";
          }}
        />

        <Card>
          {!file && (
            <div
              role="button"
              tabIndex={0}
              onClick={openPicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openPicker();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!isImporting) setDropActive(true);
              }}
              onDragLeave={() => setDropActive(false)}
              onDrop={onDrop}
              style={{
                border: `2px dashed ${dropActive ? uiTokens.colors.accent : uiTokens.colors.borderStrong}`,
                borderRadius: uiTokens.radius.lg,
                background: dropActive ? uiTokens.colors.accentSoft : uiTokens.colors.surfaceMuted,
                minHeight: 200,
                padding: uiTokens.spacing.xl,
                display: "grid",
                alignContent: "center",
                justifyItems: "center",
                gap: uiTokens.spacing.sm,
                cursor: isImporting ? "not-allowed" : "pointer"
              }}
            >
              <div style={{ fontSize: uiTokens.typography.lg, fontWeight: uiTokens.typography.titleWeight, color: uiTokens.colors.textStrong }}>
                Arraste aqui o arquivo Excel
              </div>
              <div style={{ fontSize: uiTokens.typography.sm, color: uiTokens.colors.textMuted }}>ou clique para selecionar</div>
            </div>
          )}

          {file && (
            <div style={{ display: "grid", gap: uiTokens.spacing.sm }}>
              <div style={{ fontSize: uiTokens.typography.sm, color: uiTokens.colors.textStrong }}>
                Arquivo selecionado: <b>{file.name}</b> ({formatFileSize(file.size)})
              </div>
              <button
                type="button"
                onClick={onReplaceFile}
                disabled={isImporting}
                style={{
                  appearance: "none",
                  border: "none",
                  background: "transparent",
                  color: uiTokens.colors.accentAlt,
                  textDecoration: "underline",
                  padding: 0,
                  cursor: isImporting ? "not-allowed" : "pointer",
                  justifySelf: "start"
                }}
              >
                Trocar arquivo
              </button>
            </div>
          )}
        </Card>

        {result && (
          <Card>
            <div style={{ display: "grid", gap: uiTokens.spacing.xs }}>
              <div style={{ fontWeight: uiTokens.typography.mediumWeight, color: uiTokens.colors.textStrong }}>Resumo da importação</div>
              <div style={{ color: uiTokens.colors.text }}>
                Total: {result.totalRows} | Válidas: {result.validRows} | Inválidas: {result.invalidRows}
              </div>
            </div>
          </Card>
        )}


        {result && (
          <Card>
            <div style={{ display: "grid", gap: uiTokens.spacing.sm }}>
              <div style={{ fontWeight: uiTokens.typography.mediumWeight, color: uiTokens.colors.textStrong }}>Preview dos itens válidos</div>
              <div
                style={{
                  border: `1px solid ${uiTokens.colors.border}`,
                  borderRadius: uiTokens.radius.md,
                  overflow: "hidden",
                  background: uiTokens.colors.surface
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.1fr 2fr 0.8fr 1fr",
                    gap: uiTokens.spacing.sm,
                    padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.md}px`,
                    background: uiTokens.colors.surfaceMuted,
                    borderBottom: `1px solid ${uiTokens.colors.border}`,
                    fontSize: uiTokens.typography.xs,
                    fontWeight: uiTokens.typography.mediumWeight,
                    color: uiTokens.colors.textMuted
                  }}
                >
                  <span>Material</span>
                  <span>Descrição</span>
                  <span>Centro</span>
                  <span>Estoque Avaliado</span>
                </div>
                <div style={{ maxHeight: 250, overflowY: "auto" }}>
                  {previewItems.length > 0 ? previewItems.map((item, index) => (
                    <div
                      key={`${item.center}-${item.materialCode}-${index}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1.1fr 2fr 0.8fr 1fr",
                        gap: uiTokens.spacing.sm,
                        padding: `${uiTokens.spacing.sm}px ${uiTokens.spacing.md}px`,
                        fontSize: uiTokens.typography.sm,
                        color: uiTokens.colors.text,
                        borderBottom: index < previewItems.length - 1 ? `1px solid ${uiTokens.colors.border}` : "none"
                      }}
                    >
                      <span>{item.materialCode}</span>
                      <span style={{ overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }} title={item.description}>{item.description}</span>
                      <span>{item.center}</span>
                      <span>{item.evaluatedStockTotal}</span>
                    </div>
                  )) : (
                    <div style={{ padding: uiTokens.spacing.md, fontSize: uiTokens.typography.sm, color: uiTokens.colors.textMuted }}>
                      Nenhum item válido para exibir.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {isImporting && <StateMessage state="loading" message={`${STAGE_LABELS[importProgress?.stage ?? "VALIDATING"]}${importProgress && importProgress.total > 0 ? `: ${importProgress.processed}/${importProgress.total}` : ""}`} />}
        {!isImporting && localError && <StateMessage state="error" message={localError} />}
        {!isImporting && result && result.validRows > 0 && result.invalidRows === 0 && !hasColumnError && !localError && (
          <StateMessage state="success" message="Arquivo válido. Pronto para confirmar atualização." />
        )}
        {!isImporting && result && result.errors.length > 0 && (
          <Card style={{ background: uiTokens.stateTones.warning.bg, border: `1px solid ${uiTokens.stateTones.warning.bd}` }}>
            <div style={{ display: "grid", gap: uiTokens.spacing.xs, color: uiTokens.stateTones.warning.fg }}>
              <b>Linhas com erro</b>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {previewErrors.map((error, index) => <li key={`${error.row}-${index}`}>Linha {error.row}: {error.message}</li>)}
              </ul>
              {result.errors.length > previewErrors.length && <small>Mostrando {previewErrors.length} de {result.errors.length} erros.</small>}
            </div>
          </Card>
        )}
      </div>
    </AppModal>
  );
}
