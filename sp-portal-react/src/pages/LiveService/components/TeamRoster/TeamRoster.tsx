import React, { useMemo } from 'react';
import { Car, Gauge } from 'lucide-react';
import { RouteStatus, TeamMember } from '../../types';
import styles from './TeamRoster.module.css';

interface Props {
  team: TeamMember[];
  onSelect: (id: string) => void;
}

const STATUS_COLORS: Record<RouteStatus, string> = {
  sort: '#6b7280',
  departed: '#3b82f6',
  arrived: '#10b981',
};

const STATUS_LABELS: Record<RouteStatus, string> = {
  sort: 'Sort',
  departed: 'Departed',
  arrived: 'Arrived',
};

const getStatusColor = (status: RouteStatus) => STATUS_COLORS[status];
const getStatusLabel = (status: RouteStatus) => STATUS_LABELS[status];

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const TeamRoster = React.memo(function TeamRoster({ team, onSelect }: Props) {
  const sortedTeam = useMemo(
    () => [...team].sort((a, b) => a.routeName.localeCompare(b.routeName)),
    [team]
  );

  return (
    <div className={styles.rosterContainer}>
      <div className={styles.rosterHeader}>
        <h3>Team Status</h3>
        <span className={styles.badge}>{team.length} routes</span>
      </div>

      <div className={styles.cardGrid}>
        {sortedTeam.map((member, index) => {
          const progress = member.totalAssigned > 0 ? Math.round((member.totalDelivered / member.totalAssigned) * 100) : 0;

          return (
            <button
              key={member.id}
              type="button"
              className={styles.card}
              style={{ '--i': Math.min(index, 10) } as React.CSSProperties}
              onClick={() => onSelect(member.id)}
            >
              <div className={styles.cardHeader}>
                <div className={styles.plateBlock}>
                  <Car className={styles.plateIcon} />
                  <span className={styles.plate}>{member.vehiclePlate}</span>
                </div>
                <span className={styles.routeName}>{member.routeName}</span>
              </div>

              <div className={styles.driverRow}>
                <span
                  className={styles.avatar}
                  style={{ boxShadow: `0 0 0 2px ${getStatusColor(member.routeStatus)}` }}
                >
                  {getInitials(member.name)}
                </span>
                <span className={styles.name}>{member.name}</span>
              </div>

              <div className={styles.statusRow}>
                <div className={styles.statusBadge}>
                  <div className={styles.statusDot} style={{ backgroundColor: getStatusColor(member.routeStatus) }} />
                  <span>{getStatusLabel(member.routeStatus)}</span>
                </div>
                {(member.departedAt || member.arrivedAt) && (
                  <span className={styles.timestamps}>
                    {member.departedAt && formatTime(member.departedAt)}
                    {member.departedAt && member.arrivedAt && ' → '}
                    {member.arrivedAt && formatTime(member.arrivedAt)}
                  </span>
                )}
              </div>

              <div className={styles.progressSection}>
                <div className={styles.progressLabel}>
                  <span>Stops</span>
                  <span>
                    {member.totalDelivered}/{member.totalAssigned} ({progress}%)
                  </span>
                </div>
                <div className={styles.progressBackground}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              <div className={styles.sporh}>
                <Gauge className={styles.sporhIcon} />
                <span className={styles.sporhValue}>{member.stopsPerHour.toFixed(1)}</span>
                <span className={styles.sporhLabel}>SPOR-H</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
