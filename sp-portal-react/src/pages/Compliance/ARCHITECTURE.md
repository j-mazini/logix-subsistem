# 🏗️ Arquitetura da Página de Compliance

## 📊 Visão Geral de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                     COMPLIANCE PAGE                         │
│                    (Compliance.tsx)                         │
└─────────────────────────────────────────────────────────────┘
  │
  ├─► useComplianceState() ◄─────────────────────────────────┐
  │   ├─ profiles: UserProfile[]                            │
  │   ├─ vettings: VettingRecord[]                          │
  │   ├─ activeTab: 'profiles' | 'vetting'                  │
  │   ├─ modals: { profileDetail, vettingDetail, ... }      │
  │   └─ filters: { profiles, vetting }                     │
  │                                                           │
  ├─► useConditionalRedirect()                              │ State
  │   ├─ handleOpenProfile(profile)                         │ Management
  │   ├─ isVettingPending(profileId)                        │
  │   └─ getVettingProgress(profileId)                      │
  │                                                           │
  └─► window.dispatchEvent() ◄────────────────────────────────┤
      ├─ 'compliance-conditional-redirect'
      ├─ 'compliance-updated'
      └─ 'compliance-loaded'
```

## 🔄 Fluxo de Redirect Condicional

```
USER ACTION
    │
    ▼
┌─────────────────────────────────┐
│ Clica em Profile no Grid        │
│ handleOpenProfile(profile)      │
└─────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────┐
│ Busca VettingRecord             │
│ getVettingStatus(profile.id)    │
└─────────────────────────────────┘
    │
    ├──── vetting?.status === 'completed' ? ────┐
    │                                             │
    NO                                            YES
    │                                             │
    ▼                                             ▼
┌────────────────────────┐            ┌──────────────────────────┐
│ REDIRECT TO VETTING    │            │ OPEN PROFILE DETAIL      │
│ - setActiveTab('vetting')           │ - setSelectedProfile     │
│ - setSelectedVetting   │            │ - openProfileDetailModal │
│ - openVettingDetail()  │            └──────────────────────────┘
│ - emit event           │                        │
└────────────────────────┘                        ▼
    │                                      ┌──────────────────┐
    │                                      │ PROFILE DETAIL   │
    │                                      │ MODAL            │
    │                                      │ - Docs, Training │
    │                                      │ - Histórico      │
    │                                      └──────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ VETTING DETAIL MODAL           │
│ - Checklist interativo         │
│ - Background check             │
│ - Status tracking              │
│ - Action buttons               │
└────────────────────────────────┘
    │
    ▼
┌────────────────────────────────┐
│ Completa/Rejeita Vetting       │
│ emit 'compliance-updated'      │
└────────────────────────────────┘
```

## 🗂️ Hierarquia de Componentes (Tree)

```
Compliance (page container)
├── ComplianceStats (KPI cards)
│   ├── Profiles tab stat cards
│   │   ├─ Total
│   │   ├─ Completed
│   │   ├─ In Progress
│   │   ├─ Rejected
│   │   └─ Avg Score
│   │
│   └── Vetting tab stat cards
│       ├─ Total
│       ├─ Completed
│       ├─ In Progress
│       ├─ SLA Breach
│       └─ Completion Rate
│
└── ComplianceTabs (tab controller)
    ├── ProfilesTab
    │   ├─ ProfileFiltersComponent
    │   │  ├─ Status select
    │   │  ├─ Role select
    │   │  ├─ Vendor input
    │   │  ├─ Search input
    │   │  └─ Sort controls
    │   │
    │   ├─ ProfilesList
    │   │  └─ ProfileCard (repeating)
    │   │     ├─ Avatar
    │   │     ├─ Name/Email
    │   │     ├─ Vendor badge
    │   │     ├─ Status badge
    │   │     ├─ Compliance score bar
    │   │     ├─ Vetting progress bar
    │   │     └─ Action buttons
    │   │
    │   └─ ProfileDetail (portal modal)
    │      ├─ Header (name, vendor, role)
    │      ├─ Personal Info Section
    │      │  ├─ Email
    │      │  ├─ Phone
    │      │  ├─ Vendor
    │      │  ├─ Role
    │      │  ├─ Score
    │      │  └─ Status
    │      ├─ Documents Section
    │      │  └─ Document items (list)
    │      ├─ Trainings Section
    │      │  └─ Training items (list)
    │      ├─ Timeline Section
    │      │  ├─ Created date
    │      │  ├─ Last updated
    │      │  └─ Vetting completed (if any)
    │      └─ Footer (Close, Save buttons)
    │
    └── VettingTab
        ├─ VettingFiltersComponent
        │  ├─ Status select
        │  ├─ Priority select
        │  ├─ SLA select
        │  ├─ Search input
        │  └─ Sort controls
        │
        ├─ VettingList
        │  └─ VettingCard (repeating)
        │     ├─ Name/Email
        │     ├─ Status badges
        │     ├─ Vendor/Role
        │     ├─ Officer assigned
        │     ├─ Progress bar
        │     ├─ Days in progress
        │     ├─ SLA status indicator
        │     └─ Action buttons
        │
        └─ VettingDetail (portal modal)
           ├─ Header (name, vendor, email)
           ├─ Status Section
           │  ├─ Status badge
           │  ├─ Days in progress
           │  ├─ Assigned officer
           │  ├─ Priority
           │  ├─ Vendor access level
           │  └─ SLA alert (if breach)
           ├─ Background Check Section
           │  ├─ Criminal record toggle
           │  ├─ Status badge
           │  └─ Notes field
           ├─ Checklist Section
           │  ├─ Progress bar (visual)
           │  ├─ Progress counter (completed/total)
           │  └─ Checklist items (interactive)
           │     ├─ Checkbox
           │     ├─ Title
           │     ├─ Required/Conditional badge
           │     ├─ Description
           │     └─ Condition note (if applicable)
           └─ Footer (Close, Reject, Approve buttons)
