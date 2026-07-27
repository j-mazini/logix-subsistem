import React, { useState } from 'react';
import { AlertTriangle, Phone, CheckCircle2 } from 'lucide-react';
import { Exception } from '../../types';
import styles from './ExceptionTriage.module.css';

interface Props {
  exceptions: Exception[];
  onResolve: (id: string) => void;
}

export function ExceptionTriage({ exceptions, onResolve }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      absent: 'Cliente Ausente',
      wrong_address: 'Endereço Errado',
      unreachable: 'Inacessível',
      damaged: 'Pacote Danificado',
      refused: 'Recusado',
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      absent: '#f59e0b',
      wrong_address: '#ef4444',
      unreachable: '#8b5cf6',
      damaged: '#ec4899',
      refused: '#ef4444',
    };
    return colors[reason] || '#6b7280';
  };

  const activeExceptions = exceptions.filter(e => !e.resolved);

  return (
    <div className={styles.triageContainer}>
      <div className={styles.triageHeader}>
        <h3>Triage de Exceções — Foco na Ação</h3>
        <span className={styles.badge}>{activeExceptions.length} ativas</span>
      </div>

      {activeExceptions.length === 0 ? (
        <div className={styles.emptyState}>
          <CheckCircle2 className={styles.emptyIcon} />
          <p>Nenhuma exceção ativa</p>
          <span className={styles.emptySubtext}>Operação fluindo normalmente</span>
        </div>
      ) : (
        <div className={styles.exceptionsList}>
          {activeExceptions.map(exc => (
            <div
              key={exc.id}
              className={`${styles.exceptionItem} ${expandedId === exc.id ? styles.expanded : ''}`}
              onClick={() => setExpandedId(expandedId === exc.id ? null : exc.id)}
            >
              <div className={styles.exceptionSummary}>
                <AlertTriangle
                  className={styles.exceptionIcon}
                  color={getReasonColor(exc.reason)}
                />
                <div className={styles.exceptionInfo}>
                  <div className={styles.exceptionTitle}>
                    {getReasonLabel(exc.reason)}
                  </div>
                  <div className={styles.exceptionMeta}>
                    <span>#{exc.packageId}</span>
                    <span className={styles.separator}>•</span>
                    <span>{exc.delivererName}</span>
                  </div>
                </div>
                <div className={styles.exceptionTime}>
                  {new Date(exc.createdAt).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              {expandedId === exc.id && (
                <div className={styles.exceptionDetails}>
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsLabel}>Endereço:</span>
                    <span className={styles.detailsValue}>{exc.address}</span>
                  </div>
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsLabel}>Motivo:</span>
                    <span className={styles.detailsValue}>{getReasonLabel(exc.reason)}</span>
                  </div>
                  <div className={styles.detailsRow}>
                    <span className={styles.detailsLabel}>Notas:</span>
                    <span className={styles.detailsValue}>{exc.notes}</span>
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.actionButton} title="Ligar para cliente">
                      <Phone className={styles.actionIcon} />
                      Ligar Cliente
                    </button>
                    <button
                      className={`${styles.actionButton} ${styles.primary}`}
                      onClick={e => {
                        e.stopPropagation();
                        onResolve(exc.id);
                        setExpandedId(null);
                      }}
                    >
                      <CheckCircle2 className={styles.actionIcon} />
                      Resolver
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
