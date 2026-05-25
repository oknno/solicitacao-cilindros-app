# Guia curto de UI

## Tokens visuais
Use os tokens centralizados em `src/app/components/ui/tokens.ts`:
- **cores** (`colors`): superfícies, bordas, textos e tons de estado.
- **espaçamentos** (`spacing`): xs/sm/md/lg/xl.
- **radius** (`radius`): sm/md/lg/pill.
- **tipografia** (`typography`): tamanhos e pesos padrão.

## Componentes base
Antes de criar novo estilo, priorize:
- `Button` para ações primária/secundária.
- `Card` para agrupamento visual.
- `Badge` para status e rótulos curtos.
- `Field` para rótulo + valor/controle.
- `Section` para título/subtítulo de blocos.
- `StateMessage` para estados de loading/error/empty/success.

## Padrões de estado
Sempre renderize mensagens de estado com `StateMessage`:
- loading: operação em andamento.
- error: falha de carregamento/ação.
- empty: ausência de dados.
- success: confirmação contextual.

## Regras rápidas
1. Não use hex/rgba/px hardcoded em tela de produto; reutilize `uiTokens` e variantes de `Button`, `Card`, `Field` e `StateMessage`.
2. Evite `className="btn"` em novas telas; prefira `Button`.
3. Se precisar variar layout, componha com `Card` + `Section` + `Field`.

## Exceções explícitas
Permitido manter valor fixo **somente** quando:
- O valor representa comportamento responsivo/estrutural (`minmax(...)`, `clamp(...)`, `%`, `vh/vw`) e não existe token equivalente.
- A declaração é um token centralizado em `src/app/components/ui/tokens.ts`.
- A declaração é variável CSS de token (`--ui-color-*`) em `src/index.css`.

## Mapeamento atual de hardcodes (abril/2026)
- `src/app/pages/ProjectsPage/**`: migrado para `uiTokens` em cores/bordas principais e controles de formulário.
- `src/app/components/ui/**`: botões/cards/fields padronizados sem hex inline (exceto arquivo de tokens).
- `src/index.css`: cores migradas para variáveis CSS derivadas de tokens.

Validação automática:
- ESLint bloqueia hex/rgba hardcoded em `ProjectsPage` e componentes UI (exceto `tokens.ts`).
- `npm run lint:ui-hardcodes` valida hardcodes de cor fora do token set nos mesmos escopos + `src/index.css`.
