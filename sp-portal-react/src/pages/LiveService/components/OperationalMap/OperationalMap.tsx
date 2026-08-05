import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Deliverer, RouteStatus } from '../../types';
import { LONDON_LOCATIONS, MOCK_DELIVERIES } from '../../mock-data';
import { DriverDetailPanel } from '../DriverDetailPanel/DriverDetailPanel';
import { LocationGroupPanel } from '../LocationGroupPanel/LocationGroupPanel';
import styles from './OperationalMap.module.css';

interface Props {
  deliverers: Deliverer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

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

function getStatusColor(status: RouteStatus) {
  if (status === 'departed') return '#3b82f6';
  if (status === 'arrived') return '#10b981';
  return '#6b7280';
}

const STATUS_LABELS: Record<RouteStatus, string> = {
  sort: 'Sort',
  departed: 'Departed',
  arrived: 'Arrived',
};

function getStatusLabel(status: RouteStatus) {
  return STATUS_LABELS[status];
}

export const OperationalMap = React.memo(function OperationalMap({ deliverers, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [tilesLoaded, setTilesLoaded] = useState(false);

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
        routeStatus: d.routeStatus,
        vehiclePlate: d.vehiclePlate,
        routeName: d.routeName,
        lat: d.latitude,
        lng: d.longitude,
        color: getStatusColor(d.routeStatus),
      })),
    [deliverers]
  );

  // Vans paradas no mesmo ponto (ex. de volta ao depósito) viram um único
  // pino com contador — evita marcadores empilhados e ilegíveis no mapa.
  const groupedMarkers = useMemo(() => {
    const groups = new Map<string, typeof markerData>();
    markerData.forEach(d => {
      const key = `${d.lat.toFixed(5)},${d.lng.toFixed(5)}`;
      const bucket = groups.get(key);
      if (bucket) bucket.push(d);
      else groups.set(key, [d]);
    });
    return Array.from(groups.entries()).map(([key, members]) => ({
      key,
      members,
      lat: members[0].lat,
      lng: members[0].lng,
    }));
  }, [markerData]);

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
    };
  }, []);

  // Sincroniza marcadores das vans a cada tick, reaproveitando os
  // existentes (setLatLng) em vez de recriar o mapa inteiro. Cada marcador
  // carrega um rótulo permanente (placa, ou contador quando agrupado).
  // Grupos com mais de uma van (ex. paradas no depósito) abrem uma lista
  // em vez de ir direto pro painel de detalhe.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seen = new Set<string>();

    groupedMarkers.forEach(group => {
      seen.add(group.key);
      const isCluster = group.members.length > 1;
      const primary = group.members[0];

      const icon = isCluster
        ? L.divIcon({
            className: styles.markerIcon,
            html: `<span class="${styles.clusterDot}">${group.members.length}</span>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          })
        : L.divIcon({
            className: styles.markerIcon,
            html: `<span class="${styles.markerDot}" style="--marker-color:${primary.color}"></span>`,
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          });

      const tooltipContent = isCluster
        ? `<strong>${group.members.length} vans</strong><br/>Tap to view list`
        : `<strong>${primary.vehiclePlate}</strong><br/>${primary.routeName} — ${getStatusLabel(primary.routeStatus)}`;

      const handleClick = () => {
        if (isCluster) {
          setSelectedGroupKey(group.key);
          onSelect(null);
        } else {
          onSelect(primary.id);
          setSelectedGroupKey(null);
        }
      };

      const existing = markersRef.current[group.key];
      if (existing) {
        existing.setLatLng([group.lat, group.lng]);
        existing.setIcon(icon);
        existing.setTooltipContent(tooltipContent);
        existing.off('click').on('click', handleClick);
      } else {
        markersRef.current[group.key] = L.marker([group.lat, group.lng], { icon })
          .addTo(map)
          .bindTooltip(tooltipContent, {
            direction: 'top',
            offset: [0, isCluster ? -13 : -8],
            permanent: true,
            className: styles.plateTooltip,
          })
          .on('click', handleClick);
      }
    });

    Object.keys(markersRef.current).forEach(key => {
      if (!seen.has(key)) {
        markersRef.current[key].remove();
        delete markersRef.current[key];
      }
    });
  }, [groupedMarkers]);

  // Traça a rota estimada do courier selecionado até as paradas das suas
  // entregas (localizadas pelo postcode/endereço mock), com marcadores
  // numerados por parada — só aparece quando o driver é selecionado.
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

  const selectedGroup = useMemo(
    () => (selectedGroupKey ? groupedMarkers.find(g => g.key === selectedGroupKey) || null : null),
    [selectedGroupKey, groupedMarkers]
  );

  const selectedDeliverer = useMemo(
    () => (selectedId ? deliverers.find(d => d.id === selectedId) || null : null),
    [selectedId, deliverers]
  );

  const selectedDeliveries = useMemo(
    () => (selectedId ? MOCK_DELIVERIES.filter(d => d.assignedToId === selectedId) : []),
    [selectedId]
  );

  const statusCounts = useMemo(
    () => ({
      sort: markerData.filter(m => m.routeStatus === 'sort').length,
      departed: markerData.filter(m => m.routeStatus === 'departed').length,
      arrived: markerData.filter(m => m.routeStatus === 'arrived').length,
    }),
    [markerData]
  );

  return (
    <div className={styles.mapContainer} id="live-map-section">
      <div className={styles.mapHeader}>
        <h3>Live Map</h3>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#6b7280' }}></div>
            <span>Sort</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Departed</span>
          </div>
          <div className={styles.legendItem}>
            <div className={styles.legendDot} style={{ backgroundColor: '#10b981' }}></div>
            <span>Arrived</span>
          </div>
        </div>
      </div>

      <div className={styles.mapCanvasWrap}>
        <div className={styles.mapCanvas} ref={canvasRef} />

        {!tilesLoaded && <div className={styles.mapSkeleton} aria-hidden="true" />}

        {selectedDeliverer && (
          <DriverDetailPanel
            deliverer={selectedDeliverer}
            deliveries={selectedDeliveries}
            onClose={() => onSelect(null)}
          />
        )}

        {!selectedDeliverer && selectedGroup && (
          <LocationGroupPanel
            members={selectedGroup.members}
            onSelect={id => {
              onSelect(id);
              setSelectedGroupKey(null);
            }}
            onClose={() => setSelectedGroupKey(null)}
          />
        )}
      </div>

      <div className={styles.mapFooter}>
        <p className={styles.footerText}>
          {markerData.length} active vans • London, United Kingdom
        </p>
        <div className={styles.footerStatus}>
          {statusCounts.sort} sorting • {statusCounts.departed} departed • {statusCounts.arrived} arrived
        </div>
      </div>
    </div>
  );
});
