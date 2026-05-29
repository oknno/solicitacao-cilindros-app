# SplashScreen — pacote de referência para replicação

Este documento registra o padrão técnico da SplashScreen aprovada no sistema **Solicitação de Material — Cilindros e Discos** para que a mesma inicialização possa ser replicada em outros sistemas **React + TypeScript + Vite** sem alterar o comportamento funcional do sistema de destino.

> Escopo desta referência: documentação e padronização. A SplashScreen atual, os fluxos funcionais, dashboard, solicitações, estoque, SharePoint, repositories, use cases e assets existentes não devem ser alterados para aplicar este guia.

---

## 1. Objetivo da SplashScreen

A SplashScreen tem quatro objetivos principais:

1. **Padronizar a entrada visual** dos sistemas CAPEX com identidade minimalista em branco, preto e cinza.
2. **Bloquear flicker inicial**: nenhum conteúdo da Home, CommandBar, tabela ou painel funcional deve aparecer antes da Splash ao pressionar F5.
3. **Permitir carregamento em segundo plano**: a Home deve montar desde o início, atrás da Splash, para que dados e componentes possam carregar durante a exibição da tela inicial.
4. **Suavizar a transição final**: a Splash deve sair com fade out e o conteúdo do sistema deve entrar com fade in, sem desmontar/remontar a Home.

O padrão não usa biblioteca externa de animação. Toda a animação é feita com `useState`, `useEffect`, `setTimeout`, classes CSS, `opacity`, `visibility`, `transform`, `transition` e `@keyframes`.

---

## 2. Arquivos necessários para replicação

Copie ou adapte os arquivos abaixo em outro sistema React + TypeScript + Vite.

### 2.1 Componente da SplashScreen

- `src/app/components/SplashScreen/SplashScreen.tsx`

Responsabilidades principais:

- importar o logo e a imagem corporativa;
- renderizar marca, título, subtítulo, imagem, curvas, barra de carregamento e assinatura;
- controlar o tempo total da Splash;
- iniciar o fade out;
- chamar `onExitStart` para liberar o fade in do app;
- chamar `onFinish` somente depois do fade out, para remover a Splash sem corte seco;
- manter fallback visual se logo ou imagem falharem.

### 2.2 Estilos da SplashScreen

- `src/app/components/SplashScreen/SplashScreen.css`

Responsabilidades principais:

- overlay `fixed` em tela cheia;
- `z-index` alto para cobrir qualquer conteúdo inicial;
- fundo branco opaco;
- layout minimalista com texto à esquerda e imagem à direita;
- curvas suaves e linhas decorativas;
- barra de progresso discreta;
- animação de entrada da Splash;
- animação de saída da Splash;
- suporte a telas menores;
- suporte a `prefers-reduced-motion`.

### 2.3 Integração no App

- `src/App.tsx`

Responsabilidades principais:

- iniciar `showSplash` como `true`;
- manter o conteúdo do app montado desde o primeiro render;
- deixar o conteúdo invisível enquanto a Splash está ativa;
- renderizar a Splash por cima do app;
- tornar o app visível quando a Splash inicia o fade out;
- remover a Splash somente quando a animação de saída termina;
- evitar desmontagem/remontagem da Home.

### 2.4 CSS global de suporte ao fade in da Home

- `src/index.css`

Classes essenciais:

- `.capex-appContent`
- `.capex-appContent--hiddenDuringSplash`

Responsabilidades principais:

- manter o conteúdo montado;
- esconder visualmente a Home durante a Splash com `opacity: 0` e `visibility: hidden`;
- bloquear interação enquanto invisível com `pointer-events: none`;
- aplicar `transition` de `opacity` e `transform` para o fade in suave;
- respeitar `prefers-reduced-motion`.

### 2.5 Assets usados

No sistema atual, os assets ficam em:

- `src/assets/branding/arcelormittal-logo.svg`
- `src/assets/splash/splash-building.webp`

> Observação: os exemplos antigos podem mencionar `src/app/assets/...`, mas o caminho real deste projeto é `src/assets/...`. Ao replicar, escolha um padrão único no sistema de destino e ajuste os imports conforme a localização real do componente.

---

## 3. Onde salvar os assets

Use a estrutura abaixo no sistema de destino:

```text
src/assets/branding/arcelormittal-logo.svg
src/assets/splash/splash-building.webp
```

