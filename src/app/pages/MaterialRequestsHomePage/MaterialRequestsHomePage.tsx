import { useCallback, useEffect, useMemo, useState } from "react";
import { decideMaterialRequestApprovalUseCase, getMaterialRequestsUseCase } from "../../../application/materialRequest";
import type { MaterialRequest } from "../../../domain/materialRequest/types";
import { Card } from "../../components/ui/Card";
import { uiTokens } from "../../components/ui/tokens";
import { MaterialRequestsTable } from "../../components/materialRequest/MaterialRequestsTable";
import { MaterialRequestSummaryPanel } from "../../components/materialRequest/MaterialRequestSummaryPanel";
import { CommandBar, type ProjectsFilters } from "../ProjectsPage/CommandBar";
import { MaterialRequestFormModal } from "../../components/materialRequest/MaterialRequestFormModal";
import { MaterialRequestViewModal } from "../../components/materialRequest/MaterialRequestViewModal";

const DEFAULT_FILTERS: ProjectsFilters = { searchTitle:"",status:"",unit:"",requesterName:"",sortBy:"Title",sortDir:"asc" };
export function MaterialRequestsHomePage() {
const [items,setItems]=useState<MaterialRequest[]>([]);const [selectedId,setSelectedId]=useState<number|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [filters,setFilters]=useState<ProjectsFilters>(DEFAULT_FILTERS);
const [formOpen,setFormOpen]=useState(false);const [viewOpen,setViewOpen]=useState(false);
const selected=useMemo(()=>items.find(i=>i.id===selectedId)??null,[items,selectedId]);
const load=useCallback(async()=>{setLoading(true);try{const result=await getMaterialRequestsUseCase();setItems(result);setSelectedId(c=>result.some(i=>i.id===c)?c:result[0]?.id??null);}catch{setError("Não foi possível carregar as solicitações de material. Tente novamente.");}finally{setLoading(false);}},[]);
useEffect(()=>{void load();},[load]);
const canApproveOrReject=selected?.status==="PENDING_CTO_APPROVAL"||selected?.status==="PENDING_LAMINATION_MANAGER_APPROVAL";
async function decide(decision:"APPROVE"|"REJECT"){if(!selected?.id||!canApproveOrReject) return; const role=selected.status==="PENDING_CTO_APPROVAL"?"CTO":"LAMINATION_MANAGER"; await decideMaterialRequestApprovalUseCase({requestId:selected.id,decision,approverRole:role,approverName:"Usuário atual"}); await load();}
const indicators={total:items.length,pendingLam:items.filter(i=>i.status==="PENDING_LAMINATION_MANAGER_APPROVAL").length,pendingCto:items.filter(i=>i.status==="PENDING_CTO_APPROVAL").length,approved:items.filter(i=>i.status==="APPROVED").length,exceptions:items.filter(i=>i.stockRecommendation==="PURCHASE_NOT_RECOMMENDED"||i.stockRecommendation==="MANUAL_REVIEW_REQUIRED").length};
return <div style={{ background: uiTokens.colors.appBackground, height: "100%", padding: uiTokens.spacing.md, display: "grid", gridTemplateRows: "auto auto 1fr", gap: uiTokens.spacing.md }}>
<CommandBar title="Solicitação de Material Cilindros" isAdmin selectedId={selectedId} totalLoaded={items.length} canEdit={false} canDelete={false} canSend={false} canBack={false} canApprove={Boolean(canApproveOrReject)} canReject={Boolean(canApproveOrReject)} approveDisabledReason="Selecione uma solicitação pendente de aprovação." rejectDisabledReason="Selecione uma solicitação pendente de aprovação." filters={filters} onChangeFilters={(patch)=>setFilters(c=>({...c,...patch}))} onApply={()=>undefined} onClear={()=>setFilters(DEFAULT_FILTERS)} onRefresh={()=>void load()} onNew={()=>setFormOpen(true)} canCreate onView={()=>setViewOpen(Boolean(selected))} onEdit={()=>undefined} onDuplicate={()=>undefined} onDelete={()=>undefined} onSendToApproval={()=>undefined} onBackStatus={()=>undefined} onApprove={()=>void decide("APPROVE")} onReject={()=>void decide("REJECT")} showApprovalActions onExportTable={()=>undefined} onExportProject={()=>undefined} availableUnits={[]}/>
<div style={{ display: "grid", gap: uiTokens.spacing.sm, gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>{[["Total",indicators.total],["Pendentes Gerente",indicators.pendingLam],["Pendentes CTO",indicators.pendingCto],["Aprovadas",indicators.approved],["Exceções",indicators.exceptions]].map(([l,v])=><Card key={String(l)}><div>{l}</div><div style={{fontSize:24,fontWeight:700}}>{v}</div></Card>)}</div>
<div style={{ display:"grid",gridTemplateColumns:"minmax(0,2fr) minmax(360px,1fr)",gap:uiTokens.spacing.md,minHeight:0 }}><Card style={{minHeight:0,overflow:"hidden"}}>{loading?<p>Carregando solicitações...</p>:error?<p>{error}</p>:<MaterialRequestsTable items={items} selectedId={selectedId} onSelect={(item)=>setSelectedId(item.id??null)} />}</Card><Card style={{overflow:"auto"}}><MaterialRequestSummaryPanel selected={selected} /></Card></div>
{formOpen&&<MaterialRequestFormModal onClose={()=>setFormOpen(false)} onCreated={()=>{setFormOpen(false);void load();}}/>}
{viewOpen&&selected&&<MaterialRequestViewModal request={selected} onClose={()=>setViewOpen(false)} />}
</div>;
}
