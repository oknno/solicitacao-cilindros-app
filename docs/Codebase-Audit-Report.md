# Codebase Audit Report — Solicitação de Material Cilindros e Discos

Data da análise: 2026-06-03  
Escopo: análise estática do código-fonte, testes automatizados existentes e scripts de build/typecheck/lint.  
Importante: este relatório não altera comportamento, não refatora e não remove arquivos. Ele registra achados, riscos e recomendações.

## 1. Resumo executivo

O projeto evoluiu para uma arquitetura em camadas reconhecível (`app`, `application`, `domain`, `services/sharepoint`) e a maior parte do fluxo de **solicitação de materiais** já está separada em use cases, policies de domínio, repositories SharePoint e componentes React. Os pontos mais maduros são:

- status oficiais centralizados no domínio;
- policies de RLS em `domain/accessControl`;
- use cases para criar, editar, enviar, aprovar, retornar status, consultar anexos e dashboard;
- repositories SharePoint com mappers específicos;
- lista `MaterialCenters` isolada de `StockItems` para alimentar centros do formulário;
- campos técnicos manuais mapeados na criação, leitura e edição;
- dashboard de estoque usando base completa paginada no caso principal (`getAllStockItems`).

Entretanto, há riscos relevantes:

1. **Crítico — exclusão sem validação de solicitante/perfil no use case usado pela tela atual.** `deleteMaterialRequestUseCase` valida apenas status `DRAFT`; não recebe `accessProfile` e não chama policy de autorização. Isso cria inconsistência com o CommandBar, que bloqueia por UI, mas não garante a ação no use case.
2. **Alto — `returnMaterialRequestStatusUseCase` usa policy de alteração do solicitante.** A regra atual exige que o próprio solicitante retorne a pendência para `RETURNED_TO_DRAFT`, enquanto a permissão de comando também exige `canSubmitRequest`. Isso pode estar funcionalmente correto se “voltar status” for ação do solicitante, mas conflita com a nomenclatura de “retorno” e precisa validação de produto.
3. **Alto — `getStockMaterialsByCenter` não pagina.** O formulário pode carregar só a primeira página até 5000 itens de um centro, enquanto o dashboard usa paginação completa. Se um centro ultrapassar 5000 materiais, o dropdown e a validação por centro podem ficar incompletos.
4. **Alto — código legado de Projetos/CAPEX ainda é grande e acoplado a UI atual.** A aplicação atual não renderiza `ProjectsPage`, mas componentes de materiais importam `CommandBar`, estilos e `wizardLayoutStyles` da área de projetos. Isso mantém dependências antigas, aumenta risco de manutenção e dificulta remover o módulo legado.
5. **Médio/Alto — mapeamento de status legado converte `CANCELLED` para `APPROVED`.** Isso evita status fora do union oficial, mas pode distorcer histórico e visibilidade de registros antigos.
6. **Médio — validação de permissões está parcialmente duplicada entre UI, domain e use cases.** A maior parte está bem localizada, mas existem decisões de botões, filtros e ações espalhadas que devem convergir para policies de aplicação/domínio.
7. **Médio — dashboard recalcula agregações grandes diversas vezes e tem componente muito extenso.** A tela tem mais de 1400 linhas e mistura estilos, helpers, filtros, visualização, modal de detalhe e estado.

## 2. Estado geral do código

### Diagnóstico geral

| Área | Estado | Observação |
| --- | --- | --- |
| `src/app` | Parcialmente consistente | UI chama use cases no fluxo de material, mas reutiliza componentes/estilos de `ProjectsPage` e contém páginas grandes. |
| `src/application` | Bom, com gaps | Use cases existem e validam fluxo, porém alguns ainda importam repositories diretamente sem interface/DI e há legado de projetos. |
| `src/domain` | Bom | Contém status, policies, normalizações e regras puras. Alguns fallbacks de status legado precisam revisão. |
| `src/services/sharepoint` | Bom, com duplicações | Repositories e mappers estão isolados; paginação está presente em alguns endpoints, ausente em outros. |
| CSS global | Funcional, mas arriscado | `index.css` é relativamente controlado por `#static-mirror`, porém há dependência de altura fixa/clamp e estilos herdados de projetos. |
| Testes | Relevantes | Existem testes para domínio, use cases e repositories/mappers, mas não cobrem todos os gaps de permissão e paginação. |

## 3. Arquitetura atual

### O que está correto

- A aplicação principal (`App.tsx`) renderiza somente as páginas de solicitações e dashboard, resolve acesso do usuário e mantém a SplashScreen separada da Home.
- A UI de materiais majoritariamente chama use cases (`getMaterialRequestsUseCase`, `submitMaterialRequestForApprovalUseCase`, `createMaterialRequestUseCase`, `updateMaterialRequestDraftUseCase`, `getMaterialDashboardUseCase`) em vez de chamar SharePoint diretamente.
- O domínio concentra regras puras importantes:
  - status oficiais;
  - normalização de centros;
  - análise de estoque;
  - RLS e policies de acesso;
  - permissões de CommandBar.