Regras recomendadas:

- prefira **SVG** para logo;
- prefira **WEBP** para imagem corporativa;
- não use imagem pesada;
- não use URL externa;
- não use base64;
- mantenha os assets versionados manualmente no repositório;
- valide o build depois de adicionar os arquivos, pois imports de assets inexistentes quebram o Vite/TypeScript.

Se houver risco de PR com binários gerados pelo Codex, adicione os assets manualmente pelo desenvolvedor responsável e peça ao Codex apenas para referenciar os caminhos esperados.

---

## 4. Como importar logo e imagem

No componente `SplashScreen.tsx`, os imports atuais são relativos à pasta `src/app/components/SplashScreen`:

```tsx
import arcelorMittalLogo from "../../../assets/branding/arcelormittal-logo.svg";
import splashBuilding from "../../../assets/splash/splash-building.webp";
import "./SplashScreen.css";
```

Ao copiar para outro sistema:

1. mantenha a mesma pasta do componente, se possível;
2. mantenha a mesma pasta de assets, se possível;
3. se a estrutura mudar, ajuste apenas os caminhos relativos dos imports;
4. não envolva imports em `try/catch`;
5. não use URL externa como substituição do asset versionado.

---

## 5. Integração modelo no `App.tsx`

A lógica conceitual usada no sistema atual é:

- `showSplash` inicia `true`;
- `isAppVisible` inicia `false`;
- o conteúdo do app fica montado desde o primeiro render;
- o conteúdo do app fica invisível durante a Splash;
- a Splash é renderizada por cima do conteúdo;
- `onExitStart` ativa o fade in do app;
- `onFinish` remove a Splash depois do fade out;
- a Home não desmonta/remonta.

Trecho modelo baseado no código real:

```tsx
import { useCallback, useState } from "react";
import "./index.css";
import { ToastProvider } from "./app/components/notifications/ToastProvider";
import { MaterialDashboardPage } from "./app/pages/MaterialDashboardPage";
import { MaterialRequestsHomePage } from "./app/pages/MaterialRequestsHomePage";
import { SplashScreen } from "./app/components/SplashScreen/SplashScreen";

type CurrentView = "requests" | "dashboard";

export default function App() {
  const [currentView, setCurrentView] = useState<CurrentView>("requests");
  const [showSplash, setShowSplash] = useState(true);
  const [isAppVisible, setIsAppVisible] = useState(false);

  const handleSplashExitStart = useCallback(() => {
    setIsAppVisible(true);
  }, []);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <ToastProvider>
      <div className={`capex-appContent${isAppVisible ? "" : " capex-appContent--hiddenDuringSplash"}`}>
        <div className="capex-app">
          <main className="capex-container" style={{ minHeight: 0 }}>
            <div style={{ minHeight: 0, overflow: "hidden" }}>
              {currentView === "requests" ? (
                <MaterialRequestsHomePage onOpenDashboard={() => setCurrentView("dashboard")} />
              ) : (
                <MaterialDashboardPage onBackToRequests={() => setCurrentView("requests")} />
              )}
            </div>
          </main>
        </div>
      </div>

      {showSplash ? <SplashScreen onExitStart={handleSplashExitStart} onFinish={handleSplashFinish} /> : null}
    </ToastProvider>
  );
}
```

Em outros sistemas, substitua `MaterialRequestsHomePage`, `MaterialDashboardPage`, callbacks e providers pelos componentes reais do sistema de destino, mantendo a estrutura anti-flicker.

---

## 6. Como evitar flicker inicial

Para que a Splash seja a primeira coisa visível ao pressionar F5:

1. `showSplash` deve iniciar como `true`.
2. O conteúdo principal deve estar dentro de `.capex-appContent`.
3. Enquanto `isAppVisible` for `false`, aplique `.capex-appContent--hiddenDuringSplash`.
4. A Splash deve usar `position: fixed`, `inset: 0`, fundo opaco e `z-index` alto.
5. Não renderize primeiro a Home para depois mostrar a Splash.
6. Não use `return showSplash ? <SplashScreen /> : <Home />`, pois isso impede a montagem da Home em segundo plano.

Classes essenciais:

```css
.capex-appContent {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  transition:
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 0s;
}

.capex-appContent--hiddenDuringSplash {
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  visibility: hidden;
  transition:
    opacity 420ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
    visibility 0s linear 420ms;
}
```