```

## 📡 Estado Global (Data Flow)

```
┌──────────────────────────────────────────┐
│       COMPLIANCE STATE (useState)        │
│                                          │
│  ├─ profiles: UserProfile[]              │
│  ├─ vettings: VettingRecord[]            │
│  ├─ activeTab: 'profiles' | 'vetting'    │
│  ├─ selectedProfile: UserProfile | null  │
│  ├─ selectedVetting: VettingRecord | null│
│  ├─ modals: { ... }                      │
│  ├─ filters: { profiles, vetting }       │
│  ├─ loading: boolean                     │
│  └─ error: string | null                 │
└──────────────────────────────────────────┘
        ▲                       ▼
        │      (updates)        │
        │                       │
    ┌───┴─────────────────────┬─┴───┐
    │                         │     │
    │    Components (read)    │     │ Local effects
    │                         │
    ├─ ComplianceStats       │     └─► localStorage
    ├─ ComplianceTabs        │         (active tab)
    ├─ ProfilesTab           │
    │  ├─ ProfilesList       │     ┌─► window.history
    │  └─ ProfileDetail      │     │    (URL params)
    ├─ VettingTab            │     │
    │  ├─ VettingList        │     │ ┌─► window.dispatchEvent
    │  └─ VettingDetail      │     │ │   (custom events)
    │                        │     │ │
    └────────────────────────┴─────┴─┴┘
```

## 🎯 Tipos de Dados (Type System)

```
ComplianceState
├─ profiles: UserProfile[]
│  ├─ id: string
│  ├─ name: string
│  ├─ email: string
│  ├─ phone: string
│  ├─ vendor: string
│  ├─ role: 'driver' | 'admin' | 'vendor'
│  ├─ documents: ComplianceDocument[]
│  │  ├─ id: string
│  │  ├─ type: DocumentType
│  │  ├─ status: DocumentStatus
│  │  ├─ url: string
│  │  └─ ...
│  ├─ trainings: Training[]
│  │  ├─ id: string
│  │  ├─ name: string
│  │  ├─ type: 'mandatory' | 'optional'
│  │  ├─ status: TrainingStatus
│  │  └─ ...
│  ├─ vettingStatus: ComplianceStatus
│  ├─ complianceScore: number (0-100)
│  └─ ...
│
├─ vettings: VettingRecord[]
│  ├─ id: string
│  ├─ profileId: string
│  ├─ status: VettingStatus
│  ├─ backgroundCheck: BackgroundCheck
│  │  ├─ criminalRecord: boolean
│  │  ├─ status: 'pending' | 'approved' | 'flagged'
│  │  └─ notes: string
│  ├─ checklist: ChecklistItem[]
│  │  ├─ id: string
│  │  ├─ title: string
│  │  ├─ required: boolean
│  │  ├─ completed: boolean
│  │  └─ ...
│  ├─ assignedOfficer: string
│  ├─ daysInStage: number
│  ├─ slaBreached: boolean
│  ├─ vendorAccess: 'full' | 'restricted' | 'none'
│  └─ ...
│
├─ filters
│  ├─ profiles: ProfileFilters
│  │  ├─ status: ComplianceStatus | 'all'
│  │  ├─ vendor: string
│  │  ├─ role: UserRole | 'all'
│  │  ├─ searchQuery: string
│  │  ├─ sortBy: 'name' | 'date' | 'score' | 'status'
│  │  └─ sortOrder: 'asc' | 'desc'
│  └─ vetting: VettingFilters
│     ├─ status: VettingStatus | 'all'
│     ├─ officer: string
│     ├─ priority: 'low' | 'medium' | 'high' | 'all'
│     ├─ slaBreached: boolean | 'all'
│     ├─ sortBy: 'name' | 'date' | 'priority' | 'sla'
│     └─ sortOrder: 'asc' | 'desc'
│
├─ modals
│  ├─ profileDetail: boolean
│  ├─ vettingDetail: boolean
│  └─ documentUpload: boolean
│
└─ UI state
   ├─ activeTab: 'profiles' | 'vetting'
   ├─ loading: boolean
   ├─ error: string | null
   └─ ...