- Repositories SharePoint ficam em `services/sharepoint` e encapsulam REST, paginação, digest e mappers.
- `MaterialCenters` foi implementado como fonte independente para os centros de formulário, evitando depender de materiais com estoque.

### Fora do padrão esperado

| Achado | Evidência | Risco | Recomendação |
| --- | --- | --- | --- |
| UI de material depende de `ProjectsPage` para `CommandBar`, estilos e layout do wizard. | Imports em `MaterialRequestsHomePage`, `MaterialDashboardPage`, `MaterialRequestFormPage`, `MaterialRequestApprovalModal`, `AppModal`. | Alto: remover legado de projetos pode quebrar materiais; responsabilidades ficam misturadas. | Extrair `CommandBar`, `wizardLayoutStyles` e estilos compartilhados para `src/app/components` ou `src/app/components/ui/layout`. |
| `application/materialRequest/exportMaterialRequestsUseCase.ts` importa utilitário de UI (`app/utils/exportExcel`). | Use case depende de camada `app`. | Médio: quebra regra de dependência; application não deveria depender da UI. | Mover `exportExcel` para `application`/`services` ou criar porta de exportação. |
| Repositories são importados diretamente pelos use cases, sem contratos. | Use cases chamam funções concretas de SharePoint. | Baixo/Médio: dificulta testes com mocks e substituição de backend. | Para evolução, criar interfaces/ports para repositórios principais. |
| `ProjectsPage` permanece inteiro no bundle apesar de não ser renderizado pelo App atual. | Não há rota para `ProjectsPage` em `App.tsx`, mas arquivos permanecem importáveis por dependências compartilhadas. | Médio: bundle/manutenção e risco de acoplamento. | Separar legado em `archive` ou remover após validar que não é requisito. |

### Dependência circular

Não foi identificada dependência circular óbvia na análise estática manual. O risco principal não é circularidade, mas **direção de dependência invertida** (`application` importando utilitário de `app`) e **acoplamento de UI material com UI de projetos**.

## 4. Pontos corretos e bem implementados

1. **Status oficiais tipados.** `MaterialRequestStatus` contém somente `DRAFT`, `RETURNED_TO_DRAFT`, `PENDING_LAMINATION_MANAGER_APPROVAL`, `PENDING_CTO_APPROVAL`, `APPROVED` e `REJECTED`.
2. **Fluxo principal de status nos use cases.** Criação nasce `DRAFT`; envio permite `DRAFT`, `RETURNED_TO_DRAFT` e `REJECTED` para gerente; gerente aprova para CTO ou reprova; CTO aprova/reprova; retorno só é mapeado de `PENDING_LAMINATION_MANAGER_APPROVAL` para `RETURNED_TO_DRAFT`.
3. **RLS centralizada em policy de domínio.** `canAccessMaterialRequest`, `filterMaterialRequestsByAccess`, `filterCentersByAccess` e `assertCanDecideMaterialRequest` concentram boa parte do acesso.
4. **`MaterialAccessControl` usa `UserEmail`, `Role`, `Center`, `IsActive`.** O mapper normaliza e-mail para minúsculas, role para maiúsculas, `IsActive` como texto `TRUE` e pagina resultados.
5. **`MaterialCenters` preserva centros como string.** O mapper usa `normalizeCenter`, não converte centro para number, deduplica e ordena na application.
6. **Campos técnicos existem em domínio, formulário, visualização e mapper.** O conjunto de campos técnicos é consistente entre `technicalData`, `MATERIAL_REQUEST_TECHNICAL_FIELDS`, formulário e visualização.
7. **Anexos passam por use cases para leitura/mutação.** Listagem valida acesso por `canAccessMaterialRequest`; adição/exclusão valida solicitante/admin e status editável.
8. **Dashboard usa `getAllStockItems` paginado na base principal.** Isso atende o requisito de não depender da página atual da tabela.
9. **SplashScreen não desmonta o app.** `App.tsx` mantém `appContent` montado e controla visibilidade/fade por estado.
10. **Há testes automatizados cobrindo regras centrais.** O projeto possui testes para status, RLS, use cases de material, mappers, MaterialCenters, MaterialAccessControl e importação de estoque.

## 5. Problemas encontrados

### 5.1 Críticos

#### 5.1.1 Exclusão de solicitação sem validação de permissão no use case

- **Arquivo:** `src/application/materialRequest/deleteMaterialRequestUseCase.ts`
- **Problema:** o use case recebe apenas `requestId`, `performedByName` e `performedByEmail`; busca a solicitação e valida somente `req.status === "DRAFT"`.
- **Impacto:** qualquer chamada ao use case que conheça um ID de rascunho pode excluir a solicitação, mesmo que não seja o solicitante/admin. A UI atual protege o botão pelo CommandBar, mas a ação em si não protege.
- **Recomendação:** adicionar `accessProfile`, resolver perfil quando ausente e chamar `assertCanModifyOwnMaterialRequest` antes de excluir.
- **Classificação:** refatoração crítica antes de novas features.