---

## 7. Como carregar a Home em segundo plano

O conteúdo funcional deve ficar **sempre montado** atrás da Splash:

```tsx
<div className={`capex-appContent${isAppVisible ? "" : " capex-appContent--hiddenDuringSplash"}`}>
  <HomePage />
</div>

{showSplash ? <SplashScreen onExitStart={handleSplashExitStart} onFinish={handleSplashFinish} /> : null}
```

Esse padrão permite que:

- componentes da Home montem durante a Splash;
- hooks da Home iniciem carregamentos durante a Splash;
- dados possam chegar enquanto a tela inicial ainda está visível;
- a Home esteja pronta para aparecer no fim da transição;
- não exista carregamento duplicado por desmontagem/remontagem.

Evite este padrão:

```tsx
return showSplash ? <SplashScreen /> : <HomePage />;
```

Esse retorno condicional faz a Home montar apenas depois da Splash, atrasando carregamentos e aumentando o risco de transição seca.

---

## 8. Como suavizar a transição final

A transição final depende da coordenação entre `SplashScreen.tsx`, `SplashScreen.css` e `index.css`.

### 8.1 Tempos no componente

No componente atual:

```tsx
const splashDurationInMs = 3000;
const splashExitDurationInMs = 560;
```

Fluxo:

1. a Splash permanece ativa durante `splashDurationInMs`;
2. ao final desse tempo, `isExiting` vira `true`;
3. `onExitStart()` é chamado para iniciar o fade in do app;
4. a classe `capex-splash--exit` ativa o fade out da Splash;
5. somente após `splashDurationInMs + splashExitDurationInMs`, `onFinish()` remove a Splash do DOM.

### 8.2 Animação da Splash

Classes/keyframes essenciais:

- `.capex-splash`
- `.capex-splash--exit`
- `@keyframes capexSplashEnter`
- `@keyframes capexSplashExit`
- `@keyframes capexSplashProgress`

A classe `.capex-splash--exit` deve aplicar `pointer-events: none` e animação de saída, mas a remoção do DOM deve acontecer somente depois da animação.

### 8.3 Fade in do app

O app deve sair de `.capex-appContent--hiddenDuringSplash` quando `onExitStart` for chamado. Isso faz a Home aparecer gradualmente enquanto a Splash está desaparecendo.

---

## 9. Comportamento esperado

### 9.1 Ao apertar F5

- A SplashScreen deve ser a primeira coisa visível.
- CommandBar, tabela, cards, filtros e demais elementos da Home não podem piscar antes da Splash.
- A Splash deve cobrir a tela com background opaco e `z-index` alto.

### 9.2 Durante a Splash

- A Home deve montar em segundo plano.
- Dados podem carregar durante a Splash.
- A Home fica visualmente invisível.
- Usuário não interage com a Home porque `pointer-events` fica bloqueado enquanto invisível.

### 9.3 Ao finalizar

- A Splash faz fade out.
- A Home faz fade in suave.
- A Home não desmonta/remonta.
- Carregamentos da Home não duplicam por causa da Splash.
- A Splash só é removida do DOM depois da animação de saída.

### 9.4 Depois da inicialização

- A Splash não aparece ao navegar internamente.
- A Splash não aparece ao abrir modal.
- A Splash não aparece ao aplicar filtro.
- A Splash não aparece ao atualizar dados.
- A Splash aparece novamente apenas em um novo carregamento completo da aplicação, como F5 ou nova abertura da página.

---

## 10. Classes CSS essenciais

### 10.1 Overlay e saída da Splash

- `.capex-splash`
- `.capex-splash--exit`
- `.capex-splash--imageFallback`

Pontos que não devem ser removidos:

- `position: fixed`;
- `inset: 0`;
- `z-index: 2147483647` ou outro valor muito alto;
- `width: 100vw`;
- `height: 100vh`;
- `background: #ffffff`;
- animação de saída antes da remoção.

### 10.2 Estrutura visual

- `.capex-splash__content`
- `.capex-splash__brand`
- `.capex-splash__logo`
- `.capex-splash__brandFallback`
- `.capex-splash__titleBlock`
- `.capex-splash__eyebrow`
- `.capex-splash__progress`
- `.capex-splash__visual`
- `.capex-splash__visualFrame`
- `.capex-splash__image`
- `.capex-splash__curve`
- `.capex-splash__line`
- `.capex-splash__credits`

