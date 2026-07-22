import { useEffect, useRef, useState } from 'react';
import { PortalLayout } from '../../layout/PortalLayout';
import { useViewportAttribute } from '../../hooks/useViewportAttribute';
import '../../styles/legacy/route-balancer.css';

/**
 * Faithful port of sp-portal/route-balancer (index.html + route-balancer.css
 * + route-balancer.js + route-balancer-mock.js + route-balancer-board.js).
 *
 * Simplifications (no equivalent client-side Excel library is installed in
 * this SPA — adding SheetJS purely for a mock page was judged out of scope):
 *  - Real .xlsx parsing is NOT implemented. Dropping/selecting a file (or the
 *    "Demo" button) always renders the SAME representative mock result
 *    (dfPre12 / dfPostcodes / dfSizeClass shaped exactly like processData()'s
 *    output), instead of actually reading the uploaded workbook.
 *  - "Download" builds a plain .csv (three labelled sections) client-side
 *    via Blob instead of a real multi-sheet .xlsx workbook (buildExcel()/
 *    SheetJS) — same user-facing action (a file lands in Downloads), just a
 *    different container format.
 *  - The route-balancing board's HTML5 drag-and-drop is skipped per the
 *    porting brief ("skip genuinely complex logic"); the click-to-pick →
 *    click-destination-route interaction (the original's OTHER supported
 *    input mode) is fully implemented instead, so moving a subpostcode
 *    between routes still works.
 *  - The dotted SVG "connector" lines between board cards (drawLinks() in
 *    route-balancer-board.js, computed from live getBoundingClientRect
 *    measurements) are not redrawn dynamically; the empty <svg> container
 *    is kept for structural/CSS fidelity but renders no paths.
 */

type LangKey = 'pt' | 'en';

const I18N: Record<LangKey, Record<string, string>> = {
  pt: {
    uploadPrimary: 'Arraste o(s) ficheiro(s) Excel para aqui',
    uploadOr: 'ou',
    openFinder: 'abrir explorador de ficheiros',
    uploadChangeFile: 'Clique para trocar ficheiros',
    formats: 'Formatos: .xlsx, .xls, .xlsm',
    btnProcess: 'Processar',
    btnNewProcess: 'Novo processamento',
    btnDownload: 'Descarregar',
    btnDone: 'Concluído',
    btnCopy: 'Copiar',
    copied: 'Copiado!',
    previewLabel: 'Preview dos dados',
    previewEmpty: 'Processe um ficheiro para ver o preview das abas Pre-12, Análise de Postcodes e analise_size_class.',
    previewLoading: 'A processar...',
    noData: 'Sem dados',
    records: 'registos',
    areas: 'áreas',
    rows: 'linhas',
    totalDeliveries: 'Total Deliveries',
  },
  en: {
    uploadPrimary: 'Drag the Excel file here',
    uploadOr: 'or',
    openFinder: 'open file explorer',
    uploadChangeFile: 'Click to change file',
    formats: 'Formats: .xlsx, .xls, .xlsm',
    btnProcess: 'Process',
    btnNewProcess: 'New Process',
    btnDownload: 'Download',
    btnDone: 'Done',
    btnCopy: 'Copy',
    copied: 'Copied!',
    previewLabel: 'Data preview',
    previewEmpty: 'Process a file to see the preview of Pre-12, Postcode Analysis and analise_size_class.',
    previewLoading: 'Processing...',
    noData: 'No data',
    records: 'records',
    areas: 'areas',
    rows: 'rows',
    totalDeliveries: 'Total Deliveries',
  },
};

const FIXED_SIZE_CLASS_COLS = ['Subpostcode', 'Soma Phys.', 'Total Pieces', 'Total Shipments', 'COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL 1', 'Total'];