### 5.2 Altos

#### 5.2.1 `getStockMaterialsByCenter` não pagina

- **Arquivo:** `src/services/sharepoint/repositories/stockMaterialRepository.ts`
- **Problema:** usa `$top=5000` e `spGetJson` direto, sem `getAllPagedItems`.
- **Impacto:** centros com mais de 5000 materiais podem mostrar dropdown incompleto, não encontrar materiais existentes e induzir seleção manual “Não encontrei material”.
- **Recomendação:** reutilizar paginação `getAllPagedItems` também neste método.

#### 5.2.2 Status legado `CANCELLED` normalizado para `APPROVED`

- **Arquivo:** `src/domain/materialRequest/status.ts`
- **Problema:** `normalizeMaterialRequestStatus("CANCELLED")` retorna `APPROVED`.
- **Impacto:** registros antigos cancelados passam a ser tratados como aprovados, afetando dashboard, filtros, RLS e exportação.
- **Recomendação:** validar regra de negócio. Se `CANCELLED` não deve ser status oficial, preferir mapear para `REJECTED` ou criar label “legado/cancelado” somente para leitura histórica.

#### 5.2.3 Código legado de projetos ainda acoplado ao módulo material

- **Arquivos/pastas:** `src/app/pages/ProjectsPage`, `src/application/use-cases`, `src/domain/projects`, `src/services/sharepoint/projectsApi.ts`, `milestonesApi.ts`, `activitiesApi.ts`, `pepsApi.ts`.
- **Problema:** App atual não usa `ProjectsPage`, mas materiais dependem de `CommandBar` e estilos vindos de `ProjectsPage`.
- **Impacto:** manutenção difícil, bundle maior, risco de quebrar tela atual ao tentar remover legado.
- **Recomendação:** primeiro extrair componentes compartilhados; depois validar remoção ou arquivamento do módulo projetos.

#### 5.2.4 Duplicidade/ambiguidade de use cases de aprovação CTO

- **Arquivos:** `decideMaterialRequestApprovalUseCase.ts`, `decideMaterialRequestUseCase.ts`, `CtoApprovalPage.tsx`, `MaterialRequestApprovalModal.tsx`.
- **Problema:** existe um use case genérico de aprovação e outro wrapper antigo específico de CTO; `CtoApprovalPage` parece não ser usada pelo App atual.
- **Impacto:** duplicação e risco de corrigir regra em um fluxo e esquecer outro.
- **Recomendação:** manter apenas `decideMaterialRequestApprovalUseCase` após validar remoção de `CtoApprovalPage`.

### 5.3 Médios

- `returnMaterialRequestStatusUseCase` usa `assertCanModifyOwnMaterialRequest`; isso bloqueia gerente/CTO e permite retorno apenas pelo solicitante/admin. Validar se esta é a regra esperada.
- `resolveCurrentUserAccess` faz fallback silencioso para `USER` se falhar a leitura de acesso. Isso é seguro para privilégios, mas pode esconder problemas operacionais e deixar usuários sem acesso esperado.
- `getMaterialRequestsUseCase` baixa todas as solicitações e filtra no cliente. Risco de performance e confidencialidade client-side em bases grandes.
- `getMaterialDashboardUseCase` baixa todos os estoques e todas as solicitações antes de filtrar acesso. Risco semelhante de performance/confidencialidade client-side.
- `MaterialDashboardPage.tsx` tem 1484 linhas e mistura estilos, helpers, filtros, cards, tabela, modal e estado.
- `MaterialRequestFormPage.tsx` centraliza muitas regras de tela, validações e chamadas assíncronas; ainda é aceitável, mas caminha para componente grande.
- Anexos validam tipo/tamanho somente no formulário de criação. Na edição, `RequestAttachmentsSection` aceita `.pdf,.xlsx,.xls` no input, mas o use case não valida extensão/tamanho.
- `buildAttachmentOpenUrl` usa `new URL(serverRelativeUrl, siteUrl + "/")`; se SharePoint retornar URL absoluta ou server relative de outro host, deve ser validado em ambiente real.
- `deleteAttachmentFromMaterialRequest` codifica fileName manualmente; há risco com caracteres especiais SharePoint/OData.

### 5.4 Baixos

- `StockMaterialRepository.findStockMaterialByCode` contém comentário `/* unchanged */`, sinal de patch legado.
- CSS global contém áreas antigas (`capex-bootstrap`, header, table, commandbar) que podem não estar todas em uso no app material.
- `BootstrapLoader.tsx` existe, mas App atual usa texto simples enquanto aguarda permissões; parece sobra de fluxo anterior.
- Há várias funções compactadas em uma linha em use cases (`decideMaterialRequestApprovalUseCase`, `deleteMaterialRequestUseCase`, etc.), dificultando leitura, mas sem impacto funcional imediato.

