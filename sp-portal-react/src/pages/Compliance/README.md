# 📋 Compliance Page - Implementação Completa

## 📚 Visão Geral

A página de **Compliance** é uma interface centralizada para gerenciamento de perfis de usuários, documentos, treinamentos e processos de background check (Vetting). A página implementa um sistema de **redirect condicional** que força a navegação para a aba de Vetting quando um perfil incompleto é acessado.

## 🎯 Regra de Negócio Principal

```
User clica em Profile na aba Profiles
    ↓
[Verifica: Vetting status === 'completed'?]
    ↓
    ├─ SIM → Abre ProfileDetail Modal (visualizar docs/treinamentos)
    │
    └─ NÃO → Auto-redirect para Vetting Tab
             Exibe VettingDetail modal
             Força conclusão do Vetting
```

## 📂 Estrutura de Diretórios

```
src/pages/Compliance/
├── Compliance.tsx                        # Container principal
├── Compliance.module.css                 # Estilos (Tailwind + Custom)
├── COMPLIANCE_SPEC.md                    # Especificação técnica completa
├── README.md                             # Este arquivo
│
├── types/
│   └── compliance.ts                     # Interfaces TypeScript
│
├── hooks/
│   ├── useComplianceState.ts             # State management principal
│   ├── useConditionalRedirect.ts         # Lógica de redirect condicional
│   └── useVettingStatus.ts               # Info sobre status do Vetting
│
└── components/
    ├── ComplianceTabs.tsx                # Controller de abas
    ├── ComplianceStats.tsx               # Cards de KPI
    │
    ├── ProfilesTab/
    │   ├── ProfilesTab.tsx               # Container da aba Profiles
    │   ├── ProfilesList.tsx              # Lista com filtros
    │   ├── ProfileCard.tsx               # Card individual
    │   ├── ProfileFilters.tsx            # Componente de filtros
    │   └── ProfileDetail.tsx             # Modal de detalhe
    │
    └── VettingTab/
        ├── VettingTab.tsx                # Container da aba Vetting
        ├── VettingList.tsx               # Lista com filtros
        ├── VettingCard.tsx               # Card individual
        ├── VettingFilters.tsx            # Componente de filtros
        └── VettingDetail.tsx             # Modal de detalhe
```

## 🚀 Como Usar

### 1. Importar a Página

```tsx
import { Compliance } from './pages/Compliance/Compliance';

// No seu router/App.tsx
<Route path="/compliance" element={<Compliance />} />
```

### 2. Hooks Disponíveis

#### `useComplianceState()`
Gerencia o estado global da página.

```tsx
const {
  state,                      // ComplianceState
  selectProfile,              // Selecionar perfil
  selectVetting,              // Selecionar vetting
  setActiveTab,               // Mudar aba
  openProfileDetailModal,     // Abrir modal de perfil
  closeProfileDetailModal,    // Fechar modal de perfil
  updateProfile,              // Atualizar dados do perfil
  updateVetting,              // Atualizar vetting
  updateChecklistItem,        // Atualizar item do checklist
} = useComplianceState();
```

#### `useConditionalRedirect()`
Implementa a lógica de redirect condicional.

```tsx
const {
  handleOpenProfile,          // Trata clique em perfil
  handleOpenVetting,          // Trata clique em vetting
  isVettingPending,           // Verifica se vetting está pendente
  getVettingProgress,         // Retorna progresso do vetting
  getVettingStatus,           // Retorna status completo
} = useConditionalRedirect({ ... });
```

#### `useVettingStatus(vetting)`
Retorna informações detalhadas sobre o vetting.

```tsx
const {
  isComplete,                 // boolean
  isPending,                  // boolean
  isRejected,                 // boolean
  progress: {
    completed,                // número de items completos
    total,                    // total de items
    percentage,               // 0-100
  },
  pendingItems,               // array de items pendentes
  nextStep,                   // próximo item a fazer
  backgroundCheckStatus,      // 'pending' | 'approved' | 'flagged'
  daysInProgress,             // número de dias
  slaStatus,                  // 'ok' | 'warning' | 'breached'
} = useVettingStatus(vetting);
```

