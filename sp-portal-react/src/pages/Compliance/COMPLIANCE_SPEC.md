# 📋 Compliance Page - Technical Specification

## 1. 🎯 Overview

A página de Compliance é uma interface centralizada para gerenciamento de perfis de usuários, documentos, treinamentos e processos de background check (Vetting). A página é estruturada em duas abas principais com integração condicional de navegação.

**Tecnologia Stack:**
- React 18+ com TypeScript
- Vite (build tool)
- Tailwind CSS (estilos)
- Custom Hooks para state management
- React Router para navegação

---

## 2. 📐 Component Architecture

### Tree de Componentes

```
Compliance/ (página principal)
├── ComplianceContainer
│   ├── ComplianceTabs (controla troca de abas)
│   │   ├── ProfilesTab
│   │   │   ├── ProfilesList
│   │   │   │   └── ProfileCard
│   │   │   ├── ProfileDetail (modal)
│   │   │   │   ├── DocumentsSection
│   │   │   │   ├── TrainingSection
│   │   │   │   └── VettingStatusCard
│   │   │   └── ProfileFilters
│   │   │
│   │   └── VettingTab
│   │       ├── VettingList
│   │       │   └── VettingCard
│   │       ├── VettingDetail (modal)
│   │       │   ├── BackgroundCheckForm
│   │       │   ├── DocumentVerification
│   │       │   └── VettingChecklist
│   │       └── VettingFilters
│   │
│   └── ComplianceStats (KPI cards)
│
└── useComplianceState (custom hook)
    └── useConditionalRedirect (custom hook)
```

---

## 3. ⚙️ State Management Architecture

### ComplianceState (Context + Hook)

```typescript
interface ComplianceState {
  // Dados
  profiles: UserProfile[];
  vettings: VettingRecord[];
  selectedProfile: UserProfile | null;
  selectedVetting: VettingRecord | null;
  
  // UI
  activeTab: 'profiles' | 'vetting';
  loading: boolean;
  error: string | null;
  
  // Modais
  modals: {
    profileDetail: boolean;
    vettingDetail: boolean;
    documentUpload: boolean;
  };
}
```

### Custom Hooks

#### `useComplianceState()`
- Gerencia estado global da página
- Sincroniza profileId/vettingId da URL
- Persiste última aba ativa

#### `useConditionalRedirect()`
- Monitora tentativa de abrir um perfil
- Verifica status do Vetting
- Se não finalizado → redireciona para aba Vetting
- Se finalizado → abre ProfileDetail modal

#### `useVettingStatus(profileId)`
- Retorna status completo do Vetting para um perfil
- Calcula progress percentage
- Retorna array de items pendentes

---

## 4. 🔄 Fluxo de Negócio (Conditional Redirect)

```
User clica em Profile na aba Profiles
    ↓
ComplianceContainer → useConditionalRedirect()
    ↓
Verifica: vetting.status === 'completed' ?
    ↓
    ├─ SIM → Open ProfileDetail Modal
    │         (exibe documentos, treinamentos, status)
    │
    └─ NÃO → Auto-redirect para Vetting Tab
             Foca no vetting deste usuário
             Exibe VettingDetail modal
             Destaca checklist pendente
```

### Implementação do Redirect

```typescript
function handleOpenProfile(profile: UserProfile) {
  const vettingRecord = vettings.find(v => v.profileId === profile.id);
  
  if (vettingRecord?.status !== 'completed') {
    // Redirect condicional
    setActiveTab('vetting');
    setSelectedVetting(vettingRecord);
    setSelectedProfile(profile);
    // Modal de Vetting abre automaticamente
    return;
  }
  
  // Fluxo normal
  setSelectedProfile(profile);
  setModals(prev => ({ ...prev, profileDetail: true }));
}
```

---

## 5. 📊 Data Models

