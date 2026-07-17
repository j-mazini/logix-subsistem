# Plano de Migração para React (SP Profile + sp-portal)

> Documento de planeamento gerado a partir das fases Discover + Define.
> Não implementado ainda — serve de referência para quando a migração for iniciada.

## Objetivo

Migrar as páginas **SP Profile** e **sp-portal/\*** (hoje HTML/CSS/JS estático em `logix-subsistem`)
para uma aplicação React, hospedada no **GitHub Pages**, com:

- Performance (build otimizado, sem overhead de framework desnecessário)
- Front-end **bem definido e padronizado** (design tokens + CSS Modules, sem CSS global colidindo)
- Camada de dados **100% mock** (sem backend, sem base de dados)

## Decisão de arquitetura: Opção B — SPA standalone (Vite + React + TypeScript)

Duas opções foram avaliadas:

| | A. Estender `logix-sphere-frontend-nextjs` (externo) | B. Nova SPA Vite+React standalone |
|---|---|---|
| Compatível com GitHub Pages | Sim, via `output: 'export'`, mas com ressalvas (ver abaixo) | Sim, nativamente — sem SSR |
| Reaproveita trabalho existente | Sim (`sp-portal/components/*.tsx`, `mockData.ts`, `pages-schema/`) | Parcial (lógica/mocks portam fácil; `next/link`/`next/navigation` trocam por `react-router`) |
| Risco de escopo | Alto — mexe num repositório externo que `ARCHITECTURE.md`/`README.md` dizem explicitamente para não tocar sem expansão de escopo | Baixo — isolado, não toca no app externo |

**Decisão: Opção B.**

Motivo decisivo, verificado nos próprios documentos do repositório:

- `ARCHITECTURE.md`: *"There is no application server, API client, package manager, build step, or authentication backend in this directory."* e *"Do not modify the external Logixsphere app from this subsystem unless a task explicitly expands the scope."*
- `README.md`: *"Todas as modificações e criações do subsistema DHL devem ser feitas **apenas** dentro de `DHL-Subsystem`. O repositório `logix-sphere-frontend-nextjs` não é alterado por este subsistema."*

O app Next.js real (`logix-sphere-frontend-nextjs`) é um **repositório externo**, não presente neste diretório de trabalho. `pages-schema/` existe apenas como metadado que esse outro repositório *consome*, não é código Next.js em si.

### Trade-off aceite

- GitHub Pages não tem servidor: uma SPA client-side precisa do truque `404.html` → redirect para `index.html` (ou usar `HashRouter`) para que deep-links sobrevivam a um hard refresh. O Next.js com static export resolve isso nativamente (pré-renderiza cada rota em `rota/index.html`) — é uma vantagem estrutural real do Next nesse ponto específico, que a Opção B não tem de graça.

## Descobertas relevantes do repositório atual

- **100% estático hoje**: sem `package.json`, sem build tool, sem bundler em lugar nenhum da árvore. Bootstrap/fontes/qrcodejs carregam via CDN `<script>`/`<link>`.
- **Conversão parcial já existe** em `sp-portal/components/`: `BeamSidebar.tsx`, `DriverCard.tsx`, `VehicleCard.tsx`, hooks (`useBodyClass.ts`, `useMotionRefinements.ts`) e `mockData.ts` (dados tipados, portados de `dhl-mock-data.js`). Essa conversão é código Next.js (`'use client'`, `next/link`, `next/navigation`) destinado ao repositório externo — **não deve ser copiada tal-e-qual** para a nova SPA sem trocar essas importações por `react-router`.
- **Problema de raiz no CSS ainda não resolvido nem na conversão parcial**: `BeamSidebar.tsx` importa o mesmo CSS global não escopado (`beam-sidebar.css`, `bootstrap.min.css` global) com as mesmas classes sem escopo da versão estática. Isso significa que os bugs de sobreposição corrigidos manualmente hoje na página SP Profile estática (avatar sobrepondo o card "Company info", botão Save escondido atrás do trigger flutuante da sidebar, toast sem estilo próprio perdendo uma guerra de especificidade contra `!important` do Bootstrap) **se repetiriam** se a nova SPA só copiar essa estrutura de CSS. A extração de design tokens + CSS Modules é trabalho novo, não existe ainda em nenhuma das duas opções.
- **Dados são globais de browser + Web Storage**, não JSON-sobre-HTTP: `window.DHL_MOCK_DATA`, `window.DISCO_DATA`, `window.OPMS_EMBEDDED_DATA`, mais ~9 chaves de `localStorage`/`sessionStorage` documentadas (`dhl_sp_profile_cover`, `dhl_contract_route_targets`, etc.) que as páginas leem/escrevem diretamente.
- **`sp-portal/` cresceu além do que `ARCHITECTURE.md` documenta**: o documento lista 7 rotas SP; o diretório real tem mais de 10 (`invoices/`, `route-balance/`, `route-balancer/`, `vetting-admin/`, `week-planner/`, `daily-financial-insights/`, `daily-operations-management/`, `daily-operations-reports/`, `vendor-performance/`, `requests-admin/`). Descoberta de escopo é, em si, uma tarefa a fazer antes de migrar tudo.
- **Estilo é 5 camadas de CSS global aplicadas em ordem fixa** (`base-system-reference.css` → `liquid-glass.css` → `modern-ui.css` → `refinements-v2.css` → `refinements-v3-motion.css`), mais folhas por área (`sp-portal.css`, `profile.css`, etc.). Não existe camada de tokens hoje — essa extração é trabalho novo.
- **Marca real**: os dados mock usam a marca DHL real. Publicar num URL público do GitHub Pages transforma isto de demo local privada em artefacto público indexável — vale uma decisão consciente, não é um bloqueador técnico.

