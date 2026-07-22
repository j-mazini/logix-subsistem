import { useState } from 'react';
import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import { dashboardMetrics, routeMetrics } from '../../data/dashboardData';
import styles from './Dashboard.module.css';

const KPI_DATA = [
  { id: 'spr', value: '92.5', label: 'SPR', icon: 'bi-graph-up-arrow' },
  { id: 'spohr', value: '156', label: 'SPOH-R', icon: 'bi-speedometer2' },
  { id: 'routes', value: '42', label: 'TOTAL ROUTES', icon: 'bi-signpost-2-fill' },
  { id: 'stops', value: '1,247', label: 'TOTAL STOPS', icon: 'bi-geo-alt-fill' },
  { id: 'vendors', value: '18', label: 'ACTIVE VENDORS', icon: 'bi-people-fill' },
  { id: 'loops', value: '24', label: 'ACTIVE LOOPS', icon: 'bi-arrow-repeat' },
];

const COMPLIANCE_DATA = [
  {
    course: 'cargo',
    title: 'Cargo Training',
    icon: 'bi-box-seam',
    expiring: ['John Smith', 'Maria Santos'],
    expired: ['James Wilson'],
  },
  {
    course: 'dangerous',
    title: 'Dangerous Goods',
    icon: 'bi-exclamation-octagon',
    expiring: ['Ana Ferreira', 'Michael Brown'],
    expired: [],
  },
  {
    course: 'manual',
    title: 'Manual Handling',
    icon: 'bi-hand-index',
    expiring: [],
    expired: ['Sofia Rodrigues'],
  },
];

const MODAL_SLIDES = [
  { id: 0, title: 'KPIs', icon: 'bi-graph-up-arrow' },
  { id: 1, title: 'Compliance', icon: 'bi-shield-check' },
  { id: 2, title: 'Drivers', icon: 'bi-file-earmark-medical' },
  { id: 3, title: 'Vehicles', icon: 'bi-truck' },
];