## 6. Código legado provável

| Item | Evidência | Classificação |
| --- | --- | --- |
| `src/app/pages/ProjectsPage/**` | Não é renderizado por `App.tsx`; ainda é usado indiretamente por componentes de material para `CommandBar`/estilos. | Remoção provável, mas precisa validar e extrair dependências. |
| `src/application/use-cases/**` de projeto | Use cases de projeto não são usados pelo App atual. | Remoção provável, mas precisa validar histórico/requisito. |
| `src/domain/projects/**` e `src/domain/rules/**` | Associados ao fluxo CAPEX/projetos antigo. | Remoção provável, mas precisa validar. |
| `src/services/sharepoint/projectsApi.ts`, `milestonesApi.ts`, `activitiesApi.ts`, `pepsApi.ts`, `commitProjectStructure.ts` | APIs de projeto não usadas pelo fluxo material atual, mas usadas por `ProjectsPage`. | Remoção provável, mas precisa validar. |
| `src/services/sharepoint/authorizationApi.ts` | Não referenciado diretamente pelo fluxo atual; novo RLS usa `MaterialAccessControl`. | Remoção provável, mas precisa validar. |
| `CtoApprovalPage` | Não aparece no App atual; aprovação atual usa `MaterialRequestApprovalModal`. | Remoção provável, mas precisa validar. |
| `DeleteMaterialRequestModal` | Não importado por Home atual; exclusão usa `ConfirmDialog`. | Remoção provável, mas precisa validar. |
| `SubmitMaterialRequestModal` | Não importado por Home atual; envio usa `ConfirmDialog`. | Remoção provável, mas precisa validar. |
| `StockAnalysisCard` | Não importado por formulário atual; análise usa `MaterialStockAnalysisSection`. | Remoção provável, mas precisa validar. |
| `BootstrapLoader` | App atual mostra parágrafo de carregamento de permissões. | Remoção provável, mas precisa validar. |
| `docs/ux-feedback-map.md` com exportação CSV de projetos | Documentação de fluxo antigo. | Manter como arquivo histórico ou arquivar. |

## 7. Código que pode ser removido com segurança

Nenhum item deve ser removido nesta etapa sem uma validação adicional, porque há testes existentes para alguns módulos legados e componentes atuais ainda importam partes de `ProjectsPage`.

Candidatos mais próximos de remoção segura após confirmar ausência de uso em build/prod:

1. `DeleteMaterialRequestModal` — aparentemente não importado; fluxo atual usa `ConfirmDialog`.
2. `SubmitMaterialRequestModal` — aparentemente não importado; fluxo atual usa confirmação inline.
3. `StockAnalysisCard` — aparentemente não importado; substituído por `MaterialStockAnalysisSection`.
4. `BootstrapLoader` — aparentemente não usado pelo App atual.

Antes de remover, rodar busca de referências, build e testes.

## 8. Código que pode ser removido, mas precisa validação

1. **Módulo de Projetos completo.** Precisa extrair `CommandBar`, `wizardLayoutStyles` e estilos usados por materiais.
2. **`CtoApprovalPage` e `decideMaterialRequestUseCase`.** Validar se não há rota externa antiga apontando para essa página.
3. **`authorizationApi.ts`.** Validar se não é usado por integrações fora do bundle atual.
4. **Documentação/arquivos de UX de projetos.** Manter se houver valor histórico; caso contrário, arquivar.
5. **Status legado `RETURNED_FOR_ADJUSTMENT` e `CANCELLED`.** Não remover diretamente: eles aparecem como compatibilidade de leitura/mapeamento. Validar se dados antigos ainda existem.

## 9. Pontos que precisam refatoração

### Prioridade alta

- Corrigir validação de permissão no use case de exclusão.
- Paginar `getStockMaterialsByCenter`.
- Extrair dependências compartilhadas de `ProjectsPage` para módulo neutro.
- Revisar fallback de status legado `CANCELLED`.

### Prioridade média

- Quebrar `MaterialDashboardPage.tsx` em:
  - hooks de carregamento/filtros;
  - helpers de agregação;
  - `StockKpiCards`;
  - `StockValueByCenterChart`;
  - `StockSignalDistribution`;
  - `StockManagementTable`;
  - `MaterialDetailModal`;
  - `DashboardFilterModal`.
- Quebrar `MaterialRequestFormPage.tsx` em hook de estado/formulário e componentes de seções.
- Mover `exportExcel` para fora de `app` ou inverter dependência por porta.
- Centralizar regras de editabilidade de anexos em uma policy de domínio.
- Padronizar validação de anexos em create/edit no use case.
- Criar helper comum de paginação OData para reduzir duplicação entre repositories.

### Prioridade baixa

