import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { RouteStatus } from '../../types';
import styles from './LocationGroupPanel.module.css';

interface GroupMember {
  id: string;
  name: string;
  vehiclePlate: string;
  routeName: string;
  routeStatus: RouteStatus;
  color: string;
}

interface Props {
  members: GroupMember[];
  onSelect: (id: string) => void;
  onClose: () => void;
}

const STATUS_LABELS: Record<RouteStatus, string> = {
  sort: 'Sort',
  departed: 'Departed',
  arrived: 'Arrived',
};

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

/** Lista compacta quando várias vans ocupam o mesmo ponto (ex. o depósito). */
export function LocationGroupPanel({ members, onSelect, onClose }: Props) {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  return (
    <div className={styles.panel} role="dialog" aria-label="Vans at this location">
      <div className={styles.header}>
        <h3 className={styles.title}>{members.length} vans here</h3>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X className={styles.closeIcon} />
        </button>
      </div>

      <div className={styles.list}>
        {members.map(member => (
          <button key={member.id} type="button" className={styles.row} onClick={() => onSelect(member.id)}>
            <span className={styles.avatar} style={{ boxShadow: `0 0 0 2px ${member.color}` }}>
              {getInitials(member.name)}
            </span>
            <span className={styles.info}>
              <span className={styles.name}>{member.name}</span>
              <span className={styles.meta}>
                {member.vehiclePlate} · {member.routeName}
              </span>
            </span>
            <span className={styles.statusBadge}>
              <span className={styles.statusDot} style={{ backgroundColor: member.color }} />
              {STATUS_LABELS[member.routeStatus]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
