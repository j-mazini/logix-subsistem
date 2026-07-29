import React, { useEffect } from 'react';
import { Battery, Clock, MapPin, Package, X } from 'lucide-react';
import { Deliverer, Delivery } from '../../types';
import styles from './DriverDetailPanel.module.css';

interface Props {
  deliverer: Deliverer;
  deliveries: Delivery[];
  onClose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'On Route',
  break: 'Break',
  returning: 'Returning',
  offline: 'Offline',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#10b981',
  break: '#f59e0b',
  returning: '#3b82f6',
  offline: '#6b7280',
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_route: 'On Route',
  delivered: 'Delivered',
  failed: 'Failed',
  exception: 'Exception',
};

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  pending: '#6b7280',
  in_route: '#3b82f6',
  delivered: '#10b981',
  failed: '#ef4444',
  exception: '#ef4444',
};

const getStatusLabel = (status: string) => STATUS_LABELS[status] || status;
const getStatusColor = (status: string) => STATUS_COLORS[status] || '#6b7280';
const getDeliveryStatusLabel = (status: string) => DELIVERY_STATUS_LABELS[status] || status;
const getDeliveryStatusColor = (status: string) => DELIVERY_STATUS_COLORS[status] || '#6b7280';

const getInitials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('');

/** Painel encaixado na lateral direita do mapa — sem backdrop, não bloqueia o resto do mapa. */
export function DriverDetailPanel({ deliverer, deliveries, onClose }: Props) {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [onClose]);

  return (
    <div className={styles.panel} role="dialog" aria-label={`${deliverer.name} details`}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span
            className={styles.avatar}
            style={{ boxShadow: `0 0 0 2px ${getStatusColor(deliverer.status)}` }}
          >
            {getInitials(deliverer.name)}
          </span>
          <div>
            <h3 className={styles.name}>{deliverer.name}</h3>
            <div className={styles.statusBadge}>
              <span
                className={styles.statusDot}
                style={{ backgroundColor: getStatusColor(deliverer.status) }}
              />
              {getStatusLabel(deliverer.status)}
            </div>
          </div>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <X className={styles.closeIcon} />
        </button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Package className={styles.statIcon} />
            <span>Deliveries</span>
          </div>
          <div className={styles.statValue}>
            {deliverer.deliveredPackages}/{deliverer.assignedPackages}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Battery className={styles.statIcon} />
            <span>Battery</span>
          </div>
          <div className={styles.statValue}>{Math.round(deliverer.batteryLevel)}%</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <Clock className={styles.statIcon} />
            <span>Avg Time/Stop</span>
          </div>
          <div className={styles.statValue}>{deliverer.avgTimePerStop.toFixed(1)} min</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <MapPin className={styles.statIcon} />
            <span>Current Stop</span>
          </div>
          <div className={styles.statValueSmall}>{deliverer.currentStop || '—'}</div>
        </div>
      </div>

      <div className={styles.deliveriesSection}>
        <div className={styles.deliveriesHeader}>
          <h4>Assigned Deliveries</h4>
          <span className={styles.deliveriesCount}>{deliveries.length}</span>
        </div>

        {deliveries.length > 0 && (
          <p className={styles.routeHint}>Estimated route plotted on the map, by postcode.</p>
        )}

        {deliveries.length === 0 ? (
          <div className={styles.emptyState}>No deliveries assigned</div>
        ) : (
          <div className={styles.deliveriesList}>
            {deliveries.map((delivery, index) => (
              <div key={delivery.id} className={styles.deliveryRow}>
                <span className={styles.deliveryStop}>{index + 1}</span>
                <div className={styles.deliveryInfo}>
                  <span className={styles.deliveryPackage}>#{delivery.packageId}</span>
                  <span className={styles.deliveryAddress}>
                    {delivery.address} <span className={styles.deliveryPostcode}>{delivery.postcode}</span>
                  </span>
                </div>
                <span
                  className={styles.deliveryStatus}
                  style={{
                    color: getDeliveryStatusColor(delivery.status),
                    background: `${getDeliveryStatusColor(delivery.status)}1a`,
                  }}
                >
                  {getDeliveryStatusLabel(delivery.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
