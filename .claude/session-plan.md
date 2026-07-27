# Live Service Page — Execution Plan

**Created:** 2026-07-27 14:35 GMT-3  
**Intent Contract:** See `.claude/session-intent.md`  
**Urgency:** High | **Scope:** Clear technical features | **Knowledge:** Building from blueprint

---

## 🎯 What You'll End Up With

A production-ready **Live Service** dashboard page featuring:
- 5 core components (KPI Cards, Operational Map, Exception Triage, Scanner Feed, Team Roster)
- Mock data + TypeScript architecture ready for real API integration
- Full routing + layout integration with existing sp-portal-react patterns
- Ready to replace mock data with live backend APIs

---

## 🚀 How We'll Get There

### Phase Weights & Effort

```
DISCOVER  ████████████ 15%  — Analyze existing patterns & architecture
DEFINE    ██████████████████ 25%  — Specify types, components, structure
DEVELOP   ████████████████████████████████ 45%  — Implement all 5 features
DELIVER   ████████ 15%  — Integrate, test, document
```

---

## Phase Breakdown

### 🔍 DISCOVER (15%) — Architecture & Patterns
**Goal:** Map how sp-portal-react works so we replicate patterns perfectly

**Tasks:**
1. Analyze `/src/pages/DailyOperationsReports` structure
   - Component organization
   - Hook patterns (custom data fetching)
   - CSS/styling approach
   - Mock data strategy
2. Review PortalLayout wrapper
3. Identify real-time data patterns (if any)
4. Map TypeScript type conventions
5. Plan mock data structure (deterministic like `mock-data.ts`)

**Output:**
- Architecture decision document
- Data model diagram
- Component hierarchy sketch

---

### 📋 DEFINE (25%) — Technical Specification
**Goal:** Lock down types, components, and file structure before coding

**Tasks:**
1. **Type Definitions** (`types.ts`)
   - `LiveDelivery` - delivery entity with status
   - `Deliverer` - team member with location, battery
   - `LiveMetrics` - KPI snapshot
   - `ScannerEvent` - audit log entry
   - `Exception` - failed delivery alert
   - `Heatmap` - geographic zone with package density

2. **Component Architecture**
   ```
   /src/pages/LiveService/
   ├── LiveService.tsx (wrapper)
   ├── page.tsx (main container)
   ├── types.ts
   ├── styles.ts
   ├── liveservice.module.css
   ├── components/
   │   ├── LiveKPICards/
   │   ├── OperationalMap/
   │   ├── ExceptionTriage/
   │   ├── ScannerLiveFeed/
   │   └── TeamRoster/
   ├── hooks/
   │   ├── useLiveMetrics.ts
   │   ├── useLiveTracking.ts
   │   ├── useLiveExceptions.ts
   │   ├── useScannerEvents.ts
   │   └── useTeamStatus.ts
   ├── mock-data.ts
   └── README.md
   ```

3. **Mock Data Structure**
   - Deterministic RNG (like existing pattern)
   - 10 deliverers
   - 50 active deliveries
   - 100 recent events (last 2 hours)
   - 5 active exceptions

4. **Hook Specifications** (signatures only)
   - `useLiveMetrics()` → `LiveMetrics`
   - `useLiveTracking()` → `Deliverer[]`
   - `useLiveExceptions()` → `Exception[]`
   - `useScannerEvents()` → `ScannerEvent[]`
   - `useTeamStatus()` → `TeamMember[]`

**Output:**
- Complete `types.ts`
- Component spec document
- Mock data schema
- Directory structure created

---

### 💻 DEVELOP (45%) — Implementation
**Goal:** Build all components, hooks, and integrate into routing

**Phase 1: Infrastructure (8%)**
- Create directory structure
- Set up types.ts
- Implement mock-data.ts
- Create hooks skeleton
- Routing in App.tsx

**Phase 2: Components & Hooks (25%)**
1. **LiveKPICards** (Metrics)
   - 4 cards: Total, Progress %, Success Rate, Avg Time
   - Real-time update simulation (setInterval)
   - Lucide icons + Tailwind styling

2. **useLiveMetrics** hook
   - Calculate total deliveries
   - Calculate % complete
   - Calculate success/failed/pending ratio
   - Calculate avg time between scans
   - Update every 2 seconds (mock)

3. **OperationalMap** (Geography)
   - Mock map container (prepare for Leaflet later)
   - Display deliverer positions (lat/lng mock)
   - Color coding: green (on time), yellow (delayed), red (stalled)
   - Heatmap overlay (zones with high package density)

4. **useLiveTracking** hook
   - Generate mock locations (São Paulo grid)
   - Calculate status based on time at location
   - Random movement simulation

5. **ExceptionTriage** (Alerts)
   - Sortable list of active exceptions
   - Click to expand details
   - Shows: Package ID, Customer, Address, Reason, Time Since
   - Action buttons (Call, Reassign, Manual Check)