/* ---------- Representative mock result (shape of processData()'s output) ---------- */
const MOCK_POSTCODE_COUNTS: [string, number][] = [
  ['RM1 2', 9], ['RM3 4', 14], ['RM3 8', 11], ['RM4 3', 8], ['RM4 4', 13],
  ['RM6 2', 10], ['RM6 5', 16], ['RM6 8', 12], ['RM7 1', 7], ['RM8 0', 15],
  ['RM8 6', 9], ['RM9 4', 11], ['RM9 9', 13],
];
const MOCK_NAMES = ['Harrow Trading Ltd', 'M. Okafor', 'Bright & Sons', 'Casa do Bacalhau', 'L. Fernandes', 'Riverside Pharmacy', 'The Print Yard', 'K. Szymanska', 'Dagenham Motors', 'Petals & Stems'];
const MOCK_STREETS = ['Market Street', 'Park Lane', 'New Road', 'Bridge Street', 'George Street', 'High Street', 'Manor Road', 'Green Lane'];
const MOCK_SUFFIX = ['AE', 'QR', 'GD', 'WP', 'HZ'];

interface Pre12Row { pc: string; name: string; addr: string }
interface PostcodeRow { sub: string; count: number }
interface SizeClassRow { sub: string; phys: number; pieces: number; shipments: number; coy: number; coyS1: number; coyS2: number; fly: number; ncy: number; pal1: number; total: number }
interface MockResult { dfPre12: Pre12Row[]; dfPostcodes: PostcodeRow[]; dfSizeClass: SizeClassRow[]; totalDeliveries: number }

function buildMockResult(): MockResult {
  const dfPostcodes: PostcodeRow[] = MOCK_POSTCODE_COUNTS.map(([sub, count]) => ({ sub, count }));
  const totalDeliveries = dfPostcodes.reduce((s, r) => s + r.count, 0);

  const dfPre12: Pre12Row[] = [];
  let i = 0;
  for (const [area] of MOCK_POSTCODE_COUNTS) {
    for (let k = 0; k < 2; k++) {
      dfPre12.push({
        pc: `${area}${MOCK_SUFFIX[i % MOCK_SUFFIX.length]}`,
        name: MOCK_NAMES[i % MOCK_NAMES.length],
        addr: `${10 + i * 3} ${MOCK_STREETS[i % MOCK_STREETS.length]}`,
      });
      i++;
    }
  }
  dfPre12.sort((a, b) => a.pc.localeCompare(b.pc));

  const dfSizeClass: SizeClassRow[] = dfPostcodes.map(({ sub, count }) => {
    const coy = Math.round(count * 0.45);
    const coyS1 = Math.round(count * 0.15);
    const coyS2 = Math.round(count * 0.1);
    const fly = Math.round(count * 0.15);
    const ncy = Math.max(0, count - coy - coyS1 - coyS2 - fly);
    const pal1 = 1;
    return {
      sub, phys: Math.round(count * 1.85 * 100) / 100, pieces: count + Math.round(count * 0.3), shipments: count,
      coy, coyS1, coyS2, fly, ncy, pal1, total: coy + coyS1 + coyS2 + fly + ncy + pal1,
    };
  });

  return { dfPre12, dfPostcodes, dfSizeClass, totalDeliveries };
}

function dataToTSV(rows: string[][]): string {
  return rows.map((r) => r.join('\t')).join('\n');
}

/* ---------- Board (route-balancer-board.js) ---------- */
const ROUTE_POOL = ['MD7A', 'MD7B', 'MD7C', 'MD7D', 'MD7E', 'MD7F'];

function paceClass(total: number, target: number): 'ok' | 'warn' | 'over' {
  if (!target) return 'ok';
  const d = Math.abs(total - target) / target;
  if (d <= 0.08) return 'ok';
  if (d <= 0.18) return 'warn';
  return 'over';
}

