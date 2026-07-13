    (function () {
      const POSTCODES_EXCLUDE = ['SE17EH', 'SE77RU'];
      const TARGET_PRODUCTS = ['C', 'T', 'K', 'X', 'Y', '1', 'Q'];
      const NAME_KEYS = ['Name.1', 'Name', 'Company Name', 'Customer Name', 'Client Name'];

      const i18n = {
        pt: {
          subtitle: '',
          uploadPrimary: 'Arraste o(s) ficheiro(s) Excel para aqui',
          uploadOr: 'ou',
          openFinder: 'abrir explorador de ficheiros',
          uploadChangeFile: 'Clique para trocar ficheiros',
          uploadFilesCount: '{n} ficheiros',
          formats: 'Formatos: .xlsx, .xls, .xlsm',
          btnProcess: 'Processar',
          btnNewProcess: 'Novo processamento',
          btnDownload: 'Descarregar',
          btnDone: 'Concluído',
          btnRefresh: 'Atualizar página',
          btnCopy: 'Copiar',
          copied: 'Copiado!',
          previewLabel: 'Preview dos dados',
          previewEmpty: 'Processe um ficheiro para ver o preview das abas Pre-12, Análise de Postcodes e analise_size_class.',
          previewLoading: 'A processar...',
          errorFileType: 'Selecione um ficheiro .xlsx, .xls ou .xlsm',
          error: 'Erro: ',
          readError: 'Falha ao ler ficheiro',
          noData: 'Sem dados',
          andMoreRows: '… e mais {n} linhas',
          records: 'registos',
          areas: 'áreas',
          rows: 'linhas',
          totalDeliveries: 'Total Deliveries'
        },
        en: {
          subtitle: '',
          uploadPrimary: 'Drag the Excel file here',
          uploadOr: 'or',
          openFinder: 'open file explorer',
          uploadChangeFile: 'Click to change file',
          formats: 'Formats: .xlsx, .xls, .xlsm',
          btnProcess: 'Process',
          btnNewProcess: 'New Process',
          btnDownload: 'Download',
          btnDone: 'Done',
          btnRefresh: 'Refresh page',
          btnCopy: 'Copy',
          copied: 'Copied!',
          previewLabel: 'Data preview',
          previewEmpty: 'Process a file to see the preview of Pre-12, Postcode Analysis and analise_size_class.',
          previewLoading: 'Processing...',
          errorFileType: 'Select a .xlsx, .xls or .xlsm file',
          error: 'Error: ',
          readError: 'Failed to read file',
          noData: 'No data',
          andMoreRows: '… and {n} more rows',
          records: 'records',
          areas: 'areas',
          rows: 'rows',
          totalDeliveries: 'Total Deliveries'
        }
      };
      let currentLang = localStorage.getItem('route-balancer-lang') || 'pt';
      /* No portal o tema padrão é claro, alinhado ao restante do Service Provider Portal */
      let currentTheme = localStorage.getItem('route-balancer-theme') || 'light';
      let currentFiles = [];
      let lastBuiltExcel = null;
      let lastResult = null;
      let openingFileForNewProcess = false;

      function t(key) {
        const str = (i18n[currentLang] || i18n.pt)[key];
        return str != null ? str : (i18n.pt[key] || key);
      }
      function tpl(key, vars) {
        let str = t(key);
        if (vars) for (const k in vars) str = str.replace(new RegExp('\\{' + k + '\\}', 'g'), vars[k]);
        return str;
      }
      function updateUploadZoneDisplay() {
        const primaryEl = document.getElementById('textUploadPrimary');
        const orEl = document.getElementById('textUploadOr');
        if (!primaryEl || !orEl) return;
        if (currentFiles.length) {
          primaryEl.textContent = currentFiles.length === 1 ? currentFiles[0].name : tpl('uploadFilesCount', { n: currentFiles.length });
          primaryEl.title = currentFiles.length === 1 ? currentFiles[0].name : currentFiles.map(f => f.name).join(', ');
          orEl.innerHTML = '<span class="open-finder" id="textOpenFinder">' + t('uploadChangeFile') + '</span>';
          document.getElementById('dropZone').classList.add('has-file');
          document.body.classList.add('rb-file-picked');
        } else {
          primaryEl.textContent = t('uploadPrimary');
          primaryEl.removeAttribute('title');
          orEl.innerHTML = t('uploadOr') + ' <span class="open-finder" id="textOpenFinder">' + t('openFinder') + '</span>';
          document.getElementById('dropZone').classList.remove('has-file');
          document.body.classList.remove('rb-file-picked');
        }
        document.getElementById('textFormats').textContent = t('formats');
      }
      function applyLanguage(lang) {
        currentLang = lang;
        localStorage.setItem('route-balancer-lang', lang);
        document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
        document.getElementById('textSubtitle').textContent = t('subtitle');
        updateUploadZoneDisplay();
        document.getElementById('btnProcess').textContent = lastResult ? t('btnNewProcess') : t('btnProcess');
        const btnDownloadEl = document.getElementById('btnDownload');
        if (btnDownloadEl) btnDownloadEl.textContent = t('btnDownload');
        const btnDoneEl = document.getElementById('btnDone');
        if (btnDoneEl) btnDoneEl.textContent = t('btnDone');
        document.querySelectorAll('.btn-copy-section-text').forEach(el => { el.textContent = t('btnCopy'); });
        document.getElementById('textPreviewLabel').textContent = t('previewLabel');
        document.getElementById('previewEmpty').textContent = t('previewEmpty');
        document.getElementById('previewLoading').textContent = t('previewLoading');
        document.getElementById('btnLangPt').classList.toggle('active', lang === 'pt');
        document.getElementById('btnLangEn').classList.toggle('active', lang === 'en');
      }
      function applyTheme(theme, playAnimation) {
        const btnLight = document.getElementById('btnThemeLight');
        const btnDark = document.getElementById('btnThemeDark');
        const isSwitch = playAnimation && currentTheme !== theme;
        btnLight.classList.remove('animating-sun');
        btnDark.classList.remove('animating-moon');
        if (isSwitch && theme === 'light') {
          btnLight.classList.add('animating-sun');
        } else if (isSwitch && theme === 'dark') {
          btnDark.classList.add('animating-moon');
        }
        currentTheme = theme;
        localStorage.setItem('route-balancer-theme', theme);
        document.documentElement.setAttribute('data-theme', theme === 'light' ? 'light' : '');
        btnLight.classList.toggle('active', theme === 'light');
        btnDark.classList.toggle('active', theme === 'dark');
        if (isSwitch) {
          setTimeout(() => {
            btnLight.classList.remove('animating-sun');
            btnDark.classList.remove('animating-moon');
          }, 1000);
        }
      }
      document.getElementById('btnLangPt').addEventListener('click', () => applyLanguage('pt'));
      document.getElementById('btnLangEn').addEventListener('click', () => applyLanguage('en'));
      document.getElementById('btnThemeLight').addEventListener('click', () => applyTheme('light', true));
      document.getElementById('btnThemeDark').addEventListener('click', () => applyTheme('dark', true));
      document.getElementById('btnRefresh').addEventListener('click', () => location.reload());
      applyLanguage(currentLang);
      applyTheme(currentTheme, false);

      function renderPreview(dfPre12, dfPostcodes, dfSizeClass) {
        function escape(str) {
          return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
        }
        function tableFromRows(rows, columns) {
          if (!rows.length) return '<p class="preview-empty">' + t('noData') + '</p>';
          const cols = columns || Object.keys(rows[0]);
          let html = '<table class="preview-table"><thead><tr>';
          for (const c of cols) html += '<th>' + escape(c) + '</th>';
          html += '</tr></thead><tbody>';
          for (let i = 0; i < rows.length; i++) {
            html += '<tr>';
            for (const c of cols) html += '<td>' + escape(rows[i][c]) + '</td>';
            html += '</tr>';
          }
          html += '</tbody></table>';
          return html;
        }
        document.getElementById('previewPre12').innerHTML = tableFromRows(dfPre12 || [], ['Postal Code', 'Name', 'Address']);
        document.getElementById('previewPostcodes').innerHTML = tableFromRows(dfPostcodes || [], ['subpostcode', 'total de deliveries']);
        document.getElementById('previewSizeClass').innerHTML = tableFromRows(dfSizeClass || [], FIXED_SIZE_CLASS_COLS);
      }

      function findColumn(obj, candidates, partials) {
        const keys = Object.keys(obj);
        for (const c of candidates) {
          if (keys.includes(c)) return c;
        }
        for (const p of partials) {
          const k = keys.find(x => String(x).toUpperCase().includes(p));
          if (k) return k;
        }
        return null;
      }

      function normalizeCompanyName(name) {
        if (name == null || name === '') return '';
        let n = String(name).toUpperCase().trim();
        const remove = ['C/O', 'CO', 'LTD', 'LIMITED', 'SERVICES', 'SERVICE', 'UK', 'GB', 'GLOBAL', 'LOGISTICS', 'LOGISTIC', '(', ')', '.', ',', '-', '_'];
        for (const t of remove) n = n.split(t).join(' ');
        n = n.split(/\s+/).filter(w => w.length > 1).join(' ').trim();
        return n;
      }

      function similarity(a, b) {
        if (a == null || b == null) return 0;
        const na = normalizeCompanyName(a);
        const nb = normalizeCompanyName(b);
        if (!na || !nb) return 0;
        if (na === nb) return 1;
        const w1 = new Set(na.split(/\s+/));
        const w2 = new Set(nb.split(/\s+/));
        const common = [...w1].filter(w => w.length > 3 && w2.has(w));
        if (common.length >= 2) return 1;
        if (w1.size === 1 && w2.size === 1) {
          const s1 = [...w1][0], s2 = [...w2][0];
          let matches = 0, len = Math.max(s1.length, s2.length);
          for (let i = 0; i < len; i++) if (s1[i] === s2[i]) matches++;
          return matches / len;
        }
        return 0;
      }

      function similarNames(a, b) {
        return similarity(a, b) > 0.85 || (normalizeCompanyName(a) === normalizeCompanyName(b));
      }

      function removeSimilarNames(rows, nameKey, postalKey) {
        const out = [];
        const byPostcode = {};
        for (const r of rows) {
          const pc = (r[postalKey] != null ? String(r[postalKey]) : '').toUpperCase().trim();
          if (!byPostcode[pc]) byPostcode[pc] = [];
          byPostcode[pc].push({ ...r });
        }
        let blankNum = 1;
        for (const pc of Object.keys(byPostcode)) {
          const group = byPostcode[pc];
          const kept = [];
          for (const row of group) {
            let name = row[nameKey];
            if (name == null || String(name).trim() === '') {
              name = 'SEM NOME ' + blankNum++;
              row[nameKey] = name;
            }
            let dup = false;
            for (const k of kept) {
              if (similarNames(k[nameKey], name)) { dup = true; break; }
            }
            if (!dup) {
              kept.push(row);
              out.push(row);
            }
          }
        }
        return out;
      }

      function processPostcode(postcode) {
        let s = String(postcode || '').replace(/\s/g, '').toUpperCase().slice(0, 5);
        let base = s.slice(0, 4);
        if (s.length > 4 && /\d/.test(s[4])) base = s.slice(0, 5);
        if (base.length > 1) base = base.slice(0, -1) + ' ' + base.slice(-1);
        return base;
      }

      function formatSubpostcode(postcode) {
        let s = String(postcode || '').replace(/\s/g, '').toUpperCase();
        if (s.length < 2) return s;
        s = s.slice(0, -2);
        if (s.length >= 2) s = s.slice(0, -1) + ' ' + s.slice(-1);
        return s;
      }

      function readExcelFile(file) {
        return new Promise((resolve, reject) => {
          const r = new FileReader();
          r.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const wb = XLSX.read(data, { type: 'array' });
              const first = wb.SheetNames[0];
              const ws = wb.Sheets[first];
              const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
              if (raw.length < 2) { resolve({ header: [], rows: [] }); return; }
              const header = raw[1];
              const rows = [];
              for (let i = 2; i < raw.length; i++) {
                const row = {};
                for (let j = 0; j < header.length; j++) row[header[j]] = raw[i][j];
                rows.push(row);
              }
              resolve({ header, rows });
            } catch (err) { reject(err); }
          };
          r.onerror = () => reject(new Error('READ_ERROR'));
          r.readAsArrayBuffer(file);
        });
      }

      function processData(rows, nameKey, postalKey, addressKey, productKey, bookingTypeKey, sizeClassKey, physKey, totalPiecesKey) {
        const upper = (v) => (v != null ? String(v).toUpperCase().trim() : '');
        let df = rows.map(r => ({ ...r }));

        for (const r of df) {
          r[postalKey] = upper(r[postalKey]);
          if (addressKey && r[addressKey] != null) r[addressKey] = upper(r[addressKey]);
        }
        // Cópia do original para Pre-12 (antes de excluir postcodes e dedup)
        const dfOriginal = df.map(r => ({ ...r }));

        df = df.filter(r => !POSTCODES_EXCLUDE.includes(r[postalKey]));

        const seenAddr = new Set();
        df = df.filter(r => {
          const a = r[addressKey] != null ? String(r[addressKey]) : '';
          if (seenAddr.has(a)) return false;
          seenAddr.add(a);
          return true;
        });

        let blank = 1;
        for (const r of df) {
          const n = r[nameKey];
          if (n == null || String(n).trim() === '') r[nameKey] = 'SEM NOME ' + (blank++);
        }
        df = removeSimilarNames(df, nameKey, postalKey);

        const deliveriesRows = df.filter(r => r[bookingTypeKey] == null || String(r[bookingTypeKey]).trim() === '');
        const areaCount = {};
        for (const r of deliveriesRows) {
          const area = processPostcode(r[postalKey]);
          areaCount[area] = (areaCount[area] || 0) + 1;
        }
        const deliveriesList = Object.entries(areaCount).sort((a, b) => a[0].localeCompare(b[0]));
        let totalDeliveries = 0;
        const dfPostcodes = deliveriesList.map(([subpostcode, count]) => {
          totalDeliveries += count;
          return { subpostcode, 'total de deliveries': count };
        });
        dfPostcodes.push({ subpostcode: 'TOTAL', 'total de deliveries': totalDeliveries });

        const filteredPre12 = dfOriginal.filter(r =>
          TARGET_PRODUCTS.includes(String(r[productKey] || '').trim()) && !POSTCODES_EXCLUDE.includes(upper(r[postalKey]))
        );
        const dfPre12 = filteredPre12
          .map(r => ({ 'Postal Code': r[postalKey], Name: r[nameKey], Address: r[addressKey] }))
          .sort((a, b) => (a['Postal Code'] || '').localeCompare(b['Postal Code'] || ''));

        const dfClean = rows
          .filter(r => r[postalKey] != null && String(r[postalKey]).trim() !== '')
          .filter(r => !POSTCODES_EXCLUDE.includes(upper(r[postalKey])));
        for (const r of dfClean) {
          r[postalKey] = upper(r[postalKey]);
          r['Subpostcode'] = formatSubpostcode(r[postalKey]);
          const phys = r[physKey];
          const pieces = r[totalPiecesKey];
          r['_phys'] = Number(String(phys).replace(',', '.')) || 0;
          r['_pieces'] = Number(String(pieces).replace(',', '.')) || 0;
        }

        const bySub = {};
        for (const r of dfClean) {
          const sub = r['Subpostcode'];
          if (!bySub[sub]) bySub[sub] = { phys: 0, pieces: 0, count: 0, sizes: {} };
          bySub[sub].phys += r['_phys'];
          bySub[sub].pieces += r['_pieces'];
          bySub[sub].count += 1;
          const sc = r[sizeClassKey] != null ? String(r[sizeClassKey]).trim() : '';
          bySub[sub].sizes[sc] = (bySub[sub].sizes[sc] || 0) + 1;
        }
        const sizeClasses = new Set();
        for (const sub of Object.values(bySub)) Object.keys(sub.sizes).forEach(k => sizeClasses.add(k));
        const scList = [...sizeClasses].sort();
        let dfSizeClass = Object.entries(bySub)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([sub, v]) => {
            const row = {
              Subpostcode: sub,
              'Soma Phys.': Math.round(v.phys * 1000) / 1000,
              'Total Pieces': v.pieces,
              'Total Shipments': v.count
            };
            let total = 0;
            for (const sc of scList) {
              row[sc] = v.sizes[sc] || 0;
              total += row[sc];
            }
            row['Total'] = total;
            return row;
          });
        dfSizeClass = normalizeSizeClassToFixedColumns(dfSizeClass);

        return { dfPre12, dfPostcodes, dfSizeClass, totalDeliveries, deliveriesCount: deliveriesList.length };
      }

      const FIXED_SIZE_CLASS_COLS = ['Subpostcode', 'Soma Phys.', 'Total Pieces', 'Total Shipments', 'COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL 1', 'Total'];
      function normalizeSizeClassToFixedColumns(dfSizeClass) {
        if (!dfSizeClass || !dfSizeClass.length) return dfSizeClass;
        const numericSizeCols = ['COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL 1'];
        return dfSizeClass.map(r => {
          const palSum = Object.keys(r).reduce((acc, k) => {
            if (/^PAL\s+/i.test(k) && typeof r[k] === 'number') return acc + r[k];
            if (/^PAL\s+/i.test(k)) return acc + (Number(r[k]) || 0);
            return acc;
          }, 0);
          const out = {
            Subpostcode: r['Subpostcode'] != null ? r['Subpostcode'] : '',
            'Soma Phys.': r['Soma Phys.'] != null ? r['Soma Phys.'] : '',
            'Total Pieces': r['Total Pieces'] != null ? r['Total Pieces'] : '',
            'Total Shipments': r['Total Shipments'] != null ? r['Total Shipments'] : '',
            COY: r['COY'] != null ? (typeof r['COY'] === 'number' ? r['COY'] : Number(r['COY']) || 0) : 0,
            'COY-S1': r['COY-S1'] != null ? (typeof r['COY-S1'] === 'number' ? r['COY-S1'] : Number(r['COY-S1']) || 0) : 0,
            'COY-S2': r['COY-S2'] != null ? (typeof r['COY-S2'] === 'number' ? r['COY-S2'] : Number(r['COY-S2']) || 0) : 0,
            FLY: r['FLY'] != null ? (typeof r['FLY'] === 'number' ? r['FLY'] : Number(r['FLY']) || 0) : 0,
            NCY: r['NCY'] != null ? (typeof r['NCY'] === 'number' ? r['NCY'] : Number(r['NCY']) || 0) : 0,
            'PAL 1': palSum
          };
          out['Total'] = numericSizeCols.reduce((sum, c) => sum + (out[c] || 0), 0);
          return out;
        });
      }

      function buildExcel(dfPre12, dfPostcodes, dfSizeClass) {
        const wb = XLSX.utils.book_new();
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const pre12Data = dfPre12.length ? dfPre12 : [{ 'Postal Code': '', Name: '', Address: '' }];
        const wsPre = XLSX.utils.json_to_sheet(pre12Data);
        XLSX.utils.book_append_sheet(wb, wsPre, 'Pre-12');
        const wsPost = XLSX.utils.json_to_sheet(dfPostcodes);
        XLSX.utils.book_append_sheet(wb, wsPost, 'Análise de Postcodes');
        const allCols = FIXED_SIZE_CLASS_COLS;
        const sizeData = dfSizeClass.map(r => allCols.map(c => r[c] != null ? r[c] : ''));
        const wsSize = XLSX.utils.aoa_to_sheet([allCols].concat(sizeData));
        XLSX.utils.book_append_sheet(wb, wsSize, 'analise_size_class');
        return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      }

      const dropZone = document.getElementById('dropZone');
      const fileInput = document.getElementById('fileInput');
      const btnProcess = document.getElementById('btnProcess');
      const btnDownloadWrap = document.getElementById('btnDownloadWrap');
      const btnDownload = document.getElementById('btnDownload');
      const btnDone = document.getElementById('btnDone');
      const summaryEl = document.getElementById('summary');
      const appLayout = document.getElementById('appLayout');
      const container = document.querySelector('.route-balancer-container') || appLayout;

      function setHasFile(hasFile) {
        if (hasFile) {
          appLayout.classList.add('has-file');
          container.classList.add('has-file');
          document.body.classList.add('rb-has-file');
        } else {
          appLayout.classList.remove('has-file');
          container.classList.remove('has-file');
          document.body.classList.remove('rb-has-file');
        }
      }

      dropZone.addEventListener('click', () => fileInput.click());
      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        dropZone.classList.add('dragover');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const all = e.dataTransfer && e.dataTransfer.files ? [...e.dataTransfer.files] : [];
        const valid = all.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.xlsm'));
        if (valid.length) {
          currentFiles = valid;
          updateUploadZoneDisplay();
          btnProcess.disabled = false;
          lastBuiltExcel = null;
          lastResult = null;
          btnDownloadWrap.classList.remove('visible');
          document.querySelectorAll('.btn-copy-section').forEach(b => { b.disabled = true; });
          document.getElementById('previewError').style.display = 'none';
          setHasFile(false);
        } else {
          document.getElementById('previewError').style.display = 'block';
          document.getElementById('previewError').textContent = t('errorFileType');
        }
      });
      fileInput.addEventListener('change', () => {
        const all = fileInput.files ? [...fileInput.files] : [];
        const valid = all.filter(f => f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.xlsm'));
        if (valid.length) {
          currentFiles = valid;
          updateUploadZoneDisplay();
          btnProcess.disabled = false;
          document.getElementById('previewError').style.display = 'none';
          if (!openingFileForNewProcess) {
            lastBuiltExcel = null;
            lastResult = null;
            btnDownloadWrap.classList.remove('visible');
            document.querySelectorAll('.btn-copy-section').forEach(b => { b.disabled = true; });
            setHasFile(false);
          }
          if (openingFileForNewProcess) {
            openingFileForNewProcess = false;
            runProcess();
          }
        }
      });

      const previewEmpty = document.getElementById('previewEmpty');
      const previewLoading = document.getElementById('previewLoading');
      const previewError = document.getElementById('previewError');
      const previewWrap = document.getElementById('previewWrap');

      function dataToTSV(rows, columns) {
        if (!rows || !rows.length) return '';
        const cols = columns || Object.keys(rows[0]);
        const lines = [cols.join('\t')];
        for (const r of rows) lines.push(cols.map(c => (r[c] != null ? String(r[c]) : '')).join('\t'));
        return lines.join('\n');
      }
      function dataToTSVDataOnly(rows, columns, filterRow) {
        if (!rows || !rows.length) return '';
        const cols = columns || Object.keys(rows[0]);
        const lines = [];
        for (const r of rows) {
          if (filterRow && !filterRow(r)) continue;
          lines.push(cols.map(c => (r[c] != null ? String(r[c]) : '')).join('\t'));
        }
        return lines.join('\n');
      }
      function copySectionToClipboard(sectionId) {
        if (!lastResult) return;
        let text = '';
        if (sectionId === 'pre12') {
          text = dataToTSVDataOnly(lastResult.dfPre12, ['Postal Code', 'Name', 'Address']);
        } else if (sectionId === 'postcodes') {
          text = dataToTSVDataOnly(
            lastResult.dfPostcodes,
            ['subpostcode', 'total de deliveries'],
            (r) => String(r.subpostcode || '').toUpperCase() !== 'TOTAL'
          );
        } else if (sectionId === 'sizeclass') {
          text = dataToTSVDataOnly(
            lastResult.dfSizeClass,
            FIXED_SIZE_CLASS_COLS,
            (r) => String(r.Subpostcode || '').toUpperCase() !== 'TOTAL'
          );
        }
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          const btn = document.querySelector('.btn-copy-section[data-section="' + sectionId + '"]');
          if (btn) {
            const textEl = btn.querySelector('.btn-copy-section-text');
            if (textEl) {
              const orig = textEl.textContent;
              textEl.textContent = t('copied');
              setTimeout(() => { textEl.textContent = orig; }, 2000);
            }
          }
        }).catch(() => {});
      }
      previewWrap.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-copy-section');
        if (btn && !btn.disabled && btn.dataset.section) copySectionToClipboard(btn.dataset.section);
      });

      function mergeResults(results) {
        if (!results.length) return { dfPre12: [], dfPostcodes: [], dfSizeClass: [], totalDeliveries: 0 };
        if (results.length === 1) return results[0];
        const mergedPre12 = [];
        const postcodesBySub = {};
        let totalDeliveriesSum = 0;
        const sizeClassBySub = {};
        for (const r of results) {
          mergedPre12.push(...r.dfPre12);
          for (const row of r.dfPostcodes) {
            const sub = row.subpostcode;
            if (String(sub || '').toUpperCase() === 'TOTAL') {
              totalDeliveriesSum += row['total de deliveries'] || 0;
            } else {
              postcodesBySub[sub] = (postcodesBySub[sub] || 0) + (row['total de deliveries'] || 0);
            }
          }
          for (const row of r.dfSizeClass) {
            const sub = row.Subpostcode;
            if (!sizeClassBySub[sub]) sizeClassBySub[sub] = { Subpostcode: sub, 'Soma Phys.': 0, 'Total Pieces': 0, 'Total Shipments': 0, COY: 0, 'COY-S1': 0, 'COY-S2': 0, FLY: 0, NCY: 0, 'PAL 1': 0, Total: 0 };
            const t = sizeClassBySub[sub];
            t['Soma Phys.'] += Number(row['Soma Phys.']) || 0;
            t['Total Pieces'] += Number(row['Total Pieces']) || 0;
            t['Total Shipments'] += Number(row['Total Shipments']) || 0;
            t.COY += Number(row.COY) || 0;
            t['COY-S1'] += Number(row['COY-S1']) || 0;
            t['COY-S2'] += Number(row['COY-S2']) || 0;
            t.FLY += Number(row.FLY) || 0;
            t.NCY += Number(row.NCY) || 0;
            t['PAL 1'] += Number(row['PAL 1']) || 0;
            t.Total += Number(row.Total) || 0;
          }
        }
        mergedPre12.sort((a, b) => (a['Postal Code'] || '').localeCompare(b['Postal Code'] || ''));
        const dfPostcodes = Object.entries(postcodesBySub)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([subpostcode, count]) => ({ subpostcode, 'total de deliveries': count }));
        dfPostcodes.push({ subpostcode: 'TOTAL', 'total de deliveries': totalDeliveriesSum });
        const dfSizeClass = Object.values(sizeClassBySub)
          .sort((a, b) => (a.Subpostcode || '').localeCompare(b.Subpostcode || ''))
          .map(row => ({ ...row, 'Soma Phys.': Math.round(row['Soma Phys.'] * 1000) / 1000 }));
        return { dfPre12: mergedPre12, dfPostcodes, dfSizeClass, totalDeliveries: totalDeliveriesSum };
      }

      const previewSkeleton = document.getElementById('previewSkeleton');

      async function runProcess() {
        if (!currentFiles.length) return;
        const mainCard = document.getElementById('mainCard');
        const dashboardWrap = document.getElementById('dashboardWrap');
        setHasFile(true);
        if (mainCard) mainCard.classList.remove('show-results');
        document.body.classList.remove('rb-has-results');
        document.dispatchEvent(new CustomEvent('rb:reset'));
        if (dashboardWrap) dashboardWrap.classList.remove('show-results');
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
        previewEmpty.style.display = 'none';
        previewError.style.display = 'none';
        previewWrap.classList.remove('visible');
        btnDownloadWrap.classList.remove('visible');
        document.querySelectorAll('.btn-copy-section').forEach(b => { b.disabled = true; });
        lastResult = null;
        previewLoading.style.display = 'block';
        if (previewSkeleton) {
          previewSkeleton.style.display = 'block';
          previewSkeleton.classList.remove('hiding');
          previewSkeleton.classList.add('visible');
        }
        try {
          const results = [];
          for (const file of currentFiles) {
            const { header, rows } = await readExcelFile(file);
            if (!rows || !rows.length) continue;
            const first = rows[0] || {};
            const nameKey = findColumn(first, NAME_KEYS, ['NAME', 'COMPANY', 'CLIENT']) || (header && header.find(h => String(h).toLowerCase().includes('name'))) || 'Name';
            const postalKey = findColumn(first, ['Postal Code', '_5'], ['POSTAL']) || 'Postal Code';
            const addressKey = findColumn(first, ['Address'], ['ADDRESS']) || 'Address';
            const productKey = findColumn(first, ['Product'], ['PRODUCT']) || 'Product';
            const bookingTypeKey = findColumn(first, ['Booking type'], ['BOOKING']) || 'Booking type';
            const sizeClassKey = findColumn(first, ['Size Class'], ['SIZE']) || 'Size Class';
            const physKey = findColumn(first, ['Phys.', 'Weight'], ['PHYS', 'WEIGHT']) || 'Phys.';
            const totalPiecesKey = findColumn(first, ['Total Pieces', '_1'], ['PIECES']) || 'Total Pieces';
            const result = processData(rows, nameKey, postalKey, addressKey, productKey, bookingTypeKey, sizeClassKey, physKey, totalPiecesKey);
            results.push(result);
          }
          if (!results.length) throw new Error('READ_ERROR');
          const result = mergeResults(results);

          const arr = buildExcel(result.dfPre12, result.dfPostcodes, result.dfSizeClass);
          lastBuiltExcel = arr;
          lastResult = result;
          document.dispatchEvent(new CustomEvent('rb:results', { detail: result }));

          renderPreview(result.dfPre12, result.dfPostcodes, result.dfSizeClass);
          hideLoading(() => {
            if (previewSkeleton) {
              previewSkeleton.classList.add('hiding');
              setTimeout(() => {
                previewSkeleton.style.display = 'none';
                previewSkeleton.classList.remove('visible', 'hiding');
                previewWrap.classList.add('visible');
                btnDownloadWrap.classList.add('visible');
                document.querySelectorAll('.btn-copy-section').forEach(b => { b.disabled = false; });
                if (mainCard) mainCard.classList.add('show-results');
                document.body.classList.add('rb-has-results');
                if (dashboardWrap) dashboardWrap.classList.add('show-results');
                setHasFile(true);
                summaryEl.style.display = 'grid';
                summaryEl.innerHTML = [
                  '<div class="summary-item"><strong>Pre-12</strong>' + result.dfPre12.length + ' ' + t('records') + '</div>',
                  '<div class="summary-item"><strong>Postcodes</strong>' + result.dfPostcodes.length + ' ' + t('areas') + '</div>',
                  '<div class="summary-item"><strong>Size Class</strong>' + result.dfSizeClass.length + ' ' + t('rows') + '</div>',
                  '<div class="summary-item"><strong>' + t('totalDeliveries') + '</strong>' + result.totalDeliveries + '</div>'
                ].join('');
                btnProcess.textContent = t('btnNewProcess');
              }, 260);
            } else {
              previewWrap.classList.add('visible');
              btnDownloadWrap.classList.add('visible');
              document.querySelectorAll('.btn-copy-section').forEach(b => { b.disabled = false; });
              if (mainCard) mainCard.classList.add('show-results');
                document.body.classList.add('rb-has-results');
              if (dashboardWrap) dashboardWrap.classList.add('show-results');
              setHasFile(true);
              summaryEl.style.display = 'grid';
              summaryEl.innerHTML = [
                '<div class="summary-item"><strong>Pre-12</strong>' + result.dfPre12.length + ' ' + t('records') + '</div>',
                '<div class="summary-item"><strong>Postcodes</strong>' + result.dfPostcodes.length + ' ' + t('areas') + '</div>',
                '<div class="summary-item"><strong>Size Class</strong>' + result.dfSizeClass.length + ' ' + t('rows') + '</div>',
                '<div class="summary-item"><strong>' + t('totalDeliveries') + '</strong>' + result.totalDeliveries + '</div>'
              ].join('');
              btnProcess.textContent = t('btnNewProcess');
            }
          });
        } catch (err) {
          hideLoading(() => {
            if (previewSkeleton) {
              previewSkeleton.style.display = 'none';
              previewSkeleton.classList.remove('visible', 'hiding');
            }
            previewError.style.display = 'block';
            const msg = err.message === 'READ_ERROR' ? t('readError') : (err.message || err);
            previewError.textContent = t('error') + msg;
            previewEmpty.style.display = 'block';
          });
          console.error(err);
        }
      }

      function hideLoading(callback) {
        if (!previewLoading.classList.contains('hiding') && previewLoading.style.display !== 'none') {
          previewLoading.classList.add('hiding');
          const onEnd = () => {
            previewLoading.removeEventListener('animationend', onEnd);
            previewLoading.style.display = 'none';
            previewLoading.classList.remove('hiding');
            if (callback) callback();
          };
          previewLoading.addEventListener('animationend', onEnd);
          setTimeout(() => {
            if (previewLoading.classList.contains('hiding')) {
              previewLoading.removeEventListener('animationend', onEnd);
              previewLoading.style.display = 'none';
              previewLoading.classList.remove('hiding');
              if (callback) callback();
            }
          }, 400);
        } else if (callback) {
          callback();
        }
      }

      btnProcess.addEventListener('click', () => {
        if (lastResult) {
          openingFileForNewProcess = true;
          fileInput.value = '';
          fileInput.click();
          setTimeout(() => { if (openingFileForNewProcess) openingFileForNewProcess = false; }, 30000);
          return;
        }
        runProcess();
      });

      btnDownload.addEventListener('click', () => {
        if (!lastBuiltExcel) return;
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = 'Data_' + date + '.xlsx';
        const blob = new Blob([new Uint8Array(lastBuiltExcel)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      });

      function goToMainScreen() {
        const mainCard = document.getElementById('mainCard');
        const dashboardWrap = document.getElementById('dashboardWrap');
        setHasFile(false);
        previewWrap.classList.remove('visible');
        btnDownloadWrap.classList.remove('visible');
        if (mainCard) mainCard.classList.remove('show-results');
        document.body.classList.remove('rb-has-results');
        document.dispatchEvent(new CustomEvent('rb:reset'));
        if (dashboardWrap) dashboardWrap.classList.remove('show-results');
        summaryEl.style.display = 'none';
        summaryEl.innerHTML = '';
        previewEmpty.style.display = 'block';
        previewError.style.display = 'none';
        previewLoading.style.display = 'none';
        if (previewSkeleton) {
          previewSkeleton.style.display = 'none';
          previewSkeleton.classList.remove('visible', 'hiding');
        }
        document.querySelectorAll('.btn-copy-section').forEach(b => { b.disabled = true; });
        btnProcess.textContent = t('btnProcess');
        lastResult = null;
        lastBuiltExcel = null;
        currentFiles = [];
        fileInput.value = '';
        updateUploadZoneDisplay();
        btnProcess.disabled = true;
      }

      btnDone.addEventListener('click', goToMainScreen);
    })();