6. **useLiveExceptions** hook
   - Track exceptions by type
   - Update as events stream in

7. **ScannerLiveFeed** (Audit Log)
   - Scrolling feed of recent events
   - Format: `HH:MM - [Deliverer] scanned #PKGID (Status)`
   - Show last 20 events
   - Scroll to latest on new event

8. **useScannerEvents** hook
   - Generate mock events (bimodal: 3-5 events per deliverer per 2 min)
   - Return sorted by timestamp descending

9. **TeamRoster** (Status Table)
   - Columns: Name, Status, Packages (45/60), Battery (85%), Avg Time
   - Sortable by each column
   - Color-code status (Green=Active, Yellow=Break, Red=Offline)
   - Drag-and-drop prep (CSS ready, UX indicator)

10. **useTeamStatus** hook
    - Return deliverers with calculated metrics
    - Track battery (mock: random 20-95%)
    - Track package counts (assigned vs. delivered)

**Phase 3: Integration (12%)**
- Page.tsx container (state management)
- Layout configuration (full-width, 2-column grid for map)
- CSS module styling (dark theme + indigo accent)
- Exception triage sidebar behavior
- Feed auto-scroll behavior
- Performance optimization (memoization)
- Routing in App.tsx

---

### ✅ DELIVER (15%) — Validation & Documentation
**Goal:** Ensure production readiness and document everything

**Tasks:**
1. **Functional Testing**
   - All 5 sections visible and styled
   - Mock data updates realistically
   - No TypeScript errors
   - No console warnings
   - Responsive on mobile (if applicable)

2. **Integration Testing**
   - Route loads correctly (`/live-service`)
   - PortalLayout wraps properly
   - Navigation works
   - No prop-drilling issues

3. **Code Quality**
   - Linting passes (oxlint)
   - No unused imports
   - Comments only where WHY is non-obvious
   - Consistent with project style

4. **Documentation**
   - **README.md**: Overview + component guide
   - **types.ts**: Inline comments for complex types
   - **Inline comments**: Only for hidden constraints
   - **Integration guide**: How to swap mock data for real APIs

5. **Handoff**
   - Component library (reusable pieces)
   - Mock data exportable
   - API contract template
   - Test instructions

**Output:**
- All components passing visual inspection
- Documentation in `/pages/LiveService/README.md`
- Ready for `/octo:embrace` phase

---

## 🛠️ Execution Commands

Execute this plan using:

```bash
# Run all phases in sequence (recommended)
/octo:embrace "Implement Live Service dashboard with KPI cards, operational map, exception triage, scanner feed, and team roster"

# Or run individual phases
/octo:discover  # Architecture analysis
/octo:define    # Technical specification
/octo:develop   # Implementation
/octo:deliver   # Validation & documentation
```

---

## 📦 Provider Requirements

- 🔵 **Claude:** Available ✓ (primary execution)
- 🔴 **Codex CLI:** Not installed (not needed)
- 🟡 **Gemini CLI:** Not installed (not needed)

---

## 🎯 Success Criteria

### Must Pass
- ✅ All 5 components render without errors
- ✅ Mock data updates realistically (every 2s)
- ✅ TypeScript strict mode (no `@ts-ignore`)
- ✅ Routes to `/live-service` correctly
- ✅ Uses PortalLayout wrapper
- ✅ Follows existing code patterns

### Nice to Have
- ✅ Drag-and-drop preview (CSS ready)
- ✅ Responsive design
- ✅ Animation hints for real-time feel
- ✅ Comprehensive README

### Not Required Yet
- WebSocket integration (structure for it)
- Real Leaflet map (mock container ready)
- Database persistence
- Authentication overrides

---

## 📋 Key Decisions

| Decision | Rationale | Alternative |
|----------|-----------|-------------|
| **Mock data only** | Fast delivery, API-ready structure | Real backend (slower) |
| **React hooks only** | Keep it simple, no Redux | Context + Redux (overkill) |
| **Tailwind + CSS Modules** | Match existing project | Styled components (mismatch) |
| **No drag-and-drop library yet** | CSS prep only, add `react-beautiful-dnd` later | Full implementation now (slower) |
| **Deterministic RNG** | Reproducible testing | Random (harder to debug) |

---

## ⏱️ Timeline Estimate

- **Discover:** 30-45 min (explore patterns)
- **Define:** 45-60 min (spec + types)
- **Develop:** 120-180 min (4-5 components, hooks, integration)
- **Deliver:** 30-45 min (tests, docs)
- **Total:** 3.5-5.5 hours

---

## 🚦 Next Steps

1. **Review this plan** — Does it match your vision?
2. **Adjust if needed** — Phase weights? Scope?
3. **Execute with `/octo:embrace`** when ready
4. **Live Service page launches** with production-ready architecture

---

**This plan is saved.** Run `/octo:embrace` to begin execution with all phases guided and tracked.