export function RouteBalancer() {
  useViewportAttribute();

  const [lang, setLang] = useState<LangKey>(() => (localStorage.getItem('route-balancer-lang') as LangKey) || 'pt');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('route-balancer-theme') as 'light' | 'dark') || 'light');
  const [animatingSun, setAnimatingSun] = useState(false);
  const [animatingMoon, setAnimatingMoon] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<MockResult | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [openingForNewProcess, setOpeningForNewProcess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: string) => I18N[lang][key] ?? key;

  const hasFile = files.length > 0;
  const hasResults = result !== null;

  /* Page-scoped body class + data-theme, mirroring AdhocInvoiceManagement's
     pattern — this SPA's shared index.html doesn't set per-route classes. */
  useEffect(() => {
    document.body.classList.add('route-balancer-page');
    return () => document.body.classList.remove('route-balancer-page');
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
    localStorage.setItem('route-balancer-theme', theme);
    return () => document.documentElement.removeAttribute('data-theme');
  }, [theme]);
  useEffect(() => {
    document.body.classList.toggle('rb-file-picked', hasFile);
  }, [hasFile]);
  useEffect(() => {
    document.body.classList.toggle('rb-has-results', hasResults);
  }, [hasResults]);
  useEffect(() => {
    localStorage.setItem('route-balancer-lang', lang);
  }, [lang]);

  /* ---------- Board state ---------- */
  const [routeCount, setRouteCount] = useState(6);
  const [assign, setAssign] = useState<Record<string, number>>({});
  const [picked, setPicked] = useState<string | null>(null);
  const [compare, setCompare] = useState<number[]>([]);

  function rebalance(items: PostcodeRow[], count: number) {
    const totals = new Array(count).fill(0);
    const nextAssign: Record<string, number> = {};
    [...items].sort((a, b) => b.count - a.count).forEach((it) => {
      let min = 0;
      for (let i = 1; i < count; i++) if (totals[i] < totals[min]) min = i;
      nextAssign[it.sub] = min;
      totals[min] += it.count;
    });
    setAssign(nextAssign);
  }

  function routeTotals(items: PostcodeRow[]): number[] {
    const totals = new Array(routeCount).fill(0);
    items.forEach((it) => {
      const r = assign[it.sub];
      if (r != null && r < routeCount) totals[r] += it.count;
    });
    return totals;
  }

  function itemsOf(items: PostcodeRow[], r: number): PostcodeRow[] {
    return items.filter((it) => assign[it.sub] === r).sort((a, b) => b.count - a.count);
  }

  type BestMove = { sub: string; count: number; from: number; to: number; after: number };
  function bestMove(items: PostcodeRow[], a: number, b: number): BestMove | null {
    const totals = routeTotals(items);
    const heavy = totals[a] >= totals[b] ? a : b;
    const light = heavy === a ? b : a;
    const diff = totals[heavy] - totals[light];
    if (diff <= 1) return null;
    let best: BestMove | null = null;
    itemsOf(items, heavy).forEach((it) => {
      const after = Math.abs(diff - 2 * it.count);
      if (after < diff && (!best || after < best.after)) best = { sub: it.sub, count: it.count, from: heavy, to: light, after };
    });
    return best;
  }

  function moveSub(sub: string, to: number) {
    setAssign((prev) => ({ ...prev, [sub]: to }));
    setPicked(null);
  }

  /* ---------- File handling ---------- */
  function acceptFiles(list: File[]) {
    const valid = list.filter((f) => /\.(xlsx|xls|xlsm)$/i.test(f.name));
    if (!valid.length) return;
    setFiles(valid);
    setResult(null);
    setCopiedSection(null);
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const list = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
    acceptFiles(list);
  }

  function onFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    if (!list.length) return;
    acceptFiles(list);
    if (openingForNewProcess) {
      setOpeningForNewProcess(false);
      setTimeout(runProcess, 0);
    }
  }

  function runProcess() {
    if (!files.length && !openingForNewProcess) return;
    setProcessing(true);
    setResult(null);
    window.setTimeout(() => {
      const mock = buildMockResult();
      setResult(mock);
      setProcessing(false);
      const items = mock.dfPostcodes;
      setAssign({});
      setPicked(null);
      setCompare([]);
      rebalance(items, routeCount);
    }, 420);
  }

  function handleMockManifest() {
    const demo = new File([], 'demo-manifesto-MSE.xlsx');
    setFiles([demo]);
    setResult(null);
    setTimeout(runProcess, 0);
  }

  function handleProcessClick() {
    if (result) {
      setOpeningForNewProcess(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        fileInputRef.current.click();
      }
      return;
    }
    runProcess();
  }

  function handleDone() {
    setResult(null);
    setFiles([]);
    setCopiedSection(null);
    setAssign({});
    setPicked(null);
    setCompare([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDownload() {
    if (!result) return;
    const lines: string[] = [];
    lines.push('Pre-12');
    lines.push(dataToTSV([['Postal Code', 'Name', 'Address'], ...result.dfPre12.map((r) => [r.pc, r.name, r.addr])]));
    lines.push('');
    lines.push('Análise de Postcodes');
    lines.push(dataToTSV([['subpostcode', 'total de deliveries'], ...result.dfPostcodes.map((r) => [r.sub, String(r.count)]), ['TOTAL', String(result.totalDeliveries)]]));
    lines.push('');
    lines.push('analise_size_class');
    lines.push(dataToTSV([FIXED_SIZE_CLASS_COLS, ...result.dfSizeClass.map((r) => [r.sub, String(r.phys), String(r.pieces), String(r.shipments), String(r.coy), String(r.coyS1), String(r.coyS2), String(r.fly), String(r.ncy), String(r.pal1), String(r.total)])]));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copySection(section: 'pre12' | 'postcodes' | 'sizeclass') {
    if (!result) return;
    let text = '';
    if (section === 'pre12') text = dataToTSV(result.dfPre12.map((r) => [r.pc, r.name, r.addr]));
    else if (section === 'postcodes') text = dataToTSV(result.dfPostcodes.map((r) => [r.sub, String(r.count)]));
    else text = dataToTSV(result.dfSizeClass.map((r) => [r.sub, String(r.phys), String(r.pieces), String(r.shipments), String(r.coy), String(r.coyS1), String(r.coyS2), String(r.fly), String(r.ncy), String(r.pal1), String(r.total)]));
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    }).catch(() => {});
  }

  function applyTheme(next: 'light' | 'dark') {
    if (theme !== next) {
      if (next === 'light') { setAnimatingSun(true); setTimeout(() => setAnimatingSun(false), 1000); }
      else { setAnimatingMoon(true); setTimeout(() => setAnimatingMoon(false), 1000); }
    }
    setTheme(next);
  }

  const items = result?.dfPostcodes ?? [];
  const totals = routeTotals(items);
  const grandTotal = items.reduce((s, it) => s + it.count, 0);
  const target = routeCount ? Math.round(grandTotal / routeCount) : 0;
  const pickedItem = picked ? items.find((i) => i.sub === picked) : null;

  function toggleCompare(r: number) {
    setCompare((prev) => {
      const i = prev.indexOf(r);
      if (i !== -1) return prev.filter((x) => x !== r);
      const next = [...prev, r];
      return next.length > 2 ? next.slice(1) : next;
    });
  }

  function exportBoardCsv() {
    const rows: string[][] = [['Route', 'Subpostcode', 'Deliveries']];
    for (let r = 0; r < routeCount; r++) {
      itemsOf(items, r).forEach((it) => rows.push([ROUTE_POOL[r], it.sub, String(it.count)]));
      rows.push([`${ROUTE_POOL[r]} TOTAL`, '', String(totals[r])]);
    }
    rows.push(['TOTAL', '', String(grandTotal)]);
    const blob = new Blob([dataToTSV(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'route-split.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalLayout mainClassName="route-balancer-container" title="Route Balancer">
      {/* ============ Custom page header (brand + toolbar), kept from the original ============ */}
      <div className="page-header">
        <div className="brand">
          <div className="logo-wrap">
            <img className="logo" alt="DHL" src="/dhl-uk-logo.png" />
          </div>
          <div className="header-title">
            <span className="rb-eyebrow">TBX &middot; Depot MSE &middot; Daily balance</span>
          </div>
        </div>
        <div className="toolbar" role="toolbar" aria-label="Route Balancer controls">
          <button type="button" className={`toolbar-btn${lang === 'pt' ? ' active' : ''}`} aria-label="Português" onClick={() => setLang('pt')}>PT</button>
          <button type="button" className={`toolbar-btn${lang === 'en' ? ' active' : ''}`} aria-label="English" onClick={() => setLang('en')}>EN</button>
          <span className="toolbar-sep" />
          <button type="button" className={`toolbar-btn${theme === 'light' ? ' active' : ''}${animatingSun ? ' animating-sun' : ''}`} aria-label="Modo claro" onClick={() => applyTheme('light')}>
            <span className="theme-icon theme-icon-sun" aria-hidden="true">☀</span>
          </button>
          <button type="button" id="btnThemeDark" className={`toolbar-btn${theme === 'dark' ? ' active' : ''}${animatingMoon ? ' animating-moon' : ''}`} aria-label="Modo escuro" onClick={() => applyTheme('dark')}>
            <span className="theme-icon theme-icon-moon" aria-hidden="true">☾</span>
            <span className="theme-stars" aria-hidden="true">
              <span className="star" /><span className="star" /><span className="star" /><span className="star" /><span className="star" /><span className="star" />
            </span>
          </button>
          <span className="toolbar-sep" />
          <button type="button" className="toolbar-btn" aria-label="Atualizar página" title="Atualizar página" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="rb-routeline" aria-hidden="true">
        <svg viewBox="0 0 1200 44" preserveAspectRatio="none" focusable="false">
          <path id="rbRoutePath" d="M0,34 C180,34 220,10 400,10 S640,34 820,34 S1080,10 1200,10" fill="none" />
          <circle className="rb-routeline-dot" r={5}>
            <animateMotion dur="9s" repeatCount="indefinite" rotate="auto"><mpath href="#rbRoutePath" /></animateMotion>
          </circle>
        </svg>
      </div>

      <p className="subtitle" id="textSubtitle" />

      <ol className="rb-steps" aria-label="Balance pipeline">
        <li className="rb-step rb-step--manifest">
          <span className="rb-step-num" />
          <span className="rb-step-text"><strong>Manifest</strong><small>Drop the Excel manifest</small></span>
        </li>
        <li className="rb-step rb-step--balance">
          <span className="rb-step-num">02</span>
          <span className="rb-step-text"><strong>Balance</strong><small>Process and review the split</small></span>
        </li>
        <li className="rb-step rb-step--dispatch">
          <span className="rb-step-num">03</span>
          <span className="rb-step-text"><strong>Dispatch</strong><small>Download the workbook</small></span>
        </li>
      </ol>

      <div className={`app-layout row g-4 align-items-start${hasFile ? ' has-file' : ''}`} id="appLayout">
        <aside className="app-sidebar col-12 col-xl-4 col-xxl-3">
          <div className="card liquid-glass-card">
            <div
              className={`upload-zone${dragOver ? ' dragover' : ''}${hasFile ? ' has-file' : ''}`}
              id="dropZone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input ref={fileInputRef} type="file" id="fileInput" accept=".xlsx,.xls,.xlsm" multiple onChange={onFileInputChange} />
              <div className="rb-dock-chips" aria-hidden="true">
                <span>RM 9 9AE</span><span>RM 4 3QR</span><span>RM 8 0WP</span><span>RM 6 5GY</span><span>RM 3 8ES</span><span>RM 7 1TD</span>
              </div>
              <div className="rb-dock-icon" aria-hidden="true"><i className="bi bi-box-seam" /></div>
              <p className="primary" id="textUploadPrimary" title={hasFile ? files.map((f) => f.name).join(', ') : undefined}>
                {hasFile ? (files.length === 1 ? files[0].name : `${files.length} ficheiros`) : t('uploadPrimary')}
              </p>
              <p id="textUploadOr">
                {hasFile ? (
                  <span className="open-finder" id="textOpenFinder">{t('uploadChangeFile')}</span>
                ) : (
                  <>{t('uploadOr')} <span className="open-finder" id="textOpenFinder">{t('openFinder')}</span></>
                )}
              </p>
              <p id="textFormats">{t('formats')}</p>
            </div>
            <button type="button" className="rb-mock-btn" id="btnMockManifest" onClick={handleMockManifest}>
              <i className="bi bi-magic" aria-hidden="true" /> Demo &middot; manifesto MSE
            </button>
            <div className="btn-wrap">
              <button className="btn" id="btnProcess" disabled={!hasFile} onClick={handleProcessClick}>
                {result ? t('btnNewProcess') : t('btnProcess')}
              </button>
            </div>
            <div className={`btn-download-wrap${result ? ' visible' : ''}`} id="btnDownloadWrap">
              <button className="btn" id="btnDownload" onClick={handleDownload}>{t('btnDownload')}</button>
              <button className="btn btn-secondary" id="btnDone" onClick={handleDone}>{t('btnDone')}</button>
            </div>
          </div>
        </aside>

        <section className="app-main col-12 col-xl-8 col-xxl-9" aria-label="Route Balancer preview">
          <div className={`dashboard-wrap${result ? ' show-results' : ''}`} id="dashboardWrap">
            {result && (
              <div className="summary" id="summary">
                <div className="summary-item"><strong>Pre-12</strong>{result.dfPre12.length} {t('records')}</div>
                <div className="summary-item"><strong>Postcodes</strong>{result.dfPostcodes.length} {t('areas')}</div>
                <div className="summary-item"><strong>Size Class</strong>{result.dfSizeClass.length} {t('rows')}</div>
                <div className="summary-item"><strong>{t('totalDeliveries')}</strong>{result.totalDeliveries}</div>
              </div>
            )}
          </div>

          <div className={`card liquid-glass-card${result ? ' show-results' : ''}`} id="mainCard">
            <p className="preview-label" id="textPreviewLabel">{t('previewLabel')}</p>

            {!processing && !result && <div id="previewEmpty" className="preview-empty">{t('previewEmpty')}</div>}
            {processing && <div id="previewLoading" className="preview-loading">{t('previewLoading')}</div>}

            {processing && (
              <div id="previewSkeleton" className="preview-skeleton visible">
                <div className="skeleton-section">
                  <div className="skeleton-header" />
                  <div className="skeleton-table">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div className="skeleton-row" key={i}><span className="skeleton-cell w-1" /><span className="skeleton-cell w-2" /><span className="skeleton-cell w-3" /></div>
                    ))}
                  </div>
                </div>
                <div className="skeleton-section">
                  <div className="skeleton-header" />
                  <div className="skeleton-table">
                    {[0, 1, 2, 3].map((i) => (
                      <div className="skeleton-row" key={i}><span className="skeleton-cell w-1" /><span className="skeleton-cell w-2" /></div>
                    ))}
                  </div>
                </div>
                <div className="skeleton-section">
                  <div className="skeleton-header" />
                  <div className="skeleton-table">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div className="skeleton-row" key={i}><span className="skeleton-cell w-1" /><span className="skeleton-cell w-2" /><span className="skeleton-cell w-2" /></div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div id="previewError" className="preview-error" style={{ display: 'none' }} />

            <div id="previewWrap" className={`preview-wrap${result ? ' visible' : ''}`}>
              <div className="preview-section">
                <div className="preview-section-header">
                  <div className="preview-title">Pre-12</div>
                  <button type="button" className="btn-copy-section" data-section="pre12" disabled={!result} title="Copiar Pre-12" onClick={() => copySection('pre12')}>
                    <i className="bi bi-clipboard" aria-hidden="true" /> <span className="btn-copy-section-text">{copiedSection === 'pre12' ? t('copied') : t('btnCopy')}</span>
                  </button>
                </div>
                <div className="preview-table-wrap" id="previewPre12">
                  {result && (result.dfPre12.length ? (
                    <table className="preview-table">
                      <thead><tr><th>Postal Code</th><th>Name</th><th>Address</th></tr></thead>
                      <tbody>{result.dfPre12.map((r, i) => (<tr key={i}><td>{r.pc}</td><td>{r.name}</td><td>{r.addr}</td></tr>))}</tbody>
                    </table>
                  ) : <p className="preview-empty">{t('noData')}</p>)}
                </div>
              </div>
              <div className="preview-section">
                <div className="preview-section-header">
                  <div className="preview-title">Análise de Postcodes</div>
                  <button type="button" className="btn-copy-section" data-section="postcodes" disabled={!result} title="Copiar Postcodes" onClick={() => copySection('postcodes')}>
                    <i className="bi bi-clipboard" aria-hidden="true" /> <span className="btn-copy-section-text">{copiedSection === 'postcodes' ? t('copied') : t('btnCopy')}</span>
                  </button>
                </div>
                <div className="preview-table-wrap" id="previewPostcodes">
                  {result && (
                    <table className="preview-table">
                      <thead><tr><th>subpostcode</th><th>total de deliveries</th></tr></thead>
                      <tbody>
                        {result.dfPostcodes.map((r) => (<tr key={r.sub}><td>{r.sub}</td><td>{r.count}</td></tr>))}
                        <tr><td>TOTAL</td><td>{result.totalDeliveries}</td></tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
              <div className="preview-section">
                <div className="preview-section-header">
                  <div className="preview-title">analise_size_class</div>
                  <button type="button" className="btn-copy-section" data-section="sizeclass" disabled={!result} title="Copiar Size Class" onClick={() => copySection('sizeclass')}>
                    <i className="bi bi-clipboard" aria-hidden="true" /> <span className="btn-copy-section-text">{copiedSection === 'sizeclass' ? t('copied') : t('btnCopy')}</span>
                  </button>
                </div>
                <div className="preview-table-wrap" id="previewSizeClass">
                  {result && (
                    <table className="preview-table">
                      <thead><tr>{FIXED_SIZE_CLASS_COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>
                        {result.dfSizeClass.map((r) => (
                          <tr key={r.sub}>
                            <td>{r.sub}</td><td>{r.phys}</td><td>{r.pieces}</td><td>{r.shipments}</td>
                            <td>{r.coy}</td><td>{r.coyS1}</td><td>{r.coyS2}</td><td>{r.fly}</td><td>{r.ncy}</td><td>{r.pal1}</td><td>{r.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>

          {result && items.length > 0 && (
            <section id="rbBoard" className="card liquid-glass-card rb-board" aria-label="Route balancing board">
              <div className="rb-board-head">
                <div>
                  <p className="rb-board-title"><i className="bi bi-arrows-move" aria-hidden="true" /> Balancear rotas</p>
                  <p className="rb-board-hint" id="rbBoardHint">
                    {pickedItem ? (
                      <>A mover <strong>{pickedItem.sub}</strong> ({pickedItem.count}) — clique na rota de destino, ou na ficha para cancelar.</>
                    ) : (
                      <>Clique numa ficha e depois na rota de destino. Alvo por rota: <strong>{target}</strong> deliveries. Use ⇄ para comparar duas rotas.</>
                    )}
                  </p>
                </div>
                <div className="rb-board-controls">
                  <label className="rb-board-count">Rotas
                    <select id="rbRouteCount" value={routeCount} onChange={(e) => {
                      const n = Math.max(2, Math.min(6, Number(e.target.value) || 4));
                      setRouteCount(n);
                      setCompare((prev) => prev.filter((r) => r < n));
                      setPicked(null);
                      rebalance(items, n);
                    }}>
                      {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <button type="button" className="rb-board-btn" id="rbRebalance" onClick={() => { setPicked(null); rebalance(items, routeCount); }}>
                    <i className="bi bi-stars" aria-hidden="true" /> Rebalancear
                  </button>
                  <button type="button" className="rb-board-btn" id="rbExport" onClick={exportBoardCsv}>
                    <i className="bi bi-download" aria-hidden="true" /> Exportar .xlsx
                  </button>
                </div>
              </div>

              {compare.length === 2 && (() => {
                const [a, b] = compare;
                const diff = totals[a] - totals[b];
                const move = bestMove(items, a, b);
                return (
                  <div className="rb-compare">
                    {[a, b].map((r, idx) => (
                      <>
                        <div key={r} className={`rb-compare-side rb-compare-side--${paceClass(totals[r], target)}`}>
                          <span className="rb-compare-route">{ROUTE_POOL[r]}</span>
                          <span className="rb-compare-total">{totals[r]}</span>
                          <span className="rb-compare-areas">{itemsOf(items, r).length} áreas</span>
                        </div>
                        {idx === 0 && <div className="rb-compare-vs">vs</div>}
                      </>
                    ))}
                    {move ? (
                      <div className="rb-compare-suggest">
                        <span>Δ {Math.abs(diff)} — mover <strong>{move.sub}</strong> ({move.count}) de {ROUTE_POOL[move.from]} para {ROUTE_POOL[move.to]} reduz para Δ {move.after}</span>
                        <button type="button" className="rb-board-btn rb-board-btn--amber" id="rbApplyMove" onClick={() => moveSub(move.sub, move.to)}>Aplicar</button>
                      </div>
                    ) : (
                      <div className="rb-compare-suggest"><span>Δ {Math.abs(diff)} — rotas equilibradas, nenhum movimento melhora.</span></div>
                    )}
                  </div>
                );
              })()}

              <div className="rb-board-grid-wrap">
                <svg className="rb-board-links" aria-hidden="true" />
                <div className="rb-board-grid">
                  {Array.from({ length: routeCount }).map((_, r) => {
                    const pace = paceClass(totals[r], target);
                    const comparing = compare.includes(r);
                    const receivable = !!pickedItem && assign[pickedItem.sub] !== r;
                    return (
                      <section
                        key={r}
                        className={`rb-route-col${comparing ? ' is-compared' : ''}${receivable ? ' is-receivable' : ''}`}
                        aria-label={ROUTE_POOL[r]}
                        onClick={() => { if (picked && assign[picked] !== r) moveSub(picked, r); }}
                      >
                        <header className={`rb-route-col-head rb-route-col-head--${pace}`}>
                          <span className="rb-route-name">{ROUTE_POOL[r]}</span>
                          <span className="rb-route-head-right">
                            <span className="rb-route-total">{totals[r]}<small>/{target}</small></span>
                            <button type="button" className={`rb-route-compare-btn${comparing ? ' is-on' : ''}`} title="Comparar esta rota" aria-pressed={comparing} onClick={(e) => { e.stopPropagation(); toggleCompare(r); }}>&#8644;</button>
                          </span>
                        </header>
                        <div className="rb-route-meter">
                          <span className={`rb-route-meter-fill rb-route-meter-fill--${pace}`} style={{ width: `${Math.min(100, target ? Math.round((totals[r] / (target * 1.5)) * 100) : 0)}%` }} />
                        </div>
                        {receivable && (
                          <button type="button" className="rb-route-receive" onClick={(e) => { e.stopPropagation(); if (picked) moveSub(picked, r); }}>
                            Receber {pickedItem?.sub} aqui
                          </button>
                        )}
                        <ul className="rb-route-list">
                          {itemsOf(items, r).map((it) => (
                            <li
                              key={it.sub}
                              className={`rb-chip${picked === it.sub ? ' is-picked' : ''}`}
                              tabIndex={0}
                              role="button"
                              aria-pressed={picked === it.sub}
                              title="Clique para mover"
                              onClick={(e) => { e.stopPropagation(); setPicked((p) => (p === it.sub ? null : it.sub)); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked((p) => (p === it.sub ? null : it.sub)); } }}
                            >
                              <span className="rb-chip-sub">{it.sub}</span>
                              <span className="rb-chip-count">{it.count}</span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  })}
                </div>
              </div>
            </section>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}
