import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Ban, Car, X } from 'lucide-react';
import { Deliverer, HazardType } from '../../types';
import { LONDON_LOCATIONS, MOCK_DELIVERIES } from '../../mock-data';
import { DriverDetailPanel } from '../DriverDetailPanel/DriverDetailPanel';
import { HazardDetailPanel } from '../HazardDetailPanel/HazardDetailPanel';
import { useHazardReports } from '../../hooks/useHazardReports';
import styles from './OperationalMap.module.css';

interface Props {
  deliverers: Deliverer[];
}

const HAZARD_CONFIG: Record<HazardType, { label: string; color: string; Icon: typeof Ban; markerHtml: string }> = {
  road_closed: { label: 'Road Closed', color: '#ef4444', Icon: Ban, markerHtml: '⛔' },
  accident: { label: 'Accident', color: '#f97316', Icon: Car, markerHtml: '💥' },
  hazard: { label: 'Hazard', color: '#f59e0b', Icon: AlertTriangle, markerHtml: '⚠' },
};

// Zonas de alta demanda (mock) — pontos fixos em torno do centro de Londres,
// mesma base usada pelo gerador de couriers em mock-data.ts.
const HEAT_ZONES: Array<{ lat: number; lng: number; radiusM: number }> = [
  { lat: 51.5155, lng: -0.1425, radiusM: 650 },
  { lat: 51.5033, lng: -0.0876, radiusM: 550 },
  { lat: 51.4952, lng: -0.1610, radiusM: 700 },
];

const LOCATION_BY_NAME = new Map(LONDON_LOCATIONS.map(l => [l.name, l]));