```

## 🔌 Events Emitidos

```
┌────────────────────────────────────────────────┐
│  CUSTOM EVENTS EMITIDOS PELA PÁGINA            │
└────────────────────────────────────────────────┘

1. 'compliance-conditional-redirect'
   ├─ Quando: user tenta abrir perfil com vetting incompleto
   ├─ Detail: {
   │    profileId: string
   │    vettingId: string
   │    action: 'redirect'
   │    reason: string
   │  }
   └─ Listeners: Analytics, logging, other pages

2. 'compliance-updated'
   ├─ Quando: vetting é concluído/atualizado
   ├─ Detail: {
   │    profileId: string
   │    vettingId: string
   │    status: ComplianceStatus
   │    vendorAccess: VendorAccessLevel
   │    timestamp: ISO string
   │  }
   └─ Listeners: Vendor page, permissions, analytics

3. 'compliance-loaded'
   ├─ Quando: página termina carregamento inicial
   ├─ Detail: {
   │    totalProfiles: number
   │    totalVettings: number
   │    timestamp: ISO string
   │  }
   └─ Listeners: Layout, analytics, other components
```

## 🎨 Responsive Design

```
DESKTOP (> 1024px)
┌──────────────────────────────────────┐
│ STATS (5 columns grid)               │
├──────────────────────────────────────┤
│ TAB NAVIGATION                       │
├──────────────────────────────────────┤
│ FILTERS (1 row, flex wrap)           │
├──────────────────────────────────────┤
│ CONTENT GRID (3-4 columns)           │
│ ┌─────────────┐ ┌─────────────┐     │
│ │   Card 1    │ │   Card 2    │ ... │
│ └─────────────┘ └─────────────┘     │
└──────────────────────────────────────┘

TABLET (768px - 1024px)
┌──────────────────────────────────────┐
│ STATS (3 columns grid)               │
├──────────────────────────────────────┤
│ TAB NAVIGATION                       │
├──────────────────────────────────────┤
│ FILTERS (2 rows, flex wrap)          │
├──────────────────────────────────────┤
│ CONTENT GRID (2 columns)             │
│ ┌──────────────────┐                 │
│ │   Card 1         │ ┌──────────┐    │
│ ├──────────────────┤ │ Card 2   │    │
│ │   Card 3         │ └──────────┘    │
│ └──────────────────┘                 │
└──────────────────────────────────────┘

MOBILE (< 768px)
┌──────────────────────┐
│ STATS (1 column)     │
├──────────────────────┤
│ TAB NAVIGATION       │
│ (stacked buttons)    │
├──────────────────────┤
│ FILTERS (stacked)    │
├──────────────────────┤
│ CONTENT (1 column)   │
│ ┌─────────────────┐  │
│ │   Card 1        │  │
│ ├─────────────────┤  │
│ │   Card 2        │  │
│ ├─────────────────┤  │
│ │   Card 3        │  │
│ └─────────────────┘  │
└──────────────────────┘
```

## 🔐 Permissões (Access Control)

```
Role Hierarchy:
├─ admin
│  ├─ can view all profiles
│  ├─ can view all vettings
│  ├─ can approve/reject vettings
│  ├─ can reassign officers
│  └─ can view all documents
│
├─ vetting-officer
│  ├─ can view assigned vettings
│  ├─ can complete checklists
│  ├─ can update background check
│  ├─ can approve vettings
│  └─ can add notes/comments
│
└─ vendor-manager
   ├─ can view own profiles
   ├─ can view own vetting progress
   ├─ can upload documents
   ├─ cannot approve vettings
   └─ cannot view other vendors' data
```

## 📈 Performance Considerations

```
Optimization Opportunities:
├─ Lazy Loading
│  ├─ Virtual scrolling for large lists (1000+ items)
│  └─ On-demand modal content loading
│
├─ Caching
│  ├─ Cache profiles list (5min TTL)
│  ├─ Cache vettings list (2min TTL)
│  └─ Cache user preferences
│
├─ Memoization
│  ├─ useMemo for filtered lists
│  ├─ useCallback for event handlers
│  └─ React.memo for cards
│
├─ Search/Filter
│  ├─ Debounce search input (300ms)
│  └─ Batch filter updates
│
└─ Bundle Size
   ├─ Code split modals
   └─ Tree-shake unused types
```

---

**Última atualização:** 2026-07-27
**Status:** ✅ Documentação Completa
