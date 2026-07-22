import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import { financialData, dashboardMetrics } from '../../data/dashboardData';
import styles from './DailyFinancialInsights.module.css';

export function DailyFinancialInsights() {
  useViewportAttribute();

  const totalRevenue = financialData.reduce((sum, d) => sum + d.revenue, 0);
  const totalDeliveries = financialData.reduce((sum, d) => sum + d.deliveries, 0);
  const avgRevenuePerDelivery = (totalRevenue / totalDeliveries).toFixed(2);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.header}>
        <h1 className={styles.title}>Daily Financial Insights</h1>
        <p className={styles.subtitle}>Track your financial performance and revenue metrics</p>
      </div>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Revenue (Week)</div>
          <div className={styles.metricValue}>£{totalRevenue.toLocaleString()}</div>
          <div className={styles.metricTrend}>+8.3% from last week</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Deliveries</div>
          <div className={styles.metricValue}>{totalDeliveries.toLocaleString()}</div>
          <div className={styles.metricTrend}>Avg £{avgRevenuePerDelivery} per delivery</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Total Expenses</div>
          <div className={styles.metricValue}>£{(dashboardMetrics.operationalCosts * 7).toLocaleString()}</div>
          <div className={styles.metricTrend}>-3.2% from last week</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Net Profit</div>
          <div className={styles.metricValue}>£{(totalRevenue - (dashboardMetrics.operationalCosts * 7)).toLocaleString()}</div>
          <div className={styles.metricTrend}>+12.1% improvement</div>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Daily Revenue Breakdown</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Profit</th>
                <th>Deliveries</th>
                <th>Avg Value</th>
              </tr>
            </thead>
            <tbody>
              {financialData.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  <td className={styles.positive}>£{row.revenue.toLocaleString()}</td>
                  <td className={styles.negative}>£{row.expenses.toLocaleString()}</td>
                  <td className={styles.positive}>£{(row.revenue - row.expenses).toLocaleString()}</td>
                  <td>{row.deliveries}</td>
                  <td>£{row.avgValue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.contentSection}>
        <h2>Financial Summary</h2>
        <p>This week's financial performance shows strong growth with increased delivery volume and improved operational efficiency.</p>
      </div>
    </div>
  );
}
