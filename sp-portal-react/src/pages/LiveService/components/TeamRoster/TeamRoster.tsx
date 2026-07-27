import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Battery, Package } from 'lucide-react';
import { TeamMember } from '../../types';
import styles from './TeamRoster.module.css';

interface Props {
  team: TeamMember[];
}

type SortField = 'name' | 'status' | 'totalDelivered' | 'batteryLevel' | 'avgTimePerStop';
type SortOrder = 'asc' | 'desc';

export function TeamRoster({ team }: Props) {
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

  const sortedTeam = [...team].sort((a, b) => {
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: '#10b981',
      break: '#f59e0b',
      returning: '#3b82f6',
      offline: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      active: 'Em Rota',
      break: 'Pausa',
      returning: 'Retornando',
      offline: 'Offline',
    };
    return labels[status] || status;
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <div className={styles.sortIconPlaceholder} />;
    return sortOrder === 'asc' ? <ChevronUp className={styles.sortIcon} /> : <ChevronDown className={styles.sortIcon} />;
  };

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.rosterHeader}>
        <h3>Raio-X da Equipe — Status da Operação</h3>
        <span className={styles.badge}>{team.length} ativos</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('name')}>
                  Nome <SortIcon field="name" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('totalDelivered')}>
                  Entregues <SortIcon field="totalDelivered" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('batteryLevel')}>
                  <Battery className={styles.headerIcon} /> Bateria <SortIcon field="batteryLevel" />
                </button>
              </th>
              <th className={styles.th}>
                <button className={styles.sortButton} onClick={() => handleSort('avgTimePerStop')}>
                  Tempo Med <SortIcon field="avgTimePerStop" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTeam.map(member => (
              <tr key={member.id} className={styles.tr}>
                <td className={styles.td}>
                  <span className={styles.name}>{member.name}</span>
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
                          backgroundColor:
                            member.batteryLevel > 50
                              ? '#10b981'
                              : member.batteryLevel > 20
                                ? '#f59e0b'
                                : '#ef4444',
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
          💡 Dica: Você pode arrastar entregas entre entregadores para reatribuir cargas (em breve)
        </p>
      </div>
    </div>
  );
}
