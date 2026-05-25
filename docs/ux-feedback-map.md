# Mapeamento de feedbacks de UX — Projects Page

## Princípios aplicados
- Feedback apenas para ações com impacto real no dado, bloqueio por regra ou erro.
- Sem toast para navegação, seleção simples ou interações óbvias sem consequência relevante.
- Mensagens curtas, claras e orientadas a ação.

## Ações mapeadas e padrão definido
| Ação | Feedback? | Tipo | Forma | Mensagem padrão |
|---|---|---|---|---|
| Carregar lista inicial | Sim (somente em erro/loading) | loading/erro | `StateMessage` | `Carregando lista...` / `Erro ao carregar Projects.` |
| Carregar mais resultados | Sim (somente em erro/loading) | loading/erro | botão + `StateMessage` | `Carregando...` / `Erro ao carregar mais Projects.` |
| Selecionar item da lista | Não | — | — | Sem mensagem (interação trivial) |
| Carregar resumo do projeto selecionado | Sim (estado de tela) | loading/erro/vazio | `StateMessage` | `Carregando detalhes...` / `Erro ao carregar detalhes.` |
| Criar projeto | Sim | sucesso/erro | toast | `Projeto criado com sucesso.` / `Não foi possível criar o projeto. Tente novamente.` |
| Editar projeto | Sim | sucesso/erro | toast | `Alterações salvas.` / `Não foi possível salvar as alterações. Tente novamente.` |
| Tentar editar projeto fora de rascunho | Sim | erro de negócio | toast | `Não é possível editar. O projeto não está em rascunho.` |
| Excluir projeto (confirmação) | Sim | ação crítica + loading | `ConfirmDialog` + toast | `Excluindo...` + resultado |
| Excluir projeto (sucesso) | Sim | sucesso | toast | `Projeto e estrutura relacionada excluídos com sucesso.` |
| Excluir projeto bloqueado por regra | Sim | erro de negócio | toast | `Somente projetos em rascunho podem ser excluídos.` |
| Enviar para aprovação (confirmação) | Sim | ação importante + loading | `ConfirmDialog` + toast | `Enviando...` + resultado |
| Enviar para aprovação (sucesso) | Sim | sucesso | toast | `Projeto enviado para aprovação.` |
| Voltar status para rascunho (confirmação) | Sim | ação importante + loading | `ConfirmDialog` + toast | `Atualizando...` + resultado |
| Voltar status (sucesso) | Sim | sucesso | toast | `Projeto retornou para rascunho.` |
| Salvar rascunho no wizard | Sim | loading/sucesso/erro | botão + toast | `Salvando...` / `Projeto salvo como rascunho com sucesso.` / `Não foi possível salvar o rascunho. Tente novamente.` |
| Cancelar confirmação de ação crítica | Não | — | — | Sem toast (não gera efeito em dado) |
| Navegar entre etapas do wizard | Sim (apenas se bloqueado) | erro de validação | toast | `Corrija as pendências antes de avançar.` |
| Exportar CSV sem dados | Sim | info contextual | toast | `Nenhum projeto carregado para exportar.` |
| Exportar CSV com dados | Sim | sucesso | toast | `Lista de projetos exportada em CSV.` |

## Pontos onde não deve haver mensagem
- Abrir/fechar modal e filtros.
- Troca de aba no wizard quando permitida.
- Seleção de projeto na tabela.
- Clique em botões de navegação sem efeito de persistência.

Justificativa: são interações autoexplicativas e sem consequência crítica em dados; mostrar toast nesses casos gera ruído visual.
