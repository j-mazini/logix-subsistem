import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PortalLayout } from '../../layout/PortalLayout';
import '../../styles/legacy/route-balance.css';
import './route-balance-upload.css';
import {
  buildDiscoExcel, buildRouteRowsFromStops, FIXED_SIZE_CLASS_COLS, processDiscoFiles, ROUTE_BALANCE_SESSION_KEY,
} from './discoProcessing';
import type { DiscoProcessResult } from './discoProcessing';

const VALID_EXT = /\.(xlsx|xls|xlsm)$/i;

function filterValid(files: File[]): File[] {
  return files.filter((f) => VALID_EXT.test(f.name));
}

function tableFromRows(rows: Record<string, unknown>[], columns: string[]) {
  if (!rows.length) return <p className="disco-preview-empty">No data</p>;
  return (
    <div className="disco-preview-table-wrap">
      <table className="disco-preview-table">
        <thead>
          <tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{columns.map((c) => <td key={c}>{r[c] != null ? String(r[c]) : ''}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toTSV(rows: Record<string, unknown>[], columns: string[], skip?: (r: Record<string, unknown>) => boolean): string {
  const lines: string[] = [];
  for (const r of rows) {
    if (skip?.(r)) continue;
    lines.push(columns.map((c) => (r[c] != null ? String(r[c]) : '')).join('\t'));
  }
  return lines.join('\n');
}

export function RouteBalanceUpload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DiscoProcessResult | null>(null);
  const [builtExcel, setBuiltExcel] = useState<ArrayBuffer | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.body.classList.add('route-balance-page');
    return () => { document.body.classList.remove('route-balance-page'); };
  }, []);

  function acceptFiles(list: File[]) {
    const valid = filterValid(list);
    if (!valid.length) {
      setError('Select a .xlsx, .xls or .xlsm file');
      return;
    }
    setFiles(valid);
    setError(null);
    setResult(null);
    setBuiltExcel(null);
  }

  async function runProcess() {
    if (!files.length) return;
    setProcessing(true);
    setError(null);
    try {
      const r = await processDiscoFiles(files);
      const excel = buildDiscoExcel(r);
      setResult(r);
      setBuiltExcel(excel);
    } catch (err) {
      setResult(null);
      setBuiltExcel(null);
      setError(err instanceof Error && err.message === 'READ_ERROR' ? 'Failed to read file' : String(err));
    } finally {
      setProcessing(false);
    }
  }

  function downloadExcel() {
    if (!builtExcel) return;
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const blob = new Blob([builtExcel], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Data_${date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copySection(section: 'pre12' | 'postcodes' | 'sizeclass') {
    if (!result) return;
    let text = '';
    if (section === 'pre12') text = toTSV(result.dfPre12, ['Postal Code', 'Name', 'Address']);
    else if (section === 'postcodes') text = toTSV(result.dfPostcodes, ['subpostcode', 'total de deliveries'], (r) => String(r.subpostcode).toUpperCase() === 'TOTAL');
    else text = toTSV(result.dfSizeClass, FIXED_SIZE_CLASS_COLS, (r) => String(r.Subpostcode).toUpperCase() === 'TOTAL');
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    }).catch(() => {});
  }

  function continueToRouteBalance() {
    if (!result) return;
    const routes = buildRouteRowsFromStops(result.dfStops);
    sessionStorage.setItem(ROUTE_BALANCE_SESSION_KEY, JSON.stringify(routes));
    navigate('/route-balance', { state: { routes } });
  }

  const fileNames = files.length === 1 ? files[0].name : `${files.length} files`;

  return (
    <PortalLayout mainClassName="route-balance-container container-fluid px-3 px-lg-4 py-4" title="Route Balance — Import">
      <div className="disco-upload">
        <p className="disco-upload-subtitle">
          Upload the DISCO export to build today&apos;s stops for Route Balance — extracts Pre-12, postcode totals and size-class breakdown, and seeds the routes below.
        </p>

        <div className="disco-upload-layout">
          <aside className="disco-upload-card">
            <div
              className={`disco-drop-zone ${dragging ? 'dragging' : ''} ${files.length ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                acceptFiles([...e.dataTransfer.files]);
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => { if (e.target.files) acceptFiles([...e.target.files]); e.target.value = ''; }}
              />
              <i className="bi bi-cloud-arrow-up disco-drop-icon" />
              <p className="disco-drop-primary" title={files.length ? files.map((f) => f.name).join(', ') : undefined}>
                {files.length ? fileNames : 'Drag the DISCO Excel file here'}
              </p>
              <p className="disco-drop-secondary">
                {files.length ? 'Click to change file' : (<>or <span className="disco-drop-link">open file explorer</span></>)}
              </p>
              <p className="disco-drop-formats">Formats: .xlsx, .xls, .xlsm</p>
            </div>

            <button type="button" className="styled-button styled-button--primary disco-process-btn" disabled={!files.length || processing} onClick={runProcess}>
              {processing ? 'Processing…' : (result ? 'Reprocess' : 'Process')}
            </button>

            {result && (
              <div className="disco-actions">
                <button type="button" className="styled-button styled-button--outline" onClick={downloadExcel}>
                  <i className="bi bi-download" /> Download Excel
                </button>
                <button type="button" className="styled-button styled-button--success" onClick={continueToRouteBalance}>
                  <i className="bi bi-arrow-right-circle" /> Continue to Route Balance
                </button>
              </div>
            )}
          </aside>

          <main className="disco-main-card">
            {error && <div className="disco-error"><i className="bi bi-exclamation-triangle-fill" /> {error}</div>}

            {!result && !processing && !error && (
              <div className="disco-preview-empty-state">
                <i className="bi bi-file-earmark-spreadsheet" />
                <p>Process a file to preview Pre-12, Postcode Analysis and Size Class.</p>
              </div>
            )}

            {processing && (
              <div className="disco-preview-empty-state">
                <div className="spinner" aria-hidden="true" />
                <p>Processing…</p>
              </div>
            )}

            {result && !processing && (
              <>
                <div className="disco-summary">
                  <div className="disco-summary-item"><strong>Pre-12</strong>{result.dfPre12.length} records</div>
                  <div className="disco-summary-item"><strong>Postcodes</strong>{result.deliveriesCount} areas</div>
                  <div className="disco-summary-item"><strong>Size Class</strong>{result.dfSizeClass.length} rows</div>
                  <div className="disco-summary-item"><strong>Total Deliveries</strong>{result.totalDeliveries}</div>
                </div>

                <section className="disco-preview-section">
                  <div className="disco-preview-section-header">
                    <span className="disco-preview-title">Pre-12</span>
                    <button type="button" className="disco-copy-btn" onClick={() => copySection('pre12')}>
                      <i className="bi bi-clipboard" /> {copiedSection === 'pre12' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {tableFromRows(result.dfPre12, ['Postal Code', 'Name', 'Address'])}
                </section>

                <section className="disco-preview-section">
                  <div className="disco-preview-section-header">
                    <span className="disco-preview-title">Análise de Postcodes</span>
                    <button type="button" className="disco-copy-btn" onClick={() => copySection('postcodes')}>
                      <i className="bi bi-clipboard" /> {copiedSection === 'postcodes' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {tableFromRows(result.dfPostcodes, ['subpostcode', 'total de deliveries'])}
                </section>

                <section className="disco-preview-section">
                  <div className="disco-preview-section-header">
                    <span className="disco-preview-title">analise_size_class</span>
                    <button type="button" className="disco-copy-btn" onClick={() => copySection('sizeclass')}>
                      <i className="bi bi-clipboard" /> {copiedSection === 'sizeclass' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {tableFromRows(result.dfSizeClass, FIXED_SIZE_CLASS_COLS)}
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </PortalLayout>
  );
}
