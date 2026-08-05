import React, { useEffect, useMemo } from 'react';
import { Car, Clock, MapPin, TrendingUp, X } from 'lucide-react';
import { RouteStatus, TeamMember } from '../../types';
import styles from './DriverPerformanceModal.module.css';

interface Props {
  member: TeamMember;
  onClose: () => void;
}

const STATUS_LABELS: Record<RouteStatus, string> = {
  sort: 'Sort',
  departed: 'Departed',
  arrived: 'Arrived',
};

const STATUS_COLORS: Record<RouteStatus, string> = {
  sort: '#6b7280',
  departed: '#3b82f6',
  arrived: '#10b981',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

const formatTime = (date: Date) =>
  date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const formatIsoTime = (iso: string) => formatTime(new Date(iso));

const formatDuration = (minutes: number) => {
  const wholeMinutes = Math.max(0, Math.round(minutes));
  const hours = Math.floor(wholeMinutes / 60);
  const mins = wholeMinutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};

type Estimate =
  | { state: 'not_started' }
  | { state: 'completed' }
  | { state: 'in_progress'; etaDate: Date; remainingMinutes: number; remainingStops: number };

function estimateCompletion(member: TeamMember): Estimate {
  if (member.routeStatus === 'sort') return { state: 'not_started' };
  if (member.routeStatus === 'arrived') return { state: 'completed' };

  const remainingStops = Math.max(0, member.totalAssigned - member.totalDelivered);
  const remainingMinutes = member.stopsPerHour > 0 ? (remainingStops / member.stopsPerHour) * 60 : 0;
  const etaDate = new Date(Date.now() + remainingMinutes * 60_000);
  return { state: 'in_progress', etaDate, remainingMinutes, remainingStops };
}

/** Modal centralizada (overlay) — estimativa de performance do driver, aberta pelo card do Team Status. */
export function DriverPerformanceModal({ member, onClose }: Props) {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  const estimate = useMemo(() => estimateCompletion(member), [member]);
  const progress = member.totalAssigned > 0 ? Math.round((member.totalDelivered / member.totalAssigned) * 100) : 0;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-label={`${member.name} estimated performance`}
        onClick={e => e.stopPropagation()}
      >
        <div className={styles.header}>
          <div className={styles.headerInfo}>
            <span className={styles.avatar} style={{ boxShadow: `0 0 0 2px ${STATUS_COLORS[member.routeStatus]}` }}>
              {getInitials(member.name)}
            </span>
            <div>
              <h3 className={styles.name}>{member.name}</h3>
              <div className={styles.statusBadge}>
                <span className={styles.statusDot} style={{ backgroundColor: STATUS_COLORS[member.routeStatus] }} />
                {STATUS_LABELS[member.routeStatus]}
              </div>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X className={styles.closeIcon} />
          </button>
        </div>

        <div className={styles.metaRow}>
          <span className={styles.metaItem}>
            <Car className={styles.metaIcon} />
            {member.vehiclePlate}
          </span>
          <span className={styles.metaItem}>
            <MapPin className={styles.metaIcon} />
            {member.routeName}
          </span>
        </div>

        {(member.departedAt || member.arrivedAt) && (
          <div className={styles.timelineRow}>
            <Clock className={styles.timelineIcon} />
            {member.departedAt && <span>Departed {formatIsoTime(member.departedAt)}</span>}
            {member.departedAt && member.arrivedAt && <span className={styles.timelineArrow}>→</span>}
            {member.arrivedAt && <span>Arrived {formatIsoTime(member.arrivedAt)}</span>}
          </div>
        )}

        <div className={styles.etaCard}>
          {estimate.state === 'not_started' && (
            <>
              <Clock className={styles.etaIcon} />
              <div>
                <div className={styles.etaTitle}>Not started yet</div>
                <div className={styles.etaSubtext}>ETA appears once the van departs.</div>
              </div>
            </>
          )}

          {estimate.state === 'completed' && (
            <>
              <Clock className={styles.etaIcon} />
              <div>
                <div className={styles.etaTitle}>
                  Completed{member.arrivedAt ? ` at ${formatTime(new Date(member.arrivedAt))}` : ''}
                </div>
                <div className={styles.etaSubtext}>
                  {member.totalDelivered}/{member.totalAssigned} stops · final pace {member.stopsPerHour.toFixed(1)} stops/h
                </div>
              </div>
            </>
          )}

          {estimate.state === 'in_progress' && (
            <>
              <Clock className={styles.etaIcon} />
              <div>
                <div className={styles.etaLabel}>Estimated completion</div>
                <div className={styles.etaTitle}>{formatTime(estimate.etaDate)}</div>
                <div className={styles.etaSubtext}>
                  ~{formatDuration(estimate.remainingMinutes)} remaining · {estimate.remainingStops} stops left
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <TrendingUp className={styles.statIcon} />
              <span>Pace (SPOR-H)</span>
            </div>
            <div className={styles.statValue}>{member.stopsPerHour.toFixed(1)}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statHeader}>
              <MapPin className={styles.statIcon} />
              <span>Progress</span>
            </div>
            <div className={styles.statValue}>{progress}%</div>
          </div>
        </div>

        <p className={styles.disclaimer}>
          Estimate based on current pace and remaining stops — not a guarantee.
        </p>
      </div>
    </div>
  );
}