### 10.3 AppContent por trás da Splash

- `.capex-appContent`
- `.capex-appContent--hiddenDuringSplash`

Essas classes são indispensáveis para evitar flicker e permitir fade in da Home.

---

## 11. O que pode ser customizado por sistema

Pode customizar:

- título principal;
- subtítulo;
- label `Sistema corporativo`;
- assinatura `Desenvolvido por Gerência de CAPEX`, se o sistema exigir outra área responsável;
- imagem corporativa do lado direito;
- logo, se necessário;
- duração da Splash (`splashDurationInMs`);
- duração do fade out (`splashExitDurationInMs`);
- pequenos ajustes de espaçamento responsivo, desde que mantenham o padrão minimalista.

Ao customizar textos, altere preferencialmente apenas o conteúdo renderizado em `SplashScreen.tsx`:

```tsx
<p className="capex-splash__eyebrow">Sistema corporativo</p>
<h1>Solicitação de Material</h1>
<p>Cilindros e Discos</p>
<p className="capex-splash__credits">Desenvolvido por Gerência de CAPEX</p>
```

---

## 12. O que não deve ser alterado

Não altere:

- lógica anti-flicker;
- `showSplash` iniciando como `true`;
- conteúdo do app montado em segundo plano;
- overlay com `z-index` alto;
- background opaco da Splash;
- fade out antes de remover a Splash;
- fade in do app via `.capex-appContent`;
- a ordem `onExitStart` antes de `onFinish`;
- o princípio de não desmontar/remontar a Home;
- a ausência de biblioteca externa de animação;
- o carregamento funcional do sistema de destino;
- repositories, use cases, integrações, filtros, dashboard ou regras de negócio do sistema de destino.

---

## 13. Checklist de implantação em outro sistema

- [ ] Copiar a pasta `src/app/components/SplashScreen/`.
- [ ] Copiar `SplashScreen.tsx`.
- [ ] Copiar `SplashScreen.css`.
- [ ] Copiar/adicionar os assets de branding e splash.
- [ ] Confirmar `src/assets/branding/arcelormittal-logo.svg`.
- [ ] Confirmar `src/assets/splash/splash-building.webp`.
- [ ] Ajustar imports dos assets conforme a estrutura do sistema de destino.
- [ ] Ajustar título principal.
- [ ] Ajustar subtítulo.
- [ ] Ajustar label `Sistema corporativo`, se necessário.
- [ ] Ajustar assinatura, se necessário.
- [ ] Integrar a Splash no `App.tsx`.
- [ ] Garantir `showSplash` iniciando como `true`.
- [ ] Garantir `appContent` montado desde o início.
- [ ] Garantir `appContent` invisível durante a Splash.
- [ ] Garantir Home carregando em segundo plano.
- [ ] Garantir `onExitStart` para liberar fade in do app.
- [ ] Garantir `onFinish` para remover a Splash após o fade out.
- [ ] Testar F5.
- [ ] Confirmar que CommandBar/tabela não piscam antes da Splash.
- [ ] Testar fade out da Splash.
- [ ] Testar fade in da Home.
- [ ] Testar navegação interna.
- [ ] Testar abertura de modal, filtro e atualização de dados.
- [ ] Confirmar que a Splash não reaparece nessas ações internas.
- [ ] Rodar build/typecheck.

---

## 14. Problemas comuns e soluções

### 14.1 CommandBar aparece antes da Splash

Causa provável:

- Home visível antes da Splash;
- `showSplash` não inicia como `true`;
- appContent não está escondido;
- overlay da Splash não cobre a tela inteira ou tem `z-index` baixo.

Solução:

- iniciar `showSplash` como `true`;
- iniciar `isAppVisible` como `false`;
- aplicar `.capex-appContent--hiddenDuringSplash` enquanto a Splash estiver ativa;
- garantir `opacity: 0`, `visibility: hidden` e `pointer-events: none` no appContent oculto;
- garantir `.capex-splash` com `position: fixed`, `inset: 0`, background opaco e `z-index` alto.

### 14.2 Home só carrega depois da Splash

Causa provável:

- uso de retorno condicional que renderiza apenas a Splash enquanto `showSplash` é `true`.

Solução:

- manter o conteúdo do sistema montado por trás da Splash;
- usar a Splash como overlay, não como substituta da Home.

