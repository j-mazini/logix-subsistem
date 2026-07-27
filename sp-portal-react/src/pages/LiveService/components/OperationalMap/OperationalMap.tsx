import React, { useMemo } from 'react';
import { Deliverer } from '../../types';
import styles from './OperationalMap.module.css';

interface Props {
  deliverers: Deliverer[];
}

export function OperationalMap({ deliverers }: Props) {
  const delivererMarkers = useMemo(() => {
    // Os couriers do mock ficam em baseLat/baseLng ± SPREAD graus. Mapeia essa
    // janela para o viewBox 400x300 com margem, senão todos colapsam num ponto.
    const baseLat = -23.5505;
    const baseLng = -46.6333;
    const SPREAD = 0.05;
    // y invertido: latitude maior (norte) desenha-se mais acima no SVG.
    const project = (delta: number, center: number, halfSpan: number) =>
      center + (delta / SPREAD) * halfSpan;

    return deliverers.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      x: project(d.longitude - baseLng, 200, 170),
      y: project(d.latitude - baseLat, 150, -120),
      battery: d.batteryLevel,
    }));
  }, [deliverers]);

  const getStatusColor = (status: string, battery: number) => {
    if (battery < 20) return '#ef4444';
    if (status === 'active') return '#10b981';
    if (status === 'break') return '#f59e0b';
    if (status === 'returning') return '#3b82f6';
    return '#6b7280';
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

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <h3>Mapa Operacional — O Olho de Águia</h3>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#10b981' }}></div>
            <span>Em Rota</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Pausa</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Retornando</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#ef4444' }}></div>
            <span>Bateria Baixa</span>
          </div>
        </div>
      </div>

      <svg className={styles.mapSvg} viewBox="0 0 400 300">
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="300" fill="url(#grid)" />

        {/* Heatmap zones (mock) */}
        <circle cx="100" cy="80" r="30" fill="#f59e0b" opacity="0.15" />
        <circle cx="250" cy="150" r="25" fill="#f59e0b" opacity="0.2" />
        <circle cx="150" cy="220" r="35" fill="#f59e0b" opacity="0.1" />

        {/* Deliverer markers */}
        {delivererMarkers.map(marker => {
          const color = getStatusColor(marker.status, marker.battery);
          return (
            <g key={marker.id} className={styles.marker}>
              <circle
                cx={marker.x}
                cy={marker.y}
                r="12"
                fill={color}
                opacity="0.8"
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r="12"
                fill="none"
                stroke={color}
                strokeWidth="2"
                opacity="0.3"
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r="6"
                fill="#ffffff"
                opacity="0.9"
              />
              <title>{marker.name} - {getStatusLabel(marker.status)} ({marker.battery.toFixed(0)}%)</title>
            </g>
          );
        })}
      </svg>

      <div className={styles.mapFooter}>
        <p className={styles.footerText}>
          {delivererMarkers.length} entregadores ativos • Atualizado em tempo real a cada 2 segundos
        </p>
        <div className={styles.footerStatus}>
          {delivererMarkers.filter(m => m.status === 'active').length} em rota •{' '}
          {delivererMarkers.filter(m => m.battery < 20).length} com bateria baixa
        </div>
      </div>
    </div>
  );
}
