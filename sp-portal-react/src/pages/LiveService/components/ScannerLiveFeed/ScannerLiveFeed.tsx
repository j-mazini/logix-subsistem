import React, { useEffect, useRef } from 'react';
import { Package, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { ScannerEvent } from '../../types';
import styles from './ScannerLiveFeed.module.css';

interface Props {
  events: ScannerEvent[];
}

const ACTION_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_route: 'On Route',
  delivered: 'Delivered',
  failed: 'Failed',
  exception: 'Exception',
};

const getActionLabel = (action: string) => ACTION_LABELS[action] || action;

function getActionIcon(action: string) {
  const iconProps = { className: styles.actionIcon };
  switch (action) {
    case 'delivered':
      return <CheckCircle2 {...iconProps} style={{ color: '#10b981' }} />;
    case 'failed':
    case 'exception':
      return <AlertCircle {...iconProps} style={{ color: '#ef4444' }} />;
    case 'in_route':
      return <Loader {...iconProps} style={{ color: '#3b82f6' }} />;
    default:
      return <Package {...iconProps} style={{ color: '#6b7280' }} />;
  }
}

export const ScannerLiveFeed = React.memo(function ScannerLiveFeed({ events }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const newestId = events[0]?.id;

  useEffect(() => {
    // Rola só o contentor da lista. scrollIntoView() propagaria por todos os
    // ascendentes roláveis e arrastaria a página inteira. A lista está ordenada
    // do mais recente para o mais antigo, por isso o topo é o evento novo.
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [newestId]);

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedHeader}>
        <h3>Scanner Feed</h3>
        <span className={styles.liveIndicator}>
          <span className={styles.liveDot}></span>
          LIVE
        </span>
      </div>

      <div className={styles.feedList} ref={listRef}>
        {events.length === 0 ? (
          <div className={styles.emptyFeed}>
            <Package className={styles.emptyIcon} />
            <p>Waiting for scanner events...</p>
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={event.id}
              className={styles.feedItem}
              style={{ '--i': Math.min(index, 12) } as React.CSSProperties}
            >
              <div className={styles.feedTime}>
                {new Date(event.timestamp).toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>

              <div className={styles.feedContent}>
                <div className={styles.feedIcon}>
                  {getActionIcon(event.action)}
                </div>

                <div className={styles.feedText}>
                  <div className={styles.feedMessage}>
                    <strong>{event.delivererName}</strong> scanned{' '}
                    <span className={styles.packageId}>#{event.packageId}</span>{' '}
                    <span className={styles.action}>({getActionLabel(event.action)})</span>
                  </div>
                  {event.note && (
                    <div className={styles.feedNote}>{event.note}</div>
                  )}
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      <div className={styles.feedFooter}>
        <p className={styles.footerText}>
          {events.length} events • Updated in real time
        </p>
      </div>
    </div>
  );
});
