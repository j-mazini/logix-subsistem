import React, { useEffect, useRef } from 'react';
import { Package, CheckCircle2, AlertCircle, Loader } from 'lucide-react';
import { ScannerEvent } from '../../types';
import styles from './ScannerLiveFeed.module.css';

interface Props {
  events: ScannerEvent[];
}

export function ScannerLiveFeed({ events }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const newestId = events[0]?.id;

  useEffect(() => {
    // Rola só o contentor da lista. scrollIntoView() propagaria por todos os
    // ascendentes roláveis e arrastaria a página inteira. A lista está ordenada
    // do mais recente para o mais antigo, por isso o topo é o evento novo.
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [newestId]);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendente',
      in_route: 'Em Rota',
      delivered: 'Entregue',
      failed: 'Falha',
      exception: 'Exceção',
    };
    return labels[action] || action;
  };

  const getActionIcon = (action: string) => {
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
  };

  return (
    <div className={styles.feedContainer}>
      <div className={styles.feedHeader}>
        <h3>Live Feed do Scanner — O "Ticker"</h3>
        <span className={styles.liveIndicator}>
          <span className={styles.liveDot}></span>
          AO VIVO
        </span>
      </div>

      <div className={styles.feedList} ref={listRef}>
        {events.length === 0 ? (
          <div className={styles.emptyFeed}>
            <Package className={styles.emptyIcon} />
            <p>Aguardando eventos do scanner...</p>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className={styles.feedItem}>
              <div className={styles.feedTime}>
                {new Date(event.timestamp).toLocaleTimeString('pt-BR', {
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
                    <strong>{event.delivererName}</strong> escaneou{' '}
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
          {events.length} eventos • Atualizado em tempo real
        </p>
      </div>
    </div>
  );
}