- Remover comentários/resíduos como `/* unchanged */`.
- Normalizar estilo de código em use cases compactados.
- Revisar CSS antigo por ferramenta/checagem manual de classes.

## 10. Riscos funcionais

1. **Exclusão indevida de rascunhos.** Use case atual não valida dono/admin.
2. **Material existente não aparece no formulário.** Centros com mais de 5000 itens podem ter dropdown incompleto por ausência de paginação.
3. **Status legado apresentado como aprovado.** `CANCELLED` vira `APPROVED`, podendo distorcer dashboards e decisões.
4. **Retorno de status pode estar disponível para ator errado.** Validar se retorno para `RETURNED_TO_DRAFT` deve ser feito pelo solicitante, gerente ou admin.
5. **Edição de anexos permite arquivos fora de regras se acionada por código.** Use case não valida extensão/tamanho.
6. **Upload de estoque é destrutivo.** `replaceStockItems` apaga todos os itens e recria; falha durante criação deixa base parcial.
7. **Fallback silencioso de acesso.** Falhas em `MaterialAccessControl` transformam usuário em `USER`, o que pode gerar chamados por perda de acesso sem diagnóstico visível.
8. **Busca/filtro client-side em bases grandes.** Pode ficar lento e carregar dados sensíveis no navegador antes do filtro.

## 11. Riscos de segurança/RLS

### Implementação correta

- `UserEmail` é a chave para RLS e é normalizado em lowercase.
- `MaterialAccessControl` usa `Role`, `Center`, `IsActive` como texto.
- `ADMIN` vê tudo.
- `CTO` vê todos os centros, mas não é ADMIN.
- `MANAGER` vê apenas centros vinculados e não vê `DRAFT`/`RETURNED_TO_DRAFT`.
- `CTO` não vê `DRAFT`, `RETURNED_TO_DRAFT` nem `PENDING_LAMINATION_MANAGER_APPROVAL`.
- `Visualizar anexos` passa por `getMaterialRequestAttachmentsUseCase` e valida `canAccessMaterialRequest`.
- Aprovação/reprovação passa por `assertCanDecideMaterialRequest`.

### Falhas/gaps

| Gap | Impacto | Recomendação |
| --- | --- | --- |
| Exclusão não valida `accessProfile`. | Crítico. | Aplicar `assertCanModifyOwnMaterialRequest`. |
| `getMaterialRequestsUseCase` filtra client-side. | Usuário pode baixar todos os registros se bundle/chamada for inspecionado? Depende de permissões SharePoint da lista. | Aplicar filtros OData por perfil quando possível e reforçar permissões SharePoint. |
| `getMaterialDashboardUseCase` baixa todo estoque e solicitações antes de filtrar. | Performance/confidencialidade client-side. | Server-side/OData filter por centros/status quando possível. |
| Botões e use cases têm regras separadas. | Divergência futura. | Centralizar em policies e testar. |
| Dashboard `ADMIN/CTO` vê todos os centros; `USER` não vê estoque por `filterCentersByAccess` retornar vazio. | Provavelmente correto, mas validar se USER deveria ver dashboard. | Documentar regra e bloquear botão/dashboard para USER se não aplicável. |
| `resolveCurrentUserAccess` fallback silencioso. | Pode mascarar falha de segurança/configuração. | Exibir aviso operacional ou log estruturado. |

## 12. Riscos de performance

| Área | Impacto | Achado | Recomendação |
| --- | --- | --- | --- |
| Dashboard inicial | Alto em bases grandes | Carrega `getAllStockItems()` + `getMaterialRequests()` completos. | Filtrar por perfil no servidor e/ou cache controlado. |
| Formulário/material por centro | Alto se >5000 itens | Não pagina materiais do centro. | Usar paginação. |
| Dashboard UI | Médio | Agregações e filtros recalculam arrays grandes; há `useMemo`, mas helpers fazem múltiplos `.filter`/`.reduce`. | Consolidar agregações em única passagem. |
| Upload estoque | Alto | Apagar + recriar toda base em batches. | Estratégia transacional/duas fases, import staging ou diff incremental. |
| Anexos | Baixo/Médio | Listagem recarrega após cada mutação; upload sequencial. | Aceitável para poucos anexos; para muitos, considerar batch/parallel com limite. |
| Splash/Home | Baixo | App carrega em segundo plano; não duplica dados aparentes. | Manter. |

## 13. Inconsistências de status/fluxo

### Status oficiais

Status oficiais encontrados no domínio:

- `DRAFT`
- `RETURNED_TO_DRAFT`
- `PENDING_LAMINATION_MANAGER_APPROVAL`
- `PENDING_CTO_APPROVAL`
- `APPROVED`
- `REJECTED`

### Referências legadas

- `RETURNED_FOR_ADJUSTMENT` ainda existe como `LegacyMaterialRequestStatus` e é normalizado para `REJECTED`.
- `CANCELLED` ainda existe como `LegacyMaterialRequestStatus`, action de histórico e é normalizado para `APPROVED`.