### 14.3 Transição final com corte seco

Causa provável:

- Splash removida imediatamente quando o tempo termina;
- uso de `visibility` sem `opacity transition`;
- falta de coordenação entre fade out da Splash e fade in do app.

Solução:

- usar `isExiting` para aplicar `.capex-splash--exit`;
- chamar `onExitStart` no início da saída;
- chamar `onFinish` apenas depois de `splashExitDurationInMs`;
- manter `transition` em `.capex-appContent`.

### 14.4 Logo ou imagem não carregam

Causa provável:

- caminho de import errado;
- asset salvo em pasta diferente;
- nome de arquivo diferente;
- arquivo não versionado no repositório.

Solução:

- revisar o caminho relativo a partir de `SplashScreen.tsx`;
- confirmar se os arquivos existem em `src/assets/branding/` e `src/assets/splash/`;
- manter nomes e extensões exatamente iguais ou ajustar os imports.

### 14.5 Build quebra por asset ausente

Causa provável:

- import obrigatório apontando para arquivo inexistente.

Solução:

- adicionar o asset antes de rodar build;
- ajustar o caminho do import;
- documentar o asset esperado quando ele precisar ser adicionado manualmente pelo desenvolvedor.

### 14.6 Splash reaparece ao navegar internamente

Causa provável:

- estado da Splash foi colocado em componente que desmonta/remonta durante navegação interna;
- navegação interna recria o `App` ou o provider raiz.

Solução:

- manter `showSplash` no topo da aplicação;
- não condicionar Splash a filtros, modais, abas ou mudanças de tela internas;
- exibir Splash apenas no carregamento inicial do app.

---

## 15. Prompt-base para replicar em outros sistemas

Use o prompt abaixo em outros sistemas quando quiser aplicar este padrão com Codex:

```text
TASK — Replicar SplashScreen padrão CAPEX

Contexto:
Quero aplicar neste sistema React + TypeScript + Vite o mesmo padrão de SplashScreen aprovado no sistema Solicitação de Material — Cilindros e Discos.

Objetivo:
Copiar o padrão visual, estrutural e comportamental da SplashScreen de referência, adaptando apenas textos e imagem quando necessário.

Requisitos obrigatórios:
- criar/copiar o componente SplashScreen e seu CSS;
- usar visual minimalista em branco/preto/cinza;
- manter logo no canto superior esquerdo;
- manter título no canto inferior esquerdo;
- manter subtítulo abaixo;
- manter imagem corporativa no lado direito;
- manter formas curvas suaves;
- manter barra de carregamento discreta;
- manter assinatura da área responsável, ajustando o texto apenas se necessário;
- manter Splash como overlay com z-index alto e fundo opaco;
- showSplash deve iniciar true;
- appContent/Home deve ficar montado desde o primeiro render;
- appContent/Home deve ficar invisível durante a Splash;
- Home deve carregar dados em segundo plano;
- onExitStart deve liberar fade in do app;
- onFinish deve remover a Splash somente após o fade out;
- Home não pode desmontar/remontar por causa da Splash;
- não adicionar biblioteca externa de animação;
- não alterar regras funcionais do sistema de destino;
- não alterar repositories, use cases, integrações, filtros, modais, dashboard ou regras de negócio.

Customizações permitidas:
- título principal;
- subtítulo;
- label “Sistema corporativo”;
- assinatura;
- logo, se necessário;
- imagem corporativa;
- duração da Splash;
- duração do fade out/fade in.

Validações:
- ao apertar F5, a Splash deve ser a primeira coisa visível;
- CommandBar/tabela não podem piscar antes;
- Home deve montar em segundo plano;
- Splash deve fazer fade out;
- Home deve fazer fade in suave;
- Splash não deve aparecer ao navegar internamente, abrir modal, aplicar filtro ou atualizar dados;
- rodar build/typecheck ao final.
```

---

## 16. Resumo executivo para replicação

Arquivos mínimos:

```text
src/app/components/SplashScreen/SplashScreen.tsx
src/app/components/SplashScreen/SplashScreen.css
src/App.tsx
src/index.css
src/assets/branding/arcelormittal-logo.svg
src/assets/splash/splash-building.webp
```

Princípio mais importante:

> A Splash não substitui a Home. A Splash cobre a Home. A Home monta desde o início, fica invisível durante a Splash e aparece suavemente quando a Splash inicia a saída.