export function Dashboard() {
  useViewportAttribute();
  const [showModal, setShowModal] = useState(false);
  const [modalSlide, setModalSlide] = useState(0);
  const [depotFilter, setDepotFilter] = useState('all');
  const [loopFilter, setLoopFilter] = useState('all');

  return (
    <div className={styles.dashboardContainer}>
      {/* Header */}
      <div className={styles.adminHeader}>
        <h1 className={styles.adminHeaderTitle}>Dashboard</h1>
        <div className={styles.adminHeaderUserPill}>
          <span className={styles.adminHeaderUserName}>BA Express</span>
          <i className="bi bi-chevron-down" aria-hidden="true"></i>
        </div>
      </div>

      {/* Dashboard Header */}
      <div className={styles.dashboardHeader}>
        <div className={styles.dashboardHeaderTop}>
          <div className={styles.titleWrap}>
            <div className={styles.titleIcon}>
              <i className="bi bi-grid-1x2-fill"></i>
            </div>
            <div className={styles.titleTextGroup}>
              <span className={styles.titleSub}>Service Provider Portal</span>
            </div>
          </div>

          {/* Announcements Box */}
          <div className={styles.announcementBox}>
            <div className={styles.announcementCard}>
              <div className={styles.announcementHead}>
                <h3 className={styles.announcementTitle}>
                  <i className="bi bi-megaphone-fill"></i> Announcements
                </h3>
                <p className={styles.announcementDesc}>Announcements from DHL appear here.</p>
              </div>
              <div className={styles.announcementBody}>
                <button className={styles.announcementTrigger}>
                  <span className={styles.announcementText}>No announcements yet.</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disco Block (My Deliveries) */}
      <section className={styles.dashboardSection} aria-label="My deliveries">
        <div className={styles.dashboardBlock}>
          <div className={styles.blockHeader}>
            <div>
              <h2 className={styles.blockTitle}>
                <i className="bi bi-truck"></i> My deliveries
              </h2>
              <p className={styles.blockDesc}>These are your operations today! We already organised it for you!</p>
            </div>
            <div className={styles.headerControls}>
              <div className={styles.stopsKpi}>
                <span className={styles.stopsLabel}>Stops</span>
                <span className={styles.stopsValue}>{dashboardMetrics.activeDeliveries}</span>
              </div>
              <div className={styles.amPmSwitch} role="group">
                <button className={`${styles.gravura} ${styles.active}`}>AM</button>
                <button className={styles.gravura}>PM</button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Depot</span>
              <div className={styles.chips}>
                <button className={depotFilter === 'all' ? styles.chipActive : styles.chip}
                  onClick={() => setDepotFilter('all')}>All</button>
                <button className={depotFilter === 'mse' ? styles.chipActive : styles.chip}
                  onClick={() => setDepotFilter('mse')}>MSE</button>
                <button className={depotFilter === 'lcy' ? styles.chipActive : styles.chip}
                  onClick={() => setDepotFilter('lcy')}>LCY</button>
              </div>
            </div>
            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Loop</span>
              <div className={styles.chips}>
                <button className={loopFilter === 'all' ? styles.chipActive : styles.chip}
                  onClick={() => setLoopFilter('all')}>All</button>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className={styles.blockContent}>
            <div className={styles.summaryBlock}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryCardHeader}>
                  <h3 className={styles.summaryTitle}>Summary</h3>
                </div>
                <div className={styles.summaryCardBody}>
                  <div className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                      <div className={styles.metricLabel}>Active Deliveries</div>
                      <div className={styles.metricValue}>{dashboardMetrics.activeDeliveries.toLocaleString()}</div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricLabel}>Routes Running</div>
                      <div className={styles.metricValue}>{dashboardMetrics.routesRunning}</div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricLabel}>Fleet Status</div>
                      <div className={styles.metricValue}>{dashboardMetrics.fleetStatus}%</div>
                    </div>
                    <div className={styles.metricCard}>
                      <div className={styles.metricLabel}>On-Time Rate</div>
                      <div className={styles.metricValue}>{dashboardMetrics.onTimeRate}%</div>
                    </div>
                  </div>

                  {/* Network & Delays */}
                  <div className={styles.networkDelayBox}>
                    <div className={styles.networkDelayCardInner}>
                      <div className={styles.networkDelayCardHeader}>
                        <span className={styles.networkDelayCardTitle}>
                          <i className="bi bi-wifi"></i> Network & Delays
                        </span>
                      </div>
                      <div className={styles.networkDelayCardBody}>
                        <div className={styles.networkDelayEmpty}>
                          <span>No notifications yet.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className={styles.blockFooter}>
            <button className={styles.fullDashboardBtn} onClick={() => setShowModal(true)}>
              <i className="bi bi-expand"></i> View Full Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Full Dashboard Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Full dashboard</h2>
              <div className={styles.modalCategoryDots}>
                {MODAL_SLIDES.map((slide) => (
                  <button
                    key={slide.id}
                    className={`${styles.categoryDot} ${modalSlide === slide.id ? styles.active : ''}`}
                    onClick={() => setModalSlide(slide.id)}
                    title={slide.title}
                  >
                    <i className={`bi ${slide.icon}`}></i>
                  </button>
                ))}
              </div>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Slide 0: KPIs */}
              {modalSlide === 0 && (
                <section className={styles.modalSlide}>
                  <h3 className={styles.slideTitle}>
                    <i className="bi bi-graph-up-arrow"></i> KPIs
                  </h3>
                  <div className={styles.kpiGrid}>
                    {KPI_DATA.map((kpi) => (
                      <div key={kpi.id} className={styles.kpiCard}>
                        <div className={`${styles.kpiIconWrap} ${styles[`kpi-${kpi.id}`]}`}>
                          <i className={`bi ${kpi.icon}`}></i>
                        </div>
                        <div className={styles.kpiContent}>
                          <span className={styles.kpiValue}>{kpi.value}</span>
                          <span className={styles.kpiLabel}>{kpi.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Slide 1: Compliance */}
              {modalSlide === 1 && (
                <section className={styles.modalSlide}>
                  <h3 className={styles.slideTitle}>
                    <i className="bi bi-shield-check"></i> Compliance
                  </h3>
                  <div className={styles.complianceGrid}>
                    {COMPLIANCE_DATA.map((item) => (
                      <div key={item.course} className={styles.complianceCard}>
                        <div className={styles.complianceCardHeader}>
                          <i className={`bi ${item.icon}`}></i>
                          <h3>{item.title}</h3>
                        </div>
                        <div className={styles.complianceCardBody}>
                          {item.expiring.length > 0 && (
                            <div className={styles.complianceGroup}>
                              <h4><i className="bi bi-exclamation-triangle"></i> Expiring</h4>
                              <ul>
                                {item.expiring.map((vendor) => (
                                  <li key={vendor}>{vendor}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {item.expired.length > 0 && (
                            <div className={styles.complianceGroup}>
                              <h4><i className="bi bi-x-circle"></i> Expired</h4>
                              <ul>
                                {item.expired.map((vendor) => (
                                  <li key={vendor}>{vendor}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Slide 2: Drivers */}
              {modalSlide === 2 && (
                <section className={styles.modalSlide}>
                  <h3 className={styles.slideTitle}>
                    <i className="bi bi-file-earmark-medical"></i> Drivers with expiring or expired documents
                  </h3>
                  <div className={styles.tableResponsive}>
                    <table className={styles.discoTable}>
                      <thead>
                        <tr>
                          <th>Driver</th>
                          <th>Depot</th>
                          <th>Document</th>
                          <th>Date</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>John Smith</td>
                          <td>MSE</td>
                          <td>License</td>
                          <td>2026-02-15</td>
                          <td><span className={styles.badgeExpiring}>Expiring</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Slide 3: Vehicles */}
              {modalSlide === 3 && (
                <section className={styles.modalSlide}>
                  <h3 className={styles.slideTitle}>Vehicles requiring attention</h3>
                  <div className={styles.tableResponsive}>
                    <table className={styles.discoTable}>
                      <thead>
                        <tr>
                          <th>VRN</th>
                          <th>Brand</th>
                          <th>Model</th>
                          <th>Registration Date</th>
                          <th>Depot</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>AB12 CDE</td>
                          <td>Volkswagen</td>
                          <td>Crafter</td>
                          <td>2025-11-15</td>
                          <td>MSE</td>
                          <td>MOT Due</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
