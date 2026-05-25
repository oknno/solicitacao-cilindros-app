import { useMemo, useState } from "react";
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

const STAGE_LABELS: Record<ReplaceStockItemsStage, string> = {
  VALIDATING: "Validando dados...",
  LOADING_EXISTING_ITEMS: "Carregando itens atuais...",
  DELETING_OLD_ITEMS: "Removendo base anterior",
  CREATING_NEW_ITEMS: "Importando nova base",
  COMPLETED: "Importação concluída",
  FAILED: "Falha na importação"
};

export function StockImportModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportStockItemsFromExcelOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<ReplaceStockItemsProgress | null>(null);

  const hasColumnError = Boolean(result?.errors.some((error) => error.row === 0 && error.message.includes("Coluna obrigatória não encontrada")));
  const canConfirm = Boolean(file && result && result.items.length > 0 && result.invalidRows === 0 && !hasColumnError && !loading);
  const preview = useMemo(() => result?.items.slice(0, 10) ?? [], [result]);

  async function onPick(nextFile: File) {
    setFile(nextFile);
    setLoading(true);
    setImportProgress(null);
    try {
      setResult(await importStockItemsFromExcelUseCase({ file: nextFile }));
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

  const isImporting = loading && Boolean(importProgress);

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
      <div style={{ display: "grid", gap: 12 }}>
        <input type="file" accept=".xlsx,.xls" onChange={(e) => { const next = e.target.files?.[0]; if (next) void onPick(next); }} />
        {file && <div>Arquivo: <b>{file.name}</b></div>}
        {result && <div>Total: {result.totalRows} | Válidas: {result.validRows} | Inválidas: {result.invalidRows}</div>}
        {importProgress && (
          <div>
            <b>{STAGE_LABELS[importProgress.stage]}</b>
            {importProgress.total > 0 ? `: ${importProgress.processed}/${importProgress.total}` : ""}
          </div>
        )}
        {result?.errors.length ? <ul>{result.errors.map((error, index) => <li key={`${error.row}-${index}`}>Linha {error.row}: {error.message}</li>)}</ul> : null}
        {preview.length > 0 && <table><thead><tr><th>Material</th><th>Descrição</th><th>Centro</th><th>Estoque avaliado total</th></tr></thead><tbody>{preview.map((item, i) => <tr key={`${item.materialCode}-${i}`}><td>{item.materialCode}</td><td>{item.description}</td><td>{item.center}</td><td>{item.evaluatedStockTotal ?? ""}</td></tr>)}</tbody></table>}
      </div>
    </AppModal>
  );
}