### UserProfile
```typescript
interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  vendor: string;
  role: 'driver' | 'admin' | 'vendor';
  
  // Compliance data
  documents: ComplianceDocument[];
  trainings: Training[];
  vettingStatus: 'pending' | 'in-progress' | 'completed' | 'rejected';
  complianceScore: number; // 0-100
  
  // Timeline
  createdAt: string;
  lastUpdated: string;
  vettingCompletedAt?: string;
}

interface ComplianceDocument {
  id: string;
  type: 'id' | 'license' | 'proof-of-address' | 'contract' | 'insurance';
  name: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  uploadedAt: string;
  expiresAt?: string;
  url: string;
  verifiedBy?: string;
  notes?: string;
}

interface Training {
  id: string;
  name: string;
  type: 'mandatory' | 'optional';
  status: 'not-started' | 'in-progress' | 'completed';
  completedAt?: string;
  expiresAt?: string;
  certificateUrl?: string;
}
```

### VettingRecord
```typescript
interface VettingRecord {
  id: string;
  profileId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  
  // Background check
  backgroundCheck: {
    criminalRecord: boolean;
    status: 'pending' | 'approved' | 'flagged';
    notes: string;
  };
  
  // Checklist
  checklist: ChecklistItem[];
  
  // Officer assignment
  assignedOfficer?: string;
  
  // Timeline
  createdAt: string;
  completedAt?: string;
  
  // Impact on Vendor
  vendorAccess: 'full' | 'restricted' | 'none';
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}
```

---

## 6. 🎨 UI Specifications

### Aba "Profiles"

**Layout:**
- Header com stats KPI (total, compliant, pending, rejected)
- Filtros: status, vendor, role, data
- Search bar
- Lista com ProfileCards em grid

**ProfileCard:**
```
┌─────────────────────────────────┐
│ [Avatar] João Silva             │
│ driver@vendor.com               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Status: ✓ Completed             │
│ Compliance: 95% ████████░       │
│ Vetting: ✓ Completed            │
│ Vendor: FedEx                    │
│                         [+] [→] │
└─────────────────────────────────┘
```

**ProfileDetail Modal:**
```
┌─────────────────────────────────────────┐
│ João Silva (driver@vendor.com)       [×] │
│ Vendor: FedEx | Role: Driver             │
├─────────────────────────────────────────┤
│ [Documents] [Trainings] [Vetting]        │
│                                          │
│ DOCUMENTS                                │
│ ✓ ID                         Approved   │
│ ✓ Driving License            Approved   │
│ ⏱ Insurance Certificate      Pending    │
│                                          │
│ [Upload Document] [Refresh]              │
├─────────────────────────────────────────┤
│ [Close] [Save] [Archive]                 │
└─────────────────────────────────────────┘
```

### Aba "Vetting"

**Layout:**
- Stats KPI (total, completed, rejected, pending)
- Filtros: status, assigned officer, priority
- Lista com VettingCards

**VettingCard:**
```
┌─────────────────────────────────┐
│ Maria Santos (driver)       [○] │
│ FedEx • In Progress             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ Assigned: Sarah Thompson        │
│ Progress: 12/18 steps ███████░  │
│ Days in Progress: 5             │
│ Next: Background Check          │
│                    [View] [Edit] │
└─────────────────────────────────┘
```

**VettingDetail Modal:**
```
┌───────────────────────────────────────────────┐
│ Maria Santos - Vetting Progress           [×] │
│ FedEx • In Progress (12/18)                   │
├───────────────────────────────────────────────┤
│ BACKGROUND CHECK                              │
│ Criminal Record: ○ No                         │
│ Status: ⏱ Pending                            │
│ Notes: [Waiting for DBS response]             │
│                                               │
│ CHECKLIST                                     │
│ ✓ Application Form                           │
│ ✓ Right to Work Check                        │
│ ✓ DVLA Check                                 │
│ ⏱ Interview Scheduled                        │
│ ○ DBS Result                                 │
│ ○ Final Decision                             │
│                                               │
│ [Complete Interview] [Upload DBS] [Approve]  │
├───────────────────────────────────────────────┤
│ [Cancel] [Save] [Approve & Notify]            │
└───────────────────────────────────────────────┘
```

---

## 7. 🔗 Integration with Vendor Page

**Impacto no Vendor:**

Quando a página de Compliance é atualizada, ela deve notificar a página de Vendor:

```typescript
// ComplianceContainer.tsx
useEffect(() => {
  if (selectedProfile?.vettingStatus === 'completed') {
    // Emit event ou trigger callback
    window.dispatchEvent(new CustomEvent('compliance-updated', {
      detail: {
        profileId: selectedProfile.id,
        status: selectedProfile.vettingStatus,
        vendorAccess: 'full',
      }
    }));
  }
}, [selectedProfile?.vettingStatus]);
```

**No Vendor Page:**
```typescript
// VendorPerformance.tsx ou similar
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

---

## 8. 📁 File Structure

```
sp-portal-react/src/pages/Compliance/
├── Compliance.tsx                 (container principal)
├── Compliance.module.css           (estilos do container)
├── COMPLIANCE_SPEC.md              (este arquivo)
├── hooks/
│   ├── useComplianceState.ts        (state management)
│   ├── useConditionalRedirect.ts    (lógica de redirect)
│   └── useVettingStatus.ts          (status do vetting)
├── components/
│   ├── ComplianceTabs.tsx           (tab controller)
│   ├── ComplianceStats.tsx          (KPI cards)
│   ├── ProfilesTab/
│   │   ├── ProfilesTab.tsx
│   │   ├── ProfilesList.tsx
│   │   ├── ProfileCard.tsx
│   │   ├── ProfileDetail.tsx        (modal)
│   │   └── ProfileFilters.tsx
│   └── VettingTab/
│       ├── VettingTab.tsx
│       ├── VettingList.tsx
│       ├── VettingCard.tsx
│       ├── VettingDetail.tsx        (modal)
│       ├── VettingFilters.tsx
│       └── VettingChecklist.tsx
├── types/
│   └── compliance.ts                (TypeScript interfaces)
└── styles/
    └── compliance.css               (tailwind utilities)
```

---

## 9. 🔄 API Integration Points

```typescript
// Endpoints esperados:

// Profiles
GET    /api/compliance/profiles               // Lista todos
GET    /api/compliance/profiles/:id           // Detalhe
POST   /api/compliance/profiles/:id/documents // Upload doc
PATCH  /api/compliance/profiles/:id           // Atualizar

// Vetting
GET    /api/compliance/vetting                // Lista todos
GET    /api/compliance/vetting/:id            // Detalhe
POST   /api/compliance/vetting/:id/checklist  // Atualizar checklist
PATCH  /api/compliance/vetting/:id            // Atualizar status

// Background Check
POST   /api/compliance/vetting/:id/background-check
GET    /api/compliance/vetting/:id/background-check/status
```

---

## 10. ✅ Testing Strategy

```typescript
// useConditionalRedirect.test.ts
describe('useConditionalRedirect', () => {
  it('should redirect to vetting tab when profile vetting is incomplete', () => {
    // Test conditional redirect logic
  });
  
  it('should open profile detail modal when vetting is complete', () => {
    // Test normal flow
  });
});

// Compliance.integration.test.ts
describe('Compliance Integration', () => {
  it('should emit compliance-updated event when vetting completes', () => {
    // Test vendor integration
  });
});
```

---

## 11. 🚀 Implementation Priority

**Phase 1 (MVP):**
- [ ] ComplianceContainer + ComplianceTabs
- [ ] ProfilesTab com lista e filtros
- [ ] useConditionalRedirect hook
- [ ] VettingTab com lista básica

**Phase 2 (Enhancement):**
- [ ] ProfileDetail modal com documentos
- [ ] VettingDetail modal com checklist
- [ ] Upload de documentos
- [ ] Background check integration

**Phase 3 (Polish):**
- [ ] Animações e transições
- [ ] Integração com Vendor page
- [ ] Notificações em tempo real
- [ ] Export/reports

---

## 12. 🎯 Success Criteria

- ✅ Redirect condicional funciona sem bugs
- ✅ Troca de abas é suave e responsiva
- ✅ Dados são sincronizados corretamente
- ✅ Integração com Vendor page funciona
- ✅ Modais abrem/fecham corretamente
- ✅ Estado persiste na navegação
- ✅ Performance < 2s load time
- ✅ 90%+ Lighthouse score