### Validação de fluxo

| Fluxo esperado | Situação atual | Observação |
| --- | --- | --- |
| Criação nasce `DRAFT` | OK | `createMaterialRequestUseCase`. |
| Envio de `DRAFT`/`RETURNED_TO_DRAFT`/`REJECTED` para gerente | OK | `submitMaterialRequestForApprovalUseCase`. |
| Gerente aprova para CTO | OK | `decideMaterialRequestApprovalUseCase`. |
| Gerente reprova para `REJECTED` | OK | `decideMaterialRequestApprovalUseCase`. |
| CTO aprova para `APPROVED` | OK | `decideMaterialRequestApprovalUseCase`. |
| CTO reprova para `REJECTED` | OK | `decideMaterialRequestApprovalUseCase`. |
| Voltar status somente `PENDING_LAMINATION_MANAGER_APPROVAL` → `RETURNED_TO_DRAFT` | OK no mapeamento | Validar ator autorizado. |
| Não permite voltar se já foi para CTO | OK | Mensagem específica para `PENDING_CTO_APPROVAL`. |

### Recomendação

- Manter status oficiais.
- Revisar `CANCELLED -> APPROVED`.
- Adicionar teste para exclusão por não solicitante/admin após correção.
- Adicionar teste de `returnMaterialRequestStatusUseCase` para papéis reais esperados.

## 14. Inconsistências de SharePoint/internal names

### Pontos corretos

- `MaterialAccessControl`: usa `Title`, `UserEmail`, `Role`, `Center`, `IsActive`. Não foram encontradas referências atuais a `UserName`/`CenterName` nessa lista.
- `MaterialCenters`: usa `Title`, `Center`, `IsActive`. Não foram encontradas referências atuais a `CenterName`.
- `MATERIAL_REQUEST_TECHNICAL_FIELDS` contém todos os internal names informados.
- `Center` é tratado como string e normalizado sem conversão numérica.
- `IsActive` é texto `TRUE/FALSE` tanto em MaterialAccessControl quanto MaterialCenters.
- Anexos usam endpoints nativos `AttachmentFiles/add`, `AttachmentFiles`, `getByFileName`.

### Riscos/inconsistências

1. **Codificação de nome de lista com `encodeURIComponent` dentro de `getbytitle`.** Funciona para nomes simples atuais, mas SharePoint geralmente espera o título literal com escape OData, não necessariamente URL encoded. Se listas tiverem espaços/acentos, validar.
2. **Codificação de `fileName` em `getByFileName`/`add`.** A função escapa aspas e encodeURIComponent. Validar em ambiente com espaços, acentos, `#`, `%`, `+`, `&` e apóstrofo.
3. **Números em MaterialRequests são salvos como texto.** Parece intencional, mas depende dos tipos reais dos campos SharePoint. Se forem Number, SharePoint aceita coerção em alguns casos, mas convém confirmar schema.
4. **`stockRecommendation` é cast direto.** Se SharePoint trouxer valor inesperado, o domínio não normaliza recommendation como normaliza status.
5. **`getStockMaterialsByCenter` monta `$filter` e depois aplica `escapeODataFilterLiterals` no filtro inteiro.** Validar se o helper não codifica demais operadores em cenários especiais; os testes atuais devem cobrir parte disso.

## 15. Oportunidades de otimização

1. **Aplicar filtros OData por acesso.** Para manager, filtrar por centros e status no SharePoint; para CTO, filtrar status; para user, filtrar `RequesterEmail`.
2. **Paginar todos os endpoints com `$top=5000`.** Especialmente `getStockMaterialsByCenter`.
3. **Criar helper OData paginado comum.** Hoje há `getAllPagedItems` duplicado em repositories.
4. **Memoização/agregação única no dashboard.** Calcular distribuição, KPIs e valor por centro em uma única passagem pelo array filtrado.
5. **Separar `MaterialDashboardPage`.** Reduzir custo cognitivo e facilitar testes unitários dos helpers.
6. **Cache curto para `MaterialCenters` e access profile.** Evitar refetch em create/edit repetidos; invalidar manualmente se necessário.
7. **Diff incremental no upload de estoque.** Evitar delete/recreate total e reduzir risco de base parcial.
8. **Unificar validações de anexo.** Criar policy/use case para extensão, tamanho e duplicidade.
9. **Mover exportação para camada independente.** `application` não deve importar `app/utils`.
10. **Remover legado após extração.** Reduzir bundle, ruído e risco.

## 16. Plano de ação recomendado

### Fase 1 — Segurança e fluxo

1. Corrigir permissão de exclusão.
2. Validar ator do retorno para `RETURNED_TO_DRAFT` e ajustar policy/testes.
3. Revisar `CANCELLED -> APPROVED`.
4. Adicionar testes para os três pontos acima.

### Fase 2 — Dados SharePoint e performance

