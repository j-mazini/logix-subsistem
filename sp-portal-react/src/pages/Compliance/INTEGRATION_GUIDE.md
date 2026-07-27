# 🔗 Guia de Integração - Página de Compliance

## 1️⃣ Adicionar Rota na Aplicação

### Em `src/App.tsx` ou seu arquivo de rotas

```tsx
import { Compliance } from './pages/Compliance/Compliance';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Outras rotas */}
        <Route path="/compliance" element={<Compliance />} />
        {/* ... */}
      </Routes>
    </BrowserRouter>
  );
}
```

## 2️⃣ Adicionar ao Menu/Navigation

### Em `src/layout/BeamSidebar.tsx` ou componente de menu

```tsx
import { Link } from 'react-router-dom';

export function BeamSidebar() {
  return (
    <aside className="sidebar">
      <nav>
        {/* Outros links */}
        <Link to="/compliance" className="nav-item">
          <i className="bi bi-shield-check" />
          <span>Compliance</span>
        </Link>
        {/* ... */}
      </nav>
    </aside>
  );
}
```

## 3️⃣ Integração com Vendor Page

### Escutar eventos de Compliance em `VendorPerformance.tsx`

```tsx
import { useEffect, useState } from 'react';

export function VendorPerformance() {
  const [vendorAccess, setVendorAccess] = useState<Record<string, string>>({});

  useEffect(() => {
    // Listener para quando compliance é atualizado
    const handleComplianceUpdate = (event: Event) => {
      const { profileId, vendorAccess: access } = (event as CustomEvent).detail;
      
      setVendorAccess(prev => ({
        ...prev,
        [profileId]: access
      }));

      // Opcionalmente, refetch dados do vendor
      console.log(`[Vendor] Compliance updated for ${profileId}: ${access}`);
    };

    window.addEventListener('compliance-updated', handleComplianceUpdate);

    return () => {
      window.removeEventListener('compliance-updated', handleComplianceUpdate);
    };
  }, []);

  return (
    <div className="vendor-page">
      {/* Render vendor data considering vendorAccess */}
      {/* Dados restritos se vendorAccess === 'restricted' ou 'none' */}
    </div>
  );
}
```

## 4️⃣ Integração com API Backend

### Substituir Mock Data no `useComplianceState.ts`

```tsx
// Antes (mock data)
const mockProfiles: UserProfile[] = [
  { id: 'profile-1', name: 'João Silva', ... }
];

// Depois (API call)
const loadData = async () => {
  try {
    const [profilesRes, vettingsRes] = await Promise.all([
      fetch('/api/compliance/profiles'),
      fetch('/api/compliance/vetting')
    ]);

    const profiles = await profilesRes.json();
    const vettings = await vettingsRes.json();

    setState(prev => ({
      ...prev,
      profiles,
      vettings,
      loading: false,
    }));
  } catch (error) {
    setState(prev => ({
      ...prev,
      error: error.message,
      loading: false,
    }));
  }
};
```

### Endpoints esperados

```
GET    /api/compliance/profiles               # Listar perfis
GET    /api/compliance/profiles/:id           # Detalhe do perfil
POST   /api/compliance/profiles/:id/documents # Upload de documento
PATCH  /api/compliance/profiles/:id           # Atualizar perfil

GET    /api/compliance/vetting                # Listar vettings
GET    /api/compliance/vetting/:id            # Detalhe do vetting
POST   /api/compliance/vetting/:id/checklist  # Atualizar checklist
PATCH  /api/compliance/vetting/:id            # Atualizar status
POST   /api/compliance/vetting/:id/approve    # Aprovar vetting
POST   /api/compliance/vetting/:id/reject     # Rejeitar vetting
```

## 5️⃣ Integração com Authentication

### Verificar Permissões em `Compliance.tsx`

```tsx
import { useAuth } from './hooks/useAuth'; // Seu hook de auth

export function Compliance() {
  const { user, hasPermission } = useAuth();

  if (!user || !hasPermission('compliance:view')) {
    return <Unauthorized />;
  }

  return (
    <PortalLayout>
      {/* ... */}
    </PortalLayout>
  );
}
```

### Controlar Ações por Permissão

```tsx
// Em VettingDetail.tsx
{vetting.status !== 'completed' && vetting.status !== 'rejected' && (
  <>
    {hasPermission('compliance:reject') && (
      <button onClick={handleRejectVetting}>Rejeitar</button>
    )}
    {hasPermission('compliance:approve') && (
      <button onClick={handleCompleteVetting}>Aprovar</button>
    )}
  </>
)}
```

## 6️⃣ Integração com Notificações

### Emitir notificações ao completar vetting

```tsx
import { useNotification } from './hooks/useNotification';

export function VettingDetail({ vetting, onClose, ...props }) {
  const { notify } = useNotification();

  const handleCompleteVetting = () => {
    onUpdateVetting(vetting.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
    });

    // Notificar sucesso
    notify({
      type: 'success',
      message: 'Vetting concluído com sucesso',
      duration: 5000,
    });

    onClose();
  };

  // ...
}
```

## 7️⃣ Integração com Analytics/Tracking

### Rastrear ações na página

