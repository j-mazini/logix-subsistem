import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Battery, Package } from 'lucide-react';
import { TeamMember } from '../../types';
import styles from './TeamRoster.module.css';

interface Props {
  team: TeamMember[];
}

type SortField = 'name' | 'status' | 'totalDelivered' | 'batteryLevel' | 'avgTimePerStop';
type SortOrder = 'asc' | 'desc';

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  break: '#f59e0b',
  returning: '#3b82f6',
  offline: '#6b7280',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'On Route',
  break: 'Break',
  returning: 'Returning',
  offline: 'Offline',
};

const getStatusColor = (status: string) => STATUS_COLORS[status] || '#6b7280';
const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

const getBatteryColor = (level: number) => (level > 50 ? '#10b981' : level > 20 ? '#f59e0b' : '#ef4444');

export const TeamRoster = React.memo(function TeamRoster({ team }: Props) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedTeam = useMemo(() => {
    return [...team].sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      if (sortField === 'name') {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [team, sortField, sortOrder]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className={styles.sortIconPlaceholder} />;
    return sortOrder === 'asc' ? <ChevronUp className={styles.sortIcon} /> : <ChevronDown className={styles.sortIcon} />;
  };

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.rosterHeader}>
        <h3>Team Status</h3>
        <span className={styles.badge}>{team.length} active</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('name')}>
                  Name <SortIcon field="name" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('totalDelivered')}>
                  Delivered <SortIcon field="totalDelivered" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('batteryLevel')}>
                  <Battery className={styles.headerIcon} /> Battery <SortIcon field="batteryLevel" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('avgTimePerStop')}>
                  Avg Time <SortIcon field="avgTimePerStop" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTeam.map((member, index) => (
              <tr
                key={member.id}
                className={styles.tr}
                style={{ '--i': Math.min(index, 10) } as React.CSSProperties}
              >
                <td className={styles.td}>
                  <div className={styles.nameCell}>
                    <span
                      className={styles.avatar}
                      style={{ boxShadow: `0 0 0 2px ${getStatusColor(member.status)}` }}
                    >
                      {getInitials(member.name)}
                    </span>
                    <span className={styles.name}>{member.name}</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.statusBadge}>
                    <div
                      className={styles.statusDot}
                      style={{ backgroundColor: getStatusColor(member.status) }}
                    ></div>
                    <span className={styles.statusLabel}>{getStatusLabel(member.status)}</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.packagesMetric}>
                    <Package className={styles.metricIcon} />
                    <span>
                      {member.totalDelivered}/{member.totalAssigned}
                    </span>
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.batteryMeter}>
                    <div className={styles.batteryBackground}>
                      <div
                        className={styles.batteryFill}
                        style={{
                          width: `${member.batteryLevel}%`,
                          backgroundColor: getBatteryColor(member.batteryLevel),
                        }}
                      ></div>
                    </div>
                    <span className={styles.batteryText}>{Math.round(member.batteryLevel)}%</span>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.time}>{member.avgTimePerStop.toFixed(1)} min</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.rosterFooter}>
        <p className={styles.footerNote}>
          💡 Tip: You'll be able to drag deliveries between couriers to reassign loads (coming soon)
        </p>
      </div>
    </div>
  );
});
