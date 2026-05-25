# Solicitação de Material Cilindros

Aplicação React + TypeScript para Solicitação de Material Cilindros com integração ao SharePoint.

## Visão de camadas

A arquitetura está separada em camadas para organizar interface, regras de negócio e integração externa:

- `src/app`  
  Camada de UI (páginas, componentes, hooks de tela e fluxo do wizard).
- `src/application`  
  Casos de uso da aplicação (orquestração de ações como criar, editar, enviar para aprovação, excluir).
- `src/domain`  
  Regras e validações de domínio (cálculos, validações de projeto e regras de aprovação).
- `src/services/sharepoint`  
  Infraestrutura de persistência e integração com SharePoint (APIs, HTTP, schema cache e workflow).

## Fluxo principal de inicialização (App + bootstrap)

1. `src/main.tsx` monta a aplicação React e renderiza `<App />`.
2. `App` inicia em estado de bootstrap (`loading`) e dispara carregamento inicial da lista de projetos.
3. Durante o bootstrap, a tela exibe `BootstrapLoader` com mensagens rotativas.
4. Em sucesso, `App` renderiza `ProjectsPage` com os dados iniciais já carregados (`initialItems`, `initialNextLink`, `skipInitialLoad`).
5. Em falha, `App` mantém a experiência de inicialização e exibe mensagem de erro amigável.

## Comandos de desenvolvimento e validação

### Desenvolvimento

```bash
npm install
npm run dev
```

### Build e preview

```bash
npm run build
npm run preview
```

### Qualidade e validação

```bash
npm run lint          # lint geral
npm run lint:strict   # lint estrito para integração SharePoint
npm run typecheck     # checagem de tipos TypeScript
npm run check         # lint:strict + typecheck
npm run test          # testes de regras de aprovação
```

## Mapa rápido de funcionalidades

- **Lista de projetos**
  - Carregamento paginado, filtros, ordenação, seleção e exportação CSV.
  - Entrada principal: `ProjectsPage` + hook `useProjectsList`.

- **Wizard de projeto**
  - Fluxo de criação/edição/visualização/duplicação em etapas (`Projeto`, `Execução`, `Revisão`).
  - Carrega e compõe estrutura relacionada (marcos, atividades e PEPs).

- **Workflow**
  - Ações de ciclo de vida: enviar para aprovação, voltar para rascunho, validações de status e restrições.
  - Regras concentradas em casos de uso (`src/application/use-cases`) e serviço de workflow (`src/services/sharepoint/projectsWorkflow.ts`).

- **Persistência (SharePoint)**
  - Operações CRUD e consultas paginadas para projetos e entidades relacionadas.
  - Implementação em `src/services/sharepoint` (`projectsApi`, `milestonesApi`, `activitiesApi`, `pepsApi`, `spHttp`, etc.).