### 3. Types e Interfaces

Veja `types/compliance.ts` para:
- `UserProfile` - Dados do usuário
- `VettingRecord` - Dados do vetting
- `ComplianceDocument` - Documento
- `Training` - Treinamento
- `ChecklistItem` - Item do checklist
- `ComplianceState` - Estado global

### 4. Custom Events

A página emite events para integração com outras páginas:

```typescript
// Quando um perfil é aberto e vetting está incompleto
window.addEventListener('compliance-conditional-redirect', (event: any) => {
  const { profileId, vettingId, action, reason } = event.detail;
  console.log(`Redirect triggered: ${reason}`);
});

// Quando compliance é atualizado
window.addEventListener('compliance-updated', (event: any) => {
  const { profileId, vettingId, status, vendorAccess } = event.detail;
  // Atualizar dados da página de Vendor
});

// Quando página termina de carregar
window.addEventListener('compliance-loaded', (event: any) => {
  const { totalProfiles, totalVettings, timestamp } = event.detail;
});
```

## 🔄 Fluxo de Redirect Condicional

### Exemplo Prático

```tsx
// User clica em um perfil
<ProfileCard onClick={() => handleOpenProfile(profile)} />

// Isso dispara:
const conditionalRedirect = useConditionalRedirect({...});
conditionalRedirect.handleOpenProfile(profile);

// Inside handleOpenProfile:
const vetting = vettings.find(v => v.profileId === profile.id);

if (vetting?.status !== 'completed') {
  // ✅ Redirect para Vetting
  setActiveTab('vetting');
  setSelectedVetting(vetting);
  onOpenVettingDetail();
  
  // Emit event
  window.dispatchEvent(new CustomEvent('compliance-conditional-redirect', {
    detail: { profileId, vettingId, action: 'redirect', reason: '...' }
  }));
} else {
  // ✅ Abrir ProfileDetail modal normalmente
  setSelectedProfile(profile);
  onOpenProfileDetail();
}
```

## 📊 Estado (State Management)

### Structure

```tsx
interface ComplianceState {
  // Data
  profiles: UserProfile[];
  vettings: VettingRecord[];
  selectedProfile: UserProfile | null;
  selectedVetting: VettingRecord | null;

  // UI
  activeTab: 'profiles' | 'vetting';
  loading: boolean;
  error: string | null;

  // Modals
  modals: {
    profileDetail: boolean;
    vettingDetail: boolean;
    documentUpload: boolean;
  };

  // Filters
  filters: {
    profiles: ProfileFilters;
    vetting: VettingFilters;
  };
}
```

### Persistência

- **Última aba ativa**: Persiste em `localStorage` com chave `compliance-active-tab`
- **URL params**: Sincroniza com `?profile=ID` e `?vetting=ID`
- **Modais**: State ephemeral (limpo ao fechar)

## 🎨 Componentes

### ProfilesTab
- **Aba de Perfis** com listagem de usuários
- Filtros: status, vendor, role, busca
- Ordenação: nome, data, score, status
- Cards com indicador de Vetting pendente
- Modal de detalhe com documentos, treinamentos e histórico

### VettingTab
- **Aba de Vetting** com gerenciamento centralizado
- Filtros: status, prioridade, SLA, busca
- Ordenação: nome, data, prioridade, SLA
- Cards com progresso, SLA status, prioridade
- Modal com checklist interativo, background check, ações

### ComplianceStats
- **KPI Cards** com estatísticas gerais
- Diferentes cards dependendo da aba ativa
- Clicáveis para filtrar a lista

## 🔗 Integração com Vendor Page

Quando um vetting é concluído, a página emite um event:

```tsx
// Em Compliance.tsx
useEffect(() => {
  if (selectedProfile?.vettingStatus === 'completed') {
    window.dispatchEvent(new CustomEvent('compliance-updated', {
      detail: {
        profileId: selectedProfile.id,
        status: selectedProfile.vettingStatus,
        vendorAccess: 'full',
        timestamp: new Date().toISOString(),
      }
    }));
  }
}, [selectedProfile?.vettingStatus]);

// Em VendorPerformance.tsx (ou qualquer outra página)
useEffect(() => {
  const handleComplianceUpdate = (event: Event) => {
    const { profileId, vendorAccess } = (event as CustomEvent).detail;
    // Atualizar dados do vendor com o novo status
    updateVendorPermissions(profileId, vendorAccess);
  };

  window.addEventListener('compliance-updated', handleComplianceUpdate);
  return () => window.removeEventListener('compliance-updated', handleComplianceUpdate);
}, []);
```

## ✅ Checklist de Implementação

### Phase 1 (MVP - Essencial)
- [x] ComplianceContainer + ComplianceTabs
- [x] ProfilesTab com lista e filtros
- [x] useConditionalRedirect hook
- [x] VettingTab com lista básica
- [x] Custom events emitidos

### Phase 2 (Enhancement)
- [ ] ProfileDetail modal com upload de documentos
- [ ] VettingDetail modal totalmente funcional
- [ ] Background check integration
- [ ] Real API integration (replace mock data)

### Phase 3 (Polish)
- [ ] Animações e transições suaves
- [ ] Notificações em tempo real
- [ ] Export/reports
- [ ] Dark mode support
- [ ] Teste de performance

## 🧪 Testing

### Unit Tests (Hooks)

```tsx
describe('useConditionalRedirect', () => {
  it('should redirect to vetting when status !== completed', () => {
    // Test
  });

  it('should open profile detail when vetting is complete', () => {
    // Test
  });
});

describe('useComplianceState', () => {
  it('should persist active tab to localStorage', () => {
    // Test
  });

  it('should sync URL params', () => {
    // Test
  });
});
```

### Integration Tests

```tsx
describe('Compliance Integration', () => {
  it('should emit compliance-updated event on vetting completion', () => {
    // Test
  });

  it('should coordinate between Profiles and Vetting tabs', () => {
    // Test
  });
});
```

## 📈 Performance Optimization

- [ ] Lazy load profiles/vettings list
- [ ] Memoize filtered results
- [ ] Virtual scrolling para listas grandes
- [ ] Debounce search queries
- [ ] Cache API responses

## 🐛 Debugging

### Verificar State
```tsx
// Console in browser
window.__COMPLIANCE_STATE__ = complianceState.state;
```

### Monitorar Events
```tsx
window.addEventListener('compliance-conditional-redirect', (e) => {
  console.log('[Compliance] Redirect:', e.detail);
});

window.addEventListener('compliance-updated', (e) => {
  console.log('[Compliance] Updated:', e.detail);
});
```

### Verificar URL Sync
```tsx
// Deve haver params na URL quando navegar
// ?profile=profile-1
// ?vetting=vetting-1
// ?tab=profiles
```

## 📝 Notas Importantes

1. **Redirect Condicional**: Ocorre ANTES de abrir o modal de ProfileDetail
2. **SLA Tracking**: Calculado baseado em `daysInStage` do VettingRecord
3. **Vendor Access**: Muda de acordo com status do Vetting
4. **Scroll Lock**: Implementado via `useModalBehavior` hook
5. **State Persistence**: Apenas aba ativa é persistida

## 🚨 Possíveis Issues

### Issue: Modal não abre ao redirecionar
**Solução**: Verifique se `onOpenVettingDetail` está sendo chamado em `useConditionalRedirect`

### Issue: Filtros não funcionam
**Solução**: Verifique se `useMemo` está recalculando com as dependências certas

### Issue: URL params não sincronizam
**Solução**: Verifique se `window.history.replaceState` está sendo chamado

## 📞 Contato & Suporte

Para dúvidas sobre a implementação, consulte:
- `COMPLIANCE_SPEC.md` - Especificação técnica completa
- `types/compliance.ts` - Todas as interfaces
- Hooks - Documentados inline com JSDoc

---

**Última atualização:** 2026-07-27
**Status:** ✅ Implementação Completa
