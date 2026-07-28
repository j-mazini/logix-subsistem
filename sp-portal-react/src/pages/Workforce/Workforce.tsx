import { useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import { useComplianceState } from '../Compliance/hooks/useComplianceState';
import { useConditionalRedirect } from '../Compliance/hooks/useConditionalRedirect';
import { useVendorSync } from '../Compliance/hooks/useVendorSync';
import { ComplianceStats } from '../Compliance/components/ComplianceStats';
import { WorkforceTabs } from './WorkforceTabs';
import { isWorkforceTab, type WorkforceTab } from '../Compliance/types/compliance';
import { useAnnouncements } from '../../context/AnnouncementsContext';
import { getAllMockVendors } from '../../data/vendorsData';
import { useCurrentSp } from '../../hooks/useCurrentSp';
import '../Compliance/Compliance.css';

/**
 * Workforce — a página única que juntou os ecrãs de Vendors, Compliance e
 * Vetting em três abas.
 *
 * Cada aba monta o ecrã original, não uma cópia: `vendors` monta o corpo do
 * antigo /vendors e `vetting` monta a página real de Vetting. As rotas
 * antigas redirecionam para cá com `?tab=` pré-seleccionada.
 */
export function Workforce() {
  const complianceState = useComplianceState();
  const { state, selectProfile, setActiveTab, ...actions } = complianceState;
  const { syncComplianceFromProfiles } = useAnnouncements();
  const sp = useCurrentSp();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  // URL → estado. É por aqui que os redirects de /vendors, /compliance e
  // /vetting-dashboard chegam à aba certa.
  useEffect(() => {
    if (isWorkforceTab(tabParam) && tabParam !== state.activeTab) {
      setActiveTab(tabParam);
    }
    // `state.activeTab` fora das dependências de propósito: só a mudança do
    // parâmetro deve forçar a aba, senão trocar de aba na UI era desfeito
    // pelo efeito no render seguinte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam, setActiveTab]);

  // Estado → URL, para a aba aberta ser partilhável e sobreviver ao refresh.
  const handleTabChange = useCallback(
    (tab: WorkforceTab) => {
      setActiveTab(tab);
      const next = new URLSearchParams(searchParams);
      next.set('tab', tab);
      setSearchParams(next, { replace: true });
    },
    [setActiveTab, searchParams, setSearchParams],
  );

  const conditionalRedirect = useConditionalRedirect({
    vettings: state.vettings,
    onTabChange: handleTabChange,
    onSelectProfile: selectProfile,
    onOpenProfileDetail: actions.openProfileDetailModal,
  });

  // Mantém a página Vendor sincronizada a partir dos dados reais de Vetting
  useVendorSync();

  // Alertas e contagem regressiva do cabeçalho: derivados no contexto a
  // partir dos perfis desta página, para reflectirem edições locais.
  useEffect(() => {
    syncComplianceFromProfiles(state.profiles);
  }, [state.profiles, syncComplianceFromProfiles]);

  // Evento de integração herdado da página Compliance. Nada no portal o
  // escuta hoje, mas está documentado como ponto de extensão — mantido com o
  // mesmo nome para não partir listeners externos.
  useEffect(() => {
    if (!state.loading) {
      window.dispatchEvent(
        new CustomEvent('compliance-loaded', {
          detail: {
            totalProfiles: state.profiles.length,
            totalVettings: state.vettings.length,
            timestamp: new Date().toISOString(),
          },
        }),
      );
    }
  }, [state.loading, state.profiles.length, state.vettings.length]);

  const vendorCount = getAllMockVendors().filter((v) => v.serviceProvider === sp).length;

  return (
    <PortalLayout
      pageClassName="compliance-page workforce-page"
      mainClassName="compliance-container container-fluid px-3 px-lg-4 py-4"
      title="Workforce"
    >
      {state.loading && (
        <div className="compliance-loading">
          <div className="spinner" />
          <p>Loading workforce data…</p>
        </div>
      )}

      {state.error && (
        <div className="compliance-error">
          <p>
            <i className="bi bi-exclamation-circle" /> {state.error}
          </p>
        </div>
      )}

      {!state.loading && !state.error && (
        <>
          <div className="compliance-header">
            <div className="page-header-welcome-text">
              <p className="page-header-date">
                <i className="bi bi-people" />
                <span>Vendors, compliance documents and driver vetting.</span>
              </p>
            </div>
          </div>

          {/* Os KPIs são os do Compliance; Vendors e Vetting trazem os seus. */}
          {state.activeTab === 'compliance' && (
            <ComplianceStats
              profiles={state.profiles}
              vettings={state.vettings}
              activeTab={state.activeTab}
              onTabChange={handleTabChange}
            />
          )}

          <WorkforceTabs
            state={state}
            vendorCount={vendorCount}
            actions={{
              ...actions,
              selectProfile,
              setActiveTab: handleTabChange,
              handleOpenProfile: conditionalRedirect.handleOpenProfile,
              isVettingPending: conditionalRedirect.isVettingPending,
              getVettingProgress: conditionalRedirect.getVettingProgress,
            }}
          />
        </>
      )}
    </PortalLayout>
  );
}