1. Paginar `getStockMaterialsByCenter`.
2. Criar helper comum de paginação OData.
3. Aplicar filtros por perfil no SharePoint para solicitações e dashboard.
4. Avaliar estratégia de upload de estoque menos destrutiva.

### Fase 3 — Arquitetura UI

1. Extrair `CommandBar` e `wizardLayoutStyles` de `ProjectsPage`.
2. Separar componentes do dashboard.
3. Separar hook/form state do formulário.
4. Mover `exportExcel` para camada neutra.

### Fase 4 — Limpeza de legado

1. Confirmar ausência de rotas externas para `ProjectsPage`/`CtoApprovalPage`.
2. Remover ou arquivar componentes não referenciados.
3. Remover APIs/use cases de projeto se não houver requisito.
4. Atualizar documentação.

## 17. Priorização

### Crítico

- Corrigir `deleteMaterialRequestUseCase` para validar solicitante/admin.

### Alto

- Paginar `getStockMaterialsByCenter`.
- Revisar `CANCELLED -> APPROVED`.
- Validar regra/ator de `returnMaterialRequestStatusUseCase`.
- Extrair dependências atuais de `ProjectsPage` usadas por materiais.

### Médio

- Aplicar filtros SharePoint server-side por perfil.
- Separar `MaterialDashboardPage`.
- Padronizar validação de anexos em create/edit.
- Mover exportação para camada neutra.
- Criar helper comum de paginação.
- Revisar upload destrutivo de estoque.

### Baixo

- Remover comentários/resíduos.
- Revisar CSS antigo sem uso.
- Melhorar formatação de use cases compactados.
- Arquivar documentação antiga de projetos.

## 18. Checklist de testes manuais

### Status e fluxo

- [ ] Criar nova solicitação e confirmar status `DRAFT`.
- [ ] Enviar solicitação `DRAFT` para gerente e confirmar `PENDING_LAMINATION_MANAGER_APPROVAL`.
- [ ] Enviar solicitação `RETURNED_TO_DRAFT` para gerente novamente.
- [ ] Reprovar como gerente e confirmar `REJECTED`.
- [ ] Reenviar solicitação `REJECTED` para gerente.
- [ ] Aprovar como gerente e confirmar `PENDING_CTO_APPROVAL`.
- [ ] Aprovar como CTO e confirmar `APPROVED`.
- [ ] Reprovar como CTO e confirmar `REJECTED`.
- [ ] Voltar status de `PENDING_LAMINATION_MANAGER_APPROVAL` para `RETURNED_TO_DRAFT`.
- [ ] Tentar voltar status de `PENDING_CTO_APPROVAL` e confirmar bloqueio.

### RLS

- [ ] ADMIN vê todas as solicitações e todos os centros.
- [ ] CTO não vê `DRAFT`, `RETURNED_TO_DRAFT` nem `PENDING_LAMINATION_MANAGER_APPROVAL`.
- [ ] CTO vê `PENDING_CTO_APPROVAL`, `APPROVED` e `REJECTED` de todos os centros.
- [ ] MANAGER vê apenas centros vinculados.
- [ ] MANAGER não vê `DRAFT` nem `RETURNED_TO_DRAFT`.
- [ ] USER vê apenas próprias solicitações.
- [ ] USER não consegue editar/excluir/enviar solicitação de outro usuário via UI.
- [ ] Após correção futura, validar também bloqueio via ação/use case para exclusão.
- [ ] Visualizar solicitação fora do escopo deve bloquear anexos e detalhes.
- [ ] Dashboard respeita escopo por perfil.

### MaterialCenters e formulário

- [ ] Centro `4300` ativo em `MaterialCenters` aparece no formulário mesmo sem estoque.
- [ ] Centro alfanumérico aparece preservado.
- [ ] Centro inativo não aparece.
- [ ] Selecionar centro sem material mostra somente opção “Não encontrei material”.
- [ ] Material continua vindo de `StockItems` para centros com estoque.
- [ ] Solicitação manual não depende de `StockItems`.

### Campos técnicos

- [ ] Preencher todos os campos técnicos e salvar rascunho.
- [ ] Editar rascunho e confirmar carregamento de todos os campos.
- [ ] Visualizar solicitação e confirmar exibição de todos os campos.
- [ ] Abrir modal de aprovação e confirmar que campos técnicos não aparecem.
- [ ] Confirmar campos como texto, incluindo valores com zeros à esquerda e caracteres alfanuméricos.

### Anexos

- [ ] Criar solicitação com múltiplos anexos PDF/Excel.
- [ ] Criar com nomes contendo espaços e acentos.
- [ ] Criar com arquivo duplicado e validar mensagem.
- [ ] Abrir anexo.
- [ ] Baixar anexo.
- [ ] Editar e adicionar novo anexo.
- [ ] Editar e excluir anexo.
- [ ] Visualizar/Aprovar sem opção de exclusão.
- [ ] Tentar anexos inválidos em criação e edição.
- [ ] Tentar listar anexos sem `requestId` e confirmar estado vazio/seguro.