```tsx
import { useAnalytics } from './hooks/useAnalytics';

export function Compliance() {
  const { track } = useAnalytics();

  const conditionalRedirect = useConditionalRedirect({
    onTabChange: (tab) => {
      setActiveTab(tab);
      track('compliance_tab_changed', { tab });
    },
    // ...
  });

  // ...
}
```

## 8️⃣ Integração com Search/Indexing

### Indexar perfis no search

```tsx
import { useSearch } from './hooks/useSearch';

export function ProfilesList({ profiles, ...props }) {
  const { indexDocument } = useSearch();

  useEffect(() => {
    // Indexar cada perfil para busca global
    profiles.forEach(profile => {
      indexDocument({
        id: `profile-${profile.id}`,
        title: profile.name,
        description: `Driver profile for ${profile.vendor}`,
        url: `/compliance?profile=${profile.id}`,
        category: 'compliance',
        metadata: {
          vendor: profile.vendor,
          status: profile.vettingStatus,
        }
      });
    });
  }, [profiles]);

  // ...
}
```

## 9️⃣ Integração com File Upload

### Implementar upload de documentos

```tsx
import { useState } from 'react';

interface ProfileDetailProps {
  profile: UserProfile;
  onUpdate: (profileId: string, updates: Partial<UserProfile>) => void;
  // ...
}

export function ProfileDetail({ profile, onUpdate, ...props }: ProfileDetailProps) {
  const [uploading, setUploading] = useState(false);

  const handleDocumentUpload = async (file: File) => {
    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'id'); // ou outro tipo

      const response = await fetch(
        `/api/compliance/profiles/${profile.id}/documents`,
        {
          method: 'POST',
          body: formData,
        }
      );

      const document = await response.json();

      onUpdate(profile.id, {
        documents: [...profile.documents, document],
      });

      notify({
        type: 'success',
        message: 'Documento enviado com sucesso',
      });
    } catch (error) {
      notify({
        type: 'error',
        message: 'Erro ao enviar documento',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {uploading && <LoadingSpinner />}
      <input
        type="file"
        onChange={(e) => e.target.files && handleDocumentUpload(e.target.files[0])}
        disabled={uploading}
      />
    </div>
  );
}
```

## 🔟 Integração com Background Check Service

### Verificar status do background check em tempo real

```tsx
import { useEffect } from 'react';

export function VettingDetail({ vetting, ...props }) {
  useEffect(() => {
    // Verificar status do background check periodicamente
    const interval = setInterval(async () => {
      if (vetting.backgroundCheck.status !== 'pending') return;

      const response = await fetch(
        `/api/compliance/vetting/${vetting.id}/background-check/status`
      );

      const bgCheck = await response.json();

      if (bgCheck.status !== vetting.backgroundCheck.status) {
        // Atualizar quando mudar
        onUpdateVetting(vetting.id, {
          backgroundCheck: bgCheck,
        });

        notify({
          type: 'info',
          message: `Background check status: ${bgCheck.status}`,
        });
      }
    }, 30000); // Check a cada 30 segundos

    return () => clearInterval(interval);
  }, [vetting.id, vetting.backgroundCheck.status]);

  // ...
}
```

## 1️⃣1️⃣ Exemplo Completo de Integração

```tsx
// Em src/App.tsx
import { Compliance } from './pages/Compliance/Compliance';
import { useAuth } from './hooks/useAuth';
import { useNotification } from './hooks/useNotification';

function App() {
  const { user } = useAuth();
  const { notify } = useNotification();

  // Setup global compliance listeners
  useEffect(() => {
    window.addEventListener('compliance-conditional-redirect', (e: any) => {
      console.log('[App] Compliance redirect:', e.detail);
    });

    window.addEventListener('compliance-updated', (e: any) => {
      const { profileId, status, vendorAccess } = e.detail;
      
      // Notificar mudança
      notify({
        type: 'info',
        message: `Compliance atualizado para ${profileId}`,
      });

      // Atualizar dados globais se necessário
      // dispatch(updateVendorAccess(profileId, vendorAccess));
    });

    window.addEventListener('compliance-loaded', (e: any) => {
      console.log('[App] Compliance loaded:', e.detail);
    });

    return () => {
      window.removeEventListener('compliance-conditional-redirect', () => {});
      window.removeEventListener('compliance-updated', () => {});
      window.removeEventListener('compliance-loaded', () => {});
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/compliance" element={<Compliance />} />
        {/* Outras rotas */}
      </Routes>
    </BrowserRouter>
  );
}
```

## 📋 Checklist de Integração

- [ ] Rota adicionada ao router
- [ ] Link no menu de navegação
- [ ] Eventos de Compliance escutados em outras páginas
- [ ] API endpoints implementados no backend
- [ ] Authentication/permissions configurados
- [ ] Notificações integradas
- [ ] Upload de documentos funcional
- [ ] Background check integration
- [ ] Analytics/tracking configurado
- [ ] Tests escrito e passando
- [ ] Deploy realizado

## 🚀 Próximos Passos

1. **Backend**: Implementar endpoints da API
2. **Database**: Criar schema para profiles, vettings, documents
3. **Workers**: Setup job workers para background checks
4. **Email**: Implementar notificações por email
5. **Reports**: Adicionar exportação de relatórios
6. **Dashboard**: Criar dashboard executivo com métricas

---

**Data:** 2026-07-27
**Versão:** 1.0.0