## Requisitos definidos

1. **Roteamento**: React Router com `HashRouter` (ou o truque de redirect via `404.html`) para que deep-links funcionem no GitHub Pages sem servidor.
2. **Camada de dados 100% mock**: portar `window.DHL_MOCK_DATA` / `AvisosStorage` / chaves de `localStorage` existentes para módulos ES/hooks tipados. Zero `fetch`/`XHR` para endpoints não-estáticos.
3. **Sistema de design tokens + CSS Modules por componente**: eliminar o CSS global não escopado atual e os conflitos de `!important` com utilitários do Bootstrap já identificados e corrigidos manualmente na página SP Profile.
4. **`vite.config.ts`** com `base` correto para o GitHub Pages do repositório (`logix-subsistem`), build/deploy via GitHub Actions (`actions/deploy-pages`).
5. **Performance**: code-splitting por rota; meta de Lighthouse Performance ≥ 90 (mobile), LCP < 2.5s, CLS < 0.1 (medir como mediana de 3 execuções, não uma amostra única).

## Escopo

- **Dentro do escopo**: SP Profile + todas as páginas `sp-portal/*`.
- **Fora do escopo**: lado DHL Admin (`dhl/dashboard`, `service-providers/`, `dhl/vendor-admin-view`, etc.) e o repositório `logix-sphere-frontend-nextjs` externo.
- **Risco a comunicar**: sp-portal e o lado DHL Admin partilham as mesmas camadas base de CSS — uma extração de tokens feita só para sp-portal pode ter efeitos visuais colaterais nas páginas admin não tocadas. Isto precisa de validação visual cruzada, não só nas páginas migradas.

## Critérios de sucesso (mensuráveis)

1. **Performance**: Lighthouse Performance ≥ 90 (mobile) em `/sp-portal/profile` e `/sp-portal/dashboard`, LCP < 2.5s, CLS < 0.1.
2. **Adoção de design tokens**: 100% dos componentes migrados usam CSS Modules contra um único ficheiro de tokens partilhado (cor/espaçamento/tipografia); zero valores hex/px hardcoded fora dele — verificável por grep em `*.module.css`.
3. **Paridade de rotas/funcionalidade**: cada rota canónica de SP Profile e `sp-portal/*` renderiza em React com comportamento equivalente ao HTML estático atual (checklist por ecrã).
4. **Correção de deployment**: build de produção faz deploy via GitHub Actions para o GitHub Pages; toda rota carrega em hard-refresh/deep-link direto (sem 404); assets resolvem sob o base path do repositório.
5. **Sem dependência de backend**: zero chamadas `fetch`/`XHR` para endpoints não-estáticos em todas as páginas migradas — verificável via painel de rede do browser.

## Pontos em aberto (não decididos — precisam de confirmação antes de iniciar)

1. **Esta migração é um artefacto standalone permanente, ou um passo intermédio** que eventualmente será incorporado no `logix-sphere-frontend-nextjs` real? Isto muda se o isolamento da Opção B é uma vantagem ou um retrabalho futuro.
2. **GitHub Pages será project page** (subpath `/logix-subsistem/`) **ou domínio próprio**? Muda o peso do tratamento de base path.
3. Confirmar se o branding DHL real deve continuar a aparecer publicamente numa URL indexável do GitHub Pages, ou se os dados mock precisam de ser genéricos antes da publicação.

## Próximos passos sugeridos (quando a implementação começar)

1. Scaffold do projeto: Vite + React + TypeScript.
2. Extrair tokens de design a partir do CSS atual (cores, espaçamentos, raios — incluindo as variáveis CSS já introduzidas em `sp-portal/profile/profile.css` como ponto de partida: `--sp-cover-h`, `--sp-avatar-d`, `--sp-avatar-peek`).
3. Migração incremental começando pela página **SP Profile** (já com os bugs de sobreposição corrigidos na versão estática — serve de referência visual correta para a paridade).
4. Configurar `vite.config.ts` (`base`) + workflow do GitHub Actions para deploy.
5. Medir Lighthouse na versão publicada (não só em `vite preview` local, já que bugs de base path só aparecem no Pages real).
