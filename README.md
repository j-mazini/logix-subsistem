# DHL Subsystem - React Migration

Subsistema DHL totalmente migrado para **React 19** com **Vite**.

O aplicativo agora é uma **Single Page Application (SPA)** com roteamento React, removendo completamente a dependência de arquivos HTML estáticos.

## Estrutura

```
logix-subsistem/
├── README.md                      # Este ficheiro
├── DEPLOYMENT.md                  # Guia de deployment para GitHub Pages
├── sp-portal-react/               # Aplicação React (Vite + TypeScript)
│   ├── src/
│   │   ├── App.tsx               # Roteamento da aplicação
│   │   ├── pages/                # Páginas da aplicação (React components)
│   │   ├── layout/               # Componentes de layout compartilhados
│   │   ├── design/               # Tokens de design e CSS global
│   │   └── data/                 # Mock data em TypeScript
│   ├── index.html                # Entry point único
│   ├── vite.config.ts            # Configuração Vite
│   └── package.json              # Dependências e scripts
├── pages-schema/                 # Esquema de rotas (documentação)
└── dhl/                          # Dados e assets DHL compartilhados
```

## Desenvolviment e Deploy

### Desenvolvimento Local

```bash
cd sp-portal-react
npm install
npm run dev
```

Abre em `http://localhost:5173`

### Build e Deploy

```bash
npm run build      # Cria dist/ otimizado para produção
npm run preview    # Preview local do build
```

Deploy automático ocorre em GitHub Actions quando:
- Push para `main` → Production
- Push para `feature/react-migration-sp-portal` → Staging

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para detalhes completos.

## Rotas Disponíveis

- `/` – My Profile (perfil da empresa)
- `/dashboard` – Dashboard do Service Provider
- `/drivers` – Gestão de drivers
- `/vehicles` – Gestão de veículos
- `/contracts` – Visualização de contratos
- `/sop-feed` – Feed de procedimentos operacionais
- `/vetting-admin` – Admin de vetting de drivers
- `/route-balance` – Balanceamento de rotas
- `/route-balancer` – Balanceador avançado
- `/daily-operations-management` – Gestão de operações diárias
- `/week-planner` – Planejador semanal
- `/assets` – Gestão de assets
- `/invoices` – Faturas
- `/adhoc-invoice-management` – Sistema de faturas ad-hoc
- `/daily-financial-insights` – Insights financeiros diários
- `/daily-operations-reports` – Relatórios de operações
- `/vendor-performance` – Performance dos vendors
- `/requests-admin` – Requisições de vendors
- `/announcements` – Avisos
- `/select` – Seleção de acesso (tela inicial)
- `/login` – Login

## Mock de Dados

Dados mock para 3 meses (Nov 2025 - Jan 2026) estão em `sp-portal-react/src/data/`:

- `dhlMockData.ts` – Vendors, vehicles, contracts
- `dashboardData.ts` – Métricas do dashboard
- `contractsData.ts` – Estrutura de contratos
- `announcementsData.ts` – Avisos

## Performance

Build otimizado para produção:
- **CSS**: 264.65 KB (gzip: 43.66 KB)
- **JS**: 454.17 KB (gzip: 123.54 KB)
- **HTML**: 1.04 KB (gzip: 0.51 KB)
- **Total**: ~719 KB (gzip: ~167 KB)
- **Build time**: 446ms
- **Módulos**: 89