### Dashboard de estoque

- [ ] Dashboard carrega com base completa, não apenas página da tabela.
- [ ] Confirmar todos os centros com estoque aparecem no gráfico de valor por centro.
- [ ] Confirmar que não há limite “Top 5” para centro no gráfico.
- [ ] Validar cards e tabela com filtros aplicados.
- [ ] Verificar scroll interno sem gerar scroll geral indevido.
- [ ] Filtrar por centro e material.
- [ ] Confirmar dropdown Material com layout correto e busca.
- [ ] Atualizar estoque e confirmar centros/materiais novos após recarregar.
- [ ] Confirmar que memoization/cache não mantém dado antigo após upload.

### Upload estoque

- [ ] Importar planilha válida.
- [ ] Importar planilha com colunas faltantes e conferir erros.
- [ ] Importar planilha com números em formatos BR/US.
- [ ] Simular falha durante criação em ambiente de teste e avaliar estado parcial.
- [ ] Confirmar permissão: apenas ADMIN consegue upload.

### SplashScreen/layout

- [ ] Pressionar F5 e confirmar Splash antes da Home.
- [ ] Confirmar ausência de flicker de CommandBar/tabela.
- [ ] Confirmar Home carregando em segundo plano.
- [ ] Confirmar fade out Splash e fade in Home.
- [ ] Confirmar que appContent não desmonta/remonta.
- [ ] Confirmar que carregamentos não duplicam.
- [ ] Testar assets faltantes e fallback visual.
- [ ] Abrir modais após Splash e verificar layout/scroll.

## 19. Próximos passos recomendados

1. Abrir uma task pequena para corrigir **somente** a validação de permissão em exclusão e adicionar testes.
2. Abrir uma task para paginação de materiais por centro e testes com `@odata.nextLink`.
3. Discutir com o negócio o status legado `CANCELLED` e documentar a conversão correta.
4. Definir oficialmente quem pode executar “voltar status”.
5. Criar épico técnico para separar legado de projetos dos componentes materiais.
6. Criar épico de performance/RLS server-side para SharePoint.
7. Após as correções críticas, executar a checklist manual deste relatório.

---

## Apêndice A — Arquivos e pastas analisados

- `src/App.tsx`
- `src/index.css`
- `src/app/components/**`
- `src/app/pages/MaterialRequestsHomePage/**`
- `src/app/pages/MaterialRequestFormPage/**`
- `src/app/pages/MaterialDashboardPage/**`
- `src/app/pages/CtoApprovalPage/**`
- `src/app/pages/ProjectsPage/**` como legado/acoplamento compartilhado
- `src/application/**`
- `src/domain/**`
- `src/services/sharepoint/**`
- `tests/**` relacionados a material, RLS, SharePoint e projetos
- `docs/**` existentes para contexto de Splash/UX

## Apêndice B — Classificação resumida de remoção

| Item | Classificação | Observação |
| --- | --- | --- |
| `DeleteMaterialRequestModal` | Remoção provável, validar | Não referenciado no fluxo atual. |
| `SubmitMaterialRequestModal` | Remoção provável, validar | Não referenciado no fluxo atual. |
| `StockAnalysisCard` | Remoção provável, validar | Substituído por seção atual. |
| `BootstrapLoader` | Remoção provável, validar | Não usado no App atual. |
| `CtoApprovalPage` | Remoção provável, validar rota externa | Modal atual cobre aprovação gerente/CTO. |
| `decideMaterialRequestUseCase` | Remoção provável, validar | Wrapper CTO antigo. |
| `authorizationApi.ts` | Remoção provável, validar integração externa | RLS atual usa `MaterialAccessControl`. |
| Módulo `ProjectsPage` | Remoção provável, mas não segura agora | Ainda fornece CommandBar/estilos usados por materiais. |
| `RETURNED_FOR_ADJUSTMENT` | Manter temporariamente | Compatibilidade de leitura de dados legados. |
| `CANCELLED` | Manter temporariamente, revisar conversão | Compatibilidade de leitura/histórico. |

## Apêndice C — Verificação de critérios de aceite

- [x] Relatório criado em `docs/Codebase-Audit-Report.md`.
- [x] Arquitetura, domínio, application, UI e SharePoint analisados.
- [x] Código legado provável identificado.
- [x] Funções/componentes possivelmente não usados identificados.
- [x] Pontos de otimização identificados.
- [x] Riscos funcionais identificados.
- [x] Riscos de RLS/permissão identificados.
- [x] Riscos de performance identificados.
- [x] Status e fluxo avaliados.
- [x] Anexos avaliados.
- [x] Campos técnicos avaliados.
- [x] Dashboard avaliado.
- [x] SplashScreen avaliada.
- [x] Plano de ação priorizado incluído.
- [x] Nenhum código funcional alterado.
- [x] Nenhum arquivo removido.
