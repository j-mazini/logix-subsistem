# Live Service — Real-time Operations Dashboard

## Overview

**Live Service** é o "Pulso da Operação" — um painel em tempo real que permite administradores gerenciarem entregas ao vivo, rastrearem entregadores, detectarem exceções e reatribuírem tarefas dinamicamente.

## Features

### 1. **KPI Cards** — Visão Geral em Tempo Real
- **Total de Entregas Hoje**: Quantidade de pacotes em rota
- **Progresso Atual**: Barra visual com % concluído
- **Taxa de Sucesso vs. Insucesso**: Métrica de qualidade (entregas/falhas)
- **Tempo Médio por Parada**: Calculado entre scans do scanner

Atualiza a cada 2 segundos com dados realistas.

### 2. **Mapa Operacional** — O Olho de Águia
- **Rastreamento ao Vivo**: Ícones de entregadores no mapa (SVG mock)
- **Sistema de Cores**:
  - 🟢 Verde: Em rota (on schedule)
  - 🟡 Amarelo: Em pausa
  - 🔵 Azul: Retornando à base
  - 🔴 Vermelho: Bateria baixa (<20%)
  - ⚫ Cinza: Offline

- **Heatmap**: Zonas com acúmulo de pacotes (overlay transparente)

Pronto para integração com Leaflet (fase 2).

### 3. **Triage de Exceções** — Foco na Ação
- **Fila de Alertas**: Ausente, Endereço Errado, Inacessível, Danificado, Recusado
- **Expandível**: Click para detalhes completos
- **Ações Rápidas**:
  - Ligar Cliente (placeholder)
  - Resolver (marca como resolvido)

- **Status Visual**: Cor por tipo de exceção

### 4. **Live Feed do Scanner** — O "Ticker"
- **Eventos Recentes**: Lista rolável com últimos 20 eventos
- **Formato**: `HH:MM - [Nome] escaneou #PKGID (Status)`
- **Auto-scroll**: Novo evento scroll para view
- **Auditoria**: Rastreabilidade completa de bips

Atualiza em tempo real a cada novo evento.

### 5. **Raio-X da Equipe** — Status da Operação
- **Tabela Interativa**:
  - Nome do Entregador
  - Status (Em Rota/Pausa/Retornando/Offline)
  - Carga (Entregues / Total)
  - Bateria (20-100%)
  - Tempo Médio por Parada

- **Sorting**: Clicável em cada coluna (asc/desc)
- **Drag-and-Drop Prep** (visual indicator, não funcional em v1)

## Architecture

### Directory Structure

```
/src/pages/LiveService/
├── LiveService.tsx           # Wrapper
├── page.tsx                  # Main container
├── types.ts                  # TypeScript DTOs
├── mock-data.ts              # Deterministic mock data
├── LiveService.module.css    # Scoped styles
├── components/               # 5 feature components
│   ├── LiveKPICards/
│   ├── OperationalMap/
│   ├── ExceptionTriage/
│   ├── ScannerLiveFeed/
│   └── TeamRoster/
├── hooks/                    # 5 custom hooks
│   ├── useLiveMetrics.ts
│   ├── useLiveTracking.ts
│   ├── useLiveExceptions.ts
│   ├── useScannerEvents.ts
│   └── useTeamStatus.ts
└── README.md
```

### Data Flow

```
page.tsx (orchestrator)
  ├── useLiveMetrics() → LiveKPICards
  ├── useLiveTracking() → OperationalMap
  ├── useLiveExceptions() → ExceptionTriage
  ├── useScannerEvents() → ScannerLiveFeed
  └── useTeamStatus() → TeamRoster
```

### Real-time Simulation

- **Update Interval**: 2 seconds (setInterval)
- **Deterministic**: Seeded RNG for reproducible mock data
- **Mock Data**: 
  - 10 entregadores
  - 50 entregas (mixed statuses)
  - 100+ eventos (últimas 2 horas)
  - 3-5 exceções ativas

### Type Definitions

Veja `types.ts` para:
- `DeliveryStatus`, `DelivererStatus`, `ExceptionReason` (enums)
- `Delivery`, `Deliverer`, `LiveMetrics`, `ScannerEvent`, `Exception`, `TeamMember` (DTOs)

## Integration with Backend

### Swapping Mock → Real API

Each hook is designed to accept either mock data or API responses. To integrate real APIs:

1. **useLiveMetrics.ts**:
   - Replace mock calculation → `fetch('/api/metrics/today')`
   - Return same `LiveMetrics` interface

2. **useLiveTracking.ts**:
   - Replace `MOCK_DELIVERERS` → `fetch('/api/deliverers/live')`
   - Handle WebSocket for real-time updates (optional)

3. **useLiveExceptions.ts**:
   - Replace `MOCK_EXCEPTIONS` → `fetch('/api/exceptions/active')`
   - Implement `resolveException` to call `PATCH /api/exceptions/{id}`

4. **useScannerEvents.ts**:
   - Replace `MOCK_SCANNER_EVENTS` → `fetch('/api/events/recent')`
   - Or use WebSocket subscription for live stream

5. **useTeamStatus.ts**:
   - Replace mock data → `fetch('/api/team/status')`
   - Map Deliverer → TeamMember

### API Contract

Expected endpoints (adjust to your backend):

```typescript
GET /api/metrics/today → LiveMetrics
GET /api/deliverers/live → Deliverer[]
GET /api/exceptions/active → Exception[]
PATCH /api/exceptions/{id} → { resolved: true }
GET /api/events/recent → ScannerEvent[]
GET /api/team/status → TeamMember[]
```

## Styling

- **Theme**: Indigo primary, neutral backgrounds
- **Dark Mode**: Supported via `@media (prefers-color-scheme: dark)`
- **Framework**: CSS Modules + Tailwind utilities
- **Icons**: Lucide React (24px)
- **Responsive**: Mobile-friendly layouts

## Future Enhancements

### Phase 2 (Planned)
- [ ] Leaflet map integration
- [ ] React-beautiful-dnd drag-and-drop
- [ ] WebSocket real-time updates
- [ ] Push notifications for exceptions
- [ ] Geofencing alerts

### Phase 3
- [ ] Customer callback workflow
- [ ] Delivery rescheduling UX
- [ ] AI exception classification
- [ ] Performance analytics

## Development

### Running Locally

```bash
cd sp-portal-react
npm run dev
# Navigate to http://localhost:5173/#/live-service
```

### Testing

- Mock data regenerates on each page load (deterministic)
- Update intervals: 2 seconds
- No external API calls (all mock)

### Debugging

Check browser console for:
- Interval cleanup warnings (should be none)
- Type errors (should be none in strict mode)
- Prop mismatches (components handle gracefully)

## Notes

- Page uses `PortalLayout` wrapper for consistent site layout
- No global state (Context/Redux) — props only
- All data recalculated on mount (fresh data every load)
- Ready for integration with existing auth/session system