// Rota estimada: tenta o roteador público do OSRM (segue ruas de verdade);
// se a chamada falhar (offline, rate-limit do serviço demo), cai para uma
// linha reta tracejada conectando os mesmos pontos, então a feature nunca
// quebra por causa de um serviço externo fora do nosso controle.
async function fetchDrivingRoute(
  points: Array<{ lat: number; lng: number }>,
  signal: AbortSignal
): Promise<[number, number][] | null> {
  const coordsParam = points.map(p => `${p.lng},${p.lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const data = await res.json();
  const coords = data?.routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  return coords.map(([lng, lat]: [number, number]) => [lat, lng]);
}

function getStatusColor(status: string, battery: number) {
  if (battery < 20) return '#ef4444';
  if (status === 'active') return '#10b981';
  if (status === 'break') return '#f59e0b';
  if (status === 'returning') return '#3b82f6';
  return '#6b7280';
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    active: 'On Route',
    break: 'Break',
    returning: 'Returning',
    offline: 'Offline',
  };
  return labels[status] || status;
}

export const OperationalMap = React.memo(function OperationalMap({ deliverers }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const hazardMarkersRef = useRef<Record<string, L.Marker>>({});
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedHazardId, setSelectedHazardId] = useState<string | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

  const { hazards, addHazard, removeHazard } = useHazardReports();
  const [reportMode, setReportMode] = useState<HazardType | null>(null);
  const reportModeRef = useRef<HazardType | null>(null);
  useEffect(() => {
    reportModeRef.current = reportMode;
  }, [reportMode]);

  useEffect(() => {
    if (!reportMode) return;
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setReportMode(null);
    };
    document.addEventListener('keydown', onKeydown);
    return () => document.removeEventListener('keydown', onKeydown);
  }, [reportMode]);

  // A rota é calculada uma vez, no momento da seleção — não recalcula a cada
  // tick de 2s do courier, senão martelaríamos o serviço público de rotas.
  // Este ref segura a posição mais recente para o efeito de seleção ler sem
  // precisar de `deliverers` nas suas dependências.
  const deliverersRef = useRef(deliverers);
  useEffect(() => {
    deliverersRef.current = deliverers;
  });

  const markerData = useMemo(
    () =>
      deliverers.map(d => ({
        id: d.id,
        name: d.name,
        status: d.status,
        battery: d.batteryLevel,
        lat: d.latitude,
        lng: d.longitude,
        color: getStatusColor(d.status, d.batteryLevel),
      })),
    [deliverers]
  );

  // Mapa Leaflet + tiles claros (CARTO Positron) sobre Londres, criado uma
  // única vez; o container precisa medir sua altura final antes do invalidateSize,
  // senão os tiles nascem cortados (bug clássico de Leaflet em layout flex).
  useEffect(() => {
    if (!canvasRef.current || mapRef.current) return;

    const map = L.map(canvasRef.current, {
      center: [51.5074, -0.1278],
      zoom: 12,
      scrollWheelZoom: false,
      attributionControl: true,
      zoomControl: true,
    });

    const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap',
      subdomains: 'abcd',
      maxZoom: 19,
      // Tiles nítidos em telas retina (a maioria dos laptops hoje) em vez de
      // esticar tiles de baixa resolução; keepBuffer maior evita "buracos"
      // cinzas ao arrastar o mapa, pré-carregando mais tiles ao redor.
      detectRetina: true,
      keepBuffer: 4,
    }).addTo(map);

    tileLayer.on('load', () => setTilesLoaded(true));

    // A transição CSS que faz os couriers deslizarem entre posições (ver
    // .module.css) precisa ficar suspensa durante pan/zoom, senão ela briga
    // com a própria animação do Leaflet e os marcadores "nadam" atrás do
    // cursor em vez de acompanhar o mapa 1:1.
    const suspendGlide = () => canvasRef.current?.classList.add(styles.suspendGlide);
    const resumeGlide = () => canvasRef.current?.classList.remove(styles.suspendGlide);
    map.on('movestart zoomstart', suspendGlide);
    map.on('moveend zoomend', resumeGlide);

    HEAT_ZONES.forEach(zone => {
      L.circle([zone.lat, zone.lng], {
        radius: zone.radiusM,
        color: 'transparent',
        fillColor: '#fb923c',
        fillOpacity: 0.18,
        interactive: true,
      })
        .addTo(map)
        .bindTooltip('Heavy Traffic', { direction: 'top', sticky: true });
    });

    // Modo "reportar" armado por um dos botões da toolbar — o próximo clique
    // no mapa planta o marcador ali e desarma. addHazard é estável (useCallback
    // sem deps), então é seguro capturá-la aqui mesmo com o efeito rodando uma
    // única vez no mount.
    map.on('click', (e: L.LeafletMouseEvent) => {
      const mode = reportModeRef.current;
      if (!mode) return;
      addHazard(mode, e.latlng.lat, e.latlng.lng);
      setReportMode(null);
    });

    mapRef.current = map;

    const resize = () => map.invalidateSize();
    window.addEventListener('resize', resize);
    const t = window.setTimeout(resize, 200);
    // Se o evento 'load' do tileLayer nunca disparar (tile com erro, rede
    // lenta), o skeleton não pode ficar pulsando pra sempre.
    const safety = window.setTimeout(() => setTilesLoaded(true), 4000);

    return () => {
      window.clearTimeout(safety);
      window.removeEventListener('resize', resize);
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      markersRef.current = {};
      hazardMarkersRef.current = {};
    };
  }, []);

  // Sincroniza marcadores dos entregadores a cada tick, reaproveitando os
  // existentes (setLatLng) em vez de recriar o mapa inteiro.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    markerData.forEach(d => {
      seen.add(d.id);
      const icon = L.divIcon({
        className: styles.markerIcon,
        html: `<span class="${styles.markerDot}" style="--marker-color:${d.color}"></span>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const existing = markersRef.current[d.id];
      if (existing) {
        existing.setLatLng([d.lat, d.lng]);
        existing.setIcon(icon);
        existing.setTooltipContent(`${d.name} — ${getStatusLabel(d.status)} (${d.battery.toFixed(0)}%)`);
      } else {
        markersRef.current[d.id] = L.marker([d.lat, d.lng], { icon })
          .addTo(map)
          .bindTooltip(`${d.name} — ${getStatusLabel(d.status)} (${d.battery.toFixed(0)}%)`, {
            direction: 'top',
            offset: [0, -8],
          })
          .on('click', () => {
            setSelectedId(d.id);
            setSelectedHazardId(null);
          });
      }
    });

    Object.keys(markersRef.current).forEach(id => {
      if (!seen.has(id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [markerData]);

  // Sincroniza os relatos de campo (rua fechada, acidente...) plotados pela
  // toolbar. Clicar num marcador existente abre o painel de detalhes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    hazards.forEach(hazard => {
      seen.add(hazard.id);
      const config = HAZARD_CONFIG[hazard.type];
      const tooltip = `${config.label} — reported by ${hazard.reportedBy} (click for details)`;

      const existing = hazardMarkersRef.current[hazard.id];
      if (existing) {
        existing.setTooltipContent(tooltip);
        return;
      }

      const icon = L.divIcon({
        className: styles.hazardIcon,
        html: `<span class="${styles.hazardDot}" style="--hazard-color:${config.color}">${config.markerHtml}</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      hazardMarkersRef.current[hazard.id] = L.marker([hazard.lat, hazard.lng], { icon })
        .addTo(map)
        .bindTooltip(tooltip, { direction: 'top', offset: [0, -12] })
        .on('click', () => {
          setSelectedHazardId(hazard.id);
          setSelectedId(null);
        });
    });

    Object.keys(hazardMarkersRef.current).forEach(id => {
      if (!seen.has(id)) {
        hazardMarkersRef.current[id].remove();
        delete hazardMarkersRef.current[id];
      }
    });
  }, [hazards]);

  // Traça a rota estimada do courier selecionado até as paradas das suas
  // entregas (localizadas pelo postcode/endereço mock), com marcadores
  // numerados por parada.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    routeLayerRef.current?.remove();
    routeLayerRef.current = null;

    if (!selectedId) return;

    const deliverer = deliverersRef.current.find(d => d.id === selectedId);
    if (!deliverer) return;

    const stops = MOCK_DELIVERIES.filter(d => d.assignedToId === selectedId)
      .map(d => LOCATION_BY_NAME.get(d.address))
      .filter((loc): loc is (typeof LONDON_LOCATIONS)[number] => Boolean(loc));

    if (stops.length === 0) return;

    const points = [{ lat: deliverer.latitude, lng: deliverer.longitude }, ...stops];
    const layerGroup = L.layerGroup().addTo(map);
    routeLayerRef.current = layerGroup;

    stops.forEach((stop, index) => {
      L.marker([stop.lat, stop.lng], {
        icon: L.divIcon({
          className: styles.stopIcon,
          html: `<span class="${styles.stopDot}">${index + 1}</span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
      })
        .addTo(layerGroup)
        .bindTooltip(`Stop ${index + 1} — ${stop.name} (${stop.postcode})`, {
          direction: 'top',
          offset: [0, -12],
        });
    });

    let cancelled = false;
    const controller = new AbortController();

    const drawFallback = () => {
      if (cancelled) return;
      L.polyline(
        points.map(p => [p.lat, p.lng] as [number, number]),
        { color: '#6366f1', weight: 3, opacity: 0.7, dashArray: '6 8', lineJoin: 'round' }
      ).addTo(layerGroup);
    };

    fetchDrivingRoute(points, controller.signal)
      .then(latlngs => {
        if (cancelled) return;
        if (latlngs) {
          L.polyline(latlngs, { color: '#6366f1', weight: 4, opacity: 0.85, lineJoin: 'round' }).addTo(layerGroup);
        } else {
          drawFallback();
        }
      })
      .catch(() => drawFallback());

    return () => {
      cancelled = true;
      controller.abort();
      layerGroup.remove();
      if (routeLayerRef.current === layerGroup) routeLayerRef.current = null;
    };
  }, [selectedId]);

  const selectedDeliverer = useMemo(
    () => (selectedId ? deliverers.find(d => d.id === selectedId) || null : null),
    [selectedId, deliverers]
  );

  const selectedDeliveries = useMemo(
    () => (selectedId ? MOCK_DELIVERIES.filter(d => d.assignedToId === selectedId) : []),
    [selectedId]
  );

  const selectedHazard = useMemo(
    () => (selectedHazardId ? hazards.find(h => h.id === selectedHazardId) || null : null),
    [selectedHazardId, hazards]
  );

  return (
    <div className={styles.mapContainer}>
      <div className={styles.mapHeader}>
        <h3>Live Map</h3>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#10b981' }}></div>
            <span>On Route</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Break</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Returning</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#ef4444' }}></div>
            <span>Low Battery</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#fb923c' }}></div>
            <span>Heavy Traffic</span>
          </div>
        </div>
      </div>

      <div className={styles.reportToolbar}>
        <span className={styles.reportLabel}>Report:</span>
        {(Object.keys(HAZARD_CONFIG) as HazardType[]).map(type => {
          const config = HAZARD_CONFIG[type];
          const Icon = config.Icon;
          const active = reportMode === type;
          return (
            <button
              key={type}
              type="button"
              className={`${styles.reportButton} ${active ? styles.reportButtonActive : ''}`}
              style={active ? ({ '--report-color': config.color } as React.CSSProperties) : undefined}
              onClick={() => setReportMode(active ? null : type)}
            >
              <Icon className={styles.reportIcon} />
              {config.label}
            </button>
          );
        })}

        {reportMode && (
          <span className={styles.reportHint}>
            Click the map to place it
            <button type="button" className={styles.reportCancel} onClick={() => setReportMode(null)} aria-label="Cancel">
              <X className={styles.reportCancelIcon} />
            </button>
          </span>
        )}
      </div>

      <div className={styles.mapCanvasWrap}>
        <div className={`${styles.mapCanvas} ${reportMode ? styles.mapCanvasArmed : ''}`} ref={canvasRef} />

        {!tilesLoaded && <div className={styles.mapSkeleton} aria-hidden="true" />}

        {selectedDeliverer && (
          <DriverDetailPanel
            deliverer={selectedDeliverer}
            deliveries={selectedDeliveries}
            onClose={() => setSelectedId(null)}
          />
        )}

        {selectedHazard && (
          <HazardDetailPanel
            hazard={selectedHazard}
            onClose={() => setSelectedHazardId(null)}
            onClear={removeHazard}
          />
        )}
      </div>

      <div className={styles.mapFooter}>
        <p className={styles.footerText}>
          {markerData.length} active couriers • London, United Kingdom
        </p>
        <div className={styles.footerStatus}>
          {markerData.filter(m => m.status === 'active').length} on route •{' '}
          {markerData.filter(m => m.battery < 20).length} with low battery
        </div>
      </div>
    </div>
  );
});
