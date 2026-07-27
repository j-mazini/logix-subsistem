import { useEffect, useMemo } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useComplianceState } from './hooks/useComplianceState';
import { useConditionalRedirect } from './hooks/useConditionalRedirect';
import { useVendorSync } from './hooks/useVendorSync';
import { ComplianceTabs } from './components/ComplianceTabs';
import { ComplianceStats } from './components/ComplianceStats';
import { getExpiredDocumentAlerts } from './utils/expirationUtils';
import { useAnnouncements } from '../../context/AnnouncementsContext';
import './Compliance.css';

/**
 * Compliance Page - Main Container
 *
 * Responsibilities:
 * 1. Manage global page state (useComplianceState)
 * 2. Implement the conditional redirect logic (useConditionalRedirect)
 * 3. Render the Profiles / Vetting tabs (the Vetting tab embeds the real
 *    Vetting page — same one used at /vetting-dashboard)
 * 4. Emit events for integration with other pages (e.g. Vendor)
 */
export function Compliance() {
  const complianceState = useComplianceState();
  const { state, selectProfile, setActiveTab, ...actions } = complianceState;
  const { setComplianceAlerts } = useAnnouncements();

  // Setup do hook de redirect condicional
  const conditionalRedirect = useConditionalRedirect({
    vettings: state.vettings,
    onTabChange: setActiveTab,
    onSelectProfile: selectProfile,
    onOpenProfileDetail: actions.openProfileDetailModal,
  });

  // Syncs the Vendor page from real Vetting data
  useVendorSync();

  // Calcular alertas de documentos vencidos
  const expiredDocumentAlerts = useMemo(
    () => getExpiredDocumentAlerts(state.profiles),
    [state.profiles],
  );

  // Atualizar alertas no contexto
  useEffect(() => {
    setComplianceAlerts(expiredDocumentAlerts);
  }, [expiredDocumentAlerts, setComplianceAlerts]);

  // Emit event once loading has finished
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

  return (
    <PortalLayout
      pageClassName="compliance-page"
      mainClassName="compliance-container container-fluid px-3 px-lg-4 py-4"
      title="Compliance"
    >
      {/* Loading overlay */}
      {state.loading && (
        <div className="compliance-loading">
          <div className="spinner" />
          <p>Loading compliance data…</p>
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="compliance-error">
          <p>
            <i className="bi bi-exclamation-circle" /> {state.error}
          </p>
        </div>
      )}

      {!state.loading && !state.error && (
        <>
          {/* Page header */}
          <div className="compliance-header">
            <div className="page-header-welcome-text">
              <p className="page-header-date">
                <i className="bi bi-shield-check" />
                <span>Manage user profiles, documents and compliance processes.</span>
              </p>
            </div>
          </div>

          {/* Stats section — only for the Profiles tab; the Vetting tab
              has its own KPIs (the real Vetting page) */}
          {state.activeTab === 'profiles' && (
            <ComplianceStats
              profiles={state.profiles}
              vettings={state.vettings}
              activeTab={state.activeTab}
              onTabChange={setActiveTab}
            />
          )}

          {/* Main tabs */}
          <ComplianceTabs
            state={state}
            actions={{
              ...actions,
              selectProfile,
              setActiveTab,
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
