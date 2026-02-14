# DHL Subsystem

Subsistema de páginas (page scheme) para o projeto **logix-sphere-frontend-nextjs**.

Todas as definições, esquemas e recursos do subsistema DHL ficam **apenas** nesta pasta. O frontend Next.js consome este esquema quando for integrar as rotas DHL.

## Estrutura

```
DHL-Subsystem/
├── README.md                 # Este ficheiro
├── sp-portal/                # Portal do Service Provider (hierarquia abaixo do admin)
│   ├── dashboard.html        # Dashboard do SP (só as suas métricas; sem Create Alert)
│   ├── profile.html          # Editar perfil da empresa
│   ├── drivers.html          # Listar e criar drivers
│   ├── vehicles.html         # Listar e criar veículos
│   ├── contracts.html        # Contratos (apenas os do SP, read-only)
│   └── sop-feed.html         # SOP Feed (apenas leitura; sem criar posts)
└── pages-schema/             # Esquema de rotas e páginas
    ├── index.ts              # Exportações do esquema
    ├── types.ts              # Tipos partilhados
    ├── manifest.ts           # Manifesto de rotas do subsistema
    └── routes/               # Definições por rota (uma pasta por página)
        └── dhl/
            ├── dashboard/
            │   └── page.schema.json
            └── shipments/
                └── page.schema.json
```

### Hierarquia e permissões

- **Vista administrativa (DHL)** – Dashboard, Service Providers, Vendors, Vehicles, Contract Management, SOP Feed. Pode criar avisos, posts e ver métricas de todos os SPs.
- **Portal Service Provider** (`sp-portal/`) – Vista direcionada aos Service Providers, uma abaixo na hierarquia:
  - **Pode:** ver apenas as suas métricas, editar o perfil da empresa, criar drivers, criar veículos, ver os seus contratos (read-only), ver o SOP Feed (read-only).
  - **Não pode:** criar avisos, criar posts no SOP, nem ver métricas de outros Service Providers.

**Seleção de área:** a página **access-select.html** permite escolher qual pasta aceder:
- **DHL Administration** → dashboard e vistas administrativas (avisos, posts, métricas globais).
- **BA Express Portal** → leva à mesma **tela de login** (`sp-portal/login.html`), com partículas, animação do card e overlay “Welcome, BA Express”; após login redireciona para o portal BA (`sp-portal/dashboard.html?sp=BA Express`). Entra apenas uma empresa (BA Express).

Em todas as sidebars (DHL e portal) existe o item **Select access**, que abre de novo `access-select.html` para trocar entre as duas áreas.

## Uso

- **pages-schema/manifest.ts** – Lista todas as rotas e metadados das páginas do subsistema DHL.
- **pages-schema/routes/** – Uma pasta por rota com definição da página (ex.: `page.schema.json` ou ficheiros de configuração).

O frontend pode importar o manifesto a partir desta pasta (por exemplo via path alias ou cópia em build) para gerar ou registrar as páginas DHL.

## Mock de dados (3 meses)

O ficheiro **dhl-mock-data.js** expõe `window.DHL_MOCK_DATA` com:

- **vendors** – lista de vendors ativos (start dates, treinos, DVLA, etc. entre Nov 2025 e Jan 2026)
- **vehicles** – lista de veículos (registration dates no mesmo período)
- **contracts** – hierarquia Service Provider → Depots → Loops → Routes (com drivers e subpostcodes)
- **period** – `{ start: '2025-11-01', end: '2026-01-31' }`

Incluir em novas páginas HTML antes do script da aplicação:

```html
<script src="dhl-mock-data.js"></script>
```

Depois usar, por exemplo: `window.DHL_MOCK_DATA.vendors`, `window.DHL_MOCK_DATA.vehicles` ou `window.DHL_MOCK_DATA.contracts`.

## Performance e páginas leves

As páginas do subsistema foram otimizadas para ficarem **leves e dinâmicas**, prontas para animações (ex.: AOS no dashboard SP):

- **Dashboard Service Provider:** removido Tailwind CDN (não utilizado; layout com Bootstrap). Scripts no final da página com `defer` para não bloquear o parsing. Fontes com `preconnect` e variantes reduzidas (400, 600, 700) onde aplicável.
- **Todas as páginas do SP** (dashboard, profile, drivers, vehicles, contracts, sop-feed, select, login): scripts com `defer`, `preconnect` para Google Fonts quando usado.
- **Regra para novas páginas:** não adicionar Tailwind a menos que a página use classes Tailwind; colocar todos os scripts no final do `<body>` com `defer`, mantendo a ordem de dependências (dados → beam-sidebar → app); usar apenas as variantes de fonte necessárias.

## Regra

Todas as modificações e criações do subsistema DHL devem ser feitas **apenas** dentro de `DHL-Subsystem`. O repositório `logix-sphere-frontend-nextjs` não é alterado por este subsistema.
