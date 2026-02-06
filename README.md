# DHL Subsystem

Subsistema de páginas (page scheme) para o projeto **logix-sphere-frontend-nextjs**.

Todas as definições, esquemas e recursos do subsistema DHL ficam **apenas** nesta pasta. O frontend Next.js consome este esquema quando for integrar as rotas DHL.

## Estrutura

```
DHL-Subsystem/
├── README.md                 # Este ficheiro
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

## Regra

Todas as modificações e criações do subsistema DHL devem ser feitas **apenas** dentro de `DHL-Subsystem`. O repositório `logix-sphere-frontend-nextjs` não é alterado por este subsistema.
