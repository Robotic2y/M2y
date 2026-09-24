/**
 * M2y v2.10.2 - Dashboard Controller
 * Mantém 100% da arquitetura base + expansões:
 * - Exportação XLSX
 * - Nome inteligente de arquivo
 * - Log stats (contadores)
 * - Botão salvar log
 * - Coloração de avaliações
 * - Coluna de horários
 * - Status colorido
 */

import { formatTimestamp } from '../modules/utils.js';
import { SocialIcons } from '../modules/social-icons.js';
import progressPersistence from './progress-persistence.js';
import eventBus from '../core/event-bus.js';
import anomalyDetector from '../core/anomaly-detector.js';
import performanceGuard from '../core/performance-guard.js';
import autoThrottle from '../core/auto-throttle.js';
import pluginSystem from '../core/plugin-system.js';
import stateManager from '../core/state-manager.js';
import BackupManager from '../modules/backup-manager.js';

// --- Exemplo de Plugin: Monitor de Estabilidade ---
const stabilityMonitorPlugin = {
  name: 'StabilityMonitor',
  init(context) {
    context.eventBus.on('state:update', (state) => {
      if (state.progress > 0 && state.progress % 10 === 0) {
        console.log(`[Plugin:StabilityMonitor] Progresso: ${state.progress}% - Sistema estável.`);
      }
    });
  }
};

// Registrar e inicializar plugins
pluginSystem.register('StabilityMonitor', stabilityMonitorPlugin);
pluginSystem.init({ eventBus, stateManager });

document.addEventListener('DOMContentLoaded', async () => {

  // ============================================================
  // REFERÊNCIAS DOM
  // ============================================================
  const navItems    = document.querySelectorAll('nav li[data-view]');
  const views       = document.querySelectorAll('.view');
  const viewTitle   = document.getElementById('viewTitle');

  const leadsTableBody = document.querySelector('#leadsTable tbody');
  const logList        = document.getElementById('logList');

  const mTotalLeads  = document.getElementById('mTotalLeads');
  const mSuccessRate = document.getElementById('mSuccessRate');
  const mAvgTime     = document.getElementById('mAvgTime');
  const mDuration    = document.getElementById('mDuration');

  const exportCsvBtn  = document.getElementById('exportCsv');
  const exportXlsxBtn = document.getElementById('exportXlsx');
  const exportJsonBtn = document.getElementById('exportJson');
  const exportTxtBtn  = document.getElementById('exportTxt');
  const importLeadsBtn = document.getElementById('importLeadsBtn');
  const importLeadsFile = document.getElementById('importLeadsFile');
  const downloadImportTemplateBtn = document.getElementById('downloadImportTemplateBtn');
  const viewJsonBtn   = document.getElementById('viewJson');
  const clearDataBtn  = document.getElementById('clearData');
  const jsonContent   = document.getElementById('jsonContent');
  const copyJsonBtn   = document.getElementById('copyJsonBtn');
  const saveLogBtn    = document.getElementById('saveLogBtn');
  const leadsChart    = document.getElementById('leadsChart');
  const resetTableDimensions = document.getElementById('resetTableDimensions');
  const rowDensity = document.getElementById('rowDensity');
  const profileSelect = document.getElementById('profileSelect');
  const profileDetail = document.getElementById('profileDetail');
  const selectAllLeads = document.getElementById('selectAllLeads');
  const selectedLeadsCount = document.getElementById('selectedLeadsCount');
  const bulkCopyBtn = document.getElementById('bulkCopyBtn');
  const bulkExportBtn = document.getElementById('bulkExportBtn');
  const bulkReviewBtn = document.getElementById('bulkReviewBtn');
  const tablePreset = document.getElementById('tablePreset');
  const comparePanel = document.getElementById('comparePanel');
  const compareGrid = document.getElementById('compareGrid');
  const addCompareProfile = document.getElementById('addCompareProfile');
  const clearCompare = document.getElementById('clearCompare');
  const filterSummary = document.getElementById('filterSummary');
  const globalLeadSearch = document.getElementById('globalLeadSearch');
  const toggleFilterPanel = document.getElementById('toggleFilterPanel');
  const tableFilterBody = document.getElementById('tableFilterBody');
  const copyVisibleBtn = document.getElementById('copyVisibleBtn');
  const exportVisibleBtn = document.getElementById('exportVisibleBtn');
  const clearSelectionBtn = document.getElementById('clearSelectionBtn');
  const fullscreenTableBtn = document.getElementById('fullscreenTableBtn');
  const fitColumnsBtn = document.getElementById('fitColumnsBtn');
  const leadsView = document.getElementById('leadsView');
  const dashboardAutoRefresh = document.getElementById('dashboardAutoRefresh');
  const dashboardScreenshotGuard = document.getElementById('dashboardScreenshotGuard');
  const dashboardCompactMode = document.getElementById('dashboardCompactMode');
  const dashboardKeepFilters = document.getElementById('dashboardKeepFilters');
  const saveDashboardSettings = document.getElementById('saveDashboardSettings');
  const resetDashboardSettings = document.getElementById('resetDashboardSettings');
  const dashboardSettingsStatus = document.getElementById('dashboardSettingsStatus');
  const dashboardScreenshotHealth = document.getElementById('dashboardScreenshotHealth');
  const dashboardExecutionHealth = document.getElementById('dashboardExecutionHealth');
  const createBackupBtn = document.getElementById('createBackupBtn');
  const exportBackupBtn = document.getElementById('exportBackupBtn');
  const restoreBackupInput = document.getElementById('restoreBackupInput');
  const runHealthCheckBtn = document.getElementById('runHealthCheckBtn');
  const copyDiagnosticsBtn = document.getElementById('copyDiagnosticsBtn');
  const diagnosticsOutput = document.getElementById('diagnosticsOutput');
  let dashboardSettings = { autoRefresh: true, screenshotGuard: true, compactMode: false, keepFilters: true };
  let dashboardRefreshTimer = null;

  const sidebarStatus    = document.getElementById('sidebarStatus');
  const sidebarLeadCount = document.getElementById('sidebarLeadCount');
  const sidebarDot       = document.getElementById('sidebarDot');

  // Progress Bar References
  const scrapingProgress     = document.getElementById('scrapingProgress');
  const progressStatusText   = document.getElementById('progressStatusText');
  const progressPercentText  = document.getElementById('progressPercentText');
  const progressBarFill      = document.getElementById('progressBarFill');
  const progressLeadsCount   = document.getElementById('progressLeadsCount');
  const progressSpeed        = document.getElementById('progressSpeed');
  const progressEta          = document.getElementById('progressEta');

  // Log stats
  const logTotal = document.getElementById('logTotal');
  const logInfo  = document.getElementById('logInfo');
  const logWarn  = document.getElementById('logWarn');
  const logError = document.getElementById('logError');

  let currentLeads = [];
  let currentLogs  = [];
  let selectedLeadKeys = new Set();
  let comparedLeads = [];
  let filteredLeads = [];
  let sortConfig   = { key: null, direction: 'asc' };
  let globalFilter = '';
  let filters      = {
    name: '', phone: '', category_macro: '', city: '',
    digital_presence: '', status: '', ratingMin: null, ratingMax: null
  };

  let progressDebounceTimer = null;

  // ============================================================
  // NAVEGAÇÃO
  // ============================================================
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const viewId = item.getAttribute('data-view');
      showView(viewId, item.textContent.replace(/^[^\w]+/, '').trim());
    });
  });

  async function loadDashboardSettings() {
    try { const saved = (await chrome.storage.local.get('m2y_dashboard_settings')).m2y_dashboard_settings; dashboardSettings = { ...dashboardSettings, ...(saved || {}) }; } catch (_) {}
    if (dashboardAutoRefresh) dashboardAutoRefresh.checked = dashboardSettings.autoRefresh;
    if (dashboardScreenshotGuard) dashboardScreenshotGuard.checked = dashboardSettings.screenshotGuard;
    if (dashboardCompactMode) dashboardCompactMode.checked = dashboardSettings.compactMode;
    if (dashboardKeepFilters) dashboardKeepFilters.checked = dashboardSettings.keepFilters;
    document.body.classList.toggle('m2y-dashboard-compact', Boolean(dashboardSettings.compactMode));
    if (dashboardRefreshTimer) clearInterval(dashboardRefreshTimer);
    if (dashboardSettings.autoRefresh) dashboardRefreshTimer = setInterval(() => loadData(), 30000);
  }
  async function saveDashboardPreferences(next = null) {
    dashboardSettings = { ...dashboardSettings, ...(next || { autoRefresh: dashboardAutoRefresh?.checked, screenshotGuard: dashboardScreenshotGuard?.checked, compactMode: dashboardCompactMode?.checked, keepFilters: dashboardKeepFilters?.checked }) };
    await chrome.storage.local.set({ m2y_dashboard_settings: dashboardSettings });
    await loadDashboardSettings();
    if (dashboardSettingsStatus) { dashboardSettingsStatus.textContent = 'Preferências salvas.'; setTimeout(() => { dashboardSettingsStatus.textContent = ''; }, 2200); }
  }
  saveDashboardSettings?.addEventListener('click', () => saveDashboardPreferences());
  resetDashboardSettings?.addEventListener('click', () => saveDashboardPreferences({ autoRefresh: true, screenshotGuard: true, compactMode: false, keepFilters: true }));

  function showDiagnostics(value) { if (diagnosticsOutput) diagnosticsOutput.textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2); }
  async function runSystemHealthCheck() {
    const report = { version: chrome.runtime.getManifest().version, timestamp: new Date().toISOString(), modules: {} };
    try { await chrome.storage.local.get(null); report.modules.storage = 'OK'; } catch (error) { report.modules.storage = `ERROR: ${error.message}`; }
    try { await BackupManager.diagnoseStorage(); report.modules.backup = 'OK'; } catch (error) { report.modules.backup = `ERROR: ${error.message}`; }
    try { await new Promise((resolve, reject) => { const req = indexedDB.open('m2y_media', 1); req.onsuccess = () => { req.result.close(); resolve(); }; req.onerror = () => reject(req.error); }); report.modules.indexedDB = 'OK'; } catch (error) { report.modules.indexedDB = `UNAVAILABLE: ${error.message}`; }
    try { const response = await chrome.runtime.sendMessage({ action: 'ping' }); report.modules.serviceWorker = response?.success ? 'OK' : 'FAILED'; } catch (error) { report.modules.serviceWorker = `ERROR: ${error.message}`; }
    try { const [tab] = await chrome.tabs.query({ active: true, currentWindow: true }); const response = tab?.id ? await chrome.tabs.sendMessage(tab.id, { action: 'ping' }).catch(() => null) : null; report.modules.contentScript = response?.success ? 'OK' : 'NOT_RESPONDING'; } catch (_) { report.modules.contentScript = 'NOT_RESPONDING'; }
    report.modules.communication = report.modules.serviceWorker === 'OK' ? 'OK' : 'FAILED';
    report.modules.extraction = 'READY'; report.modules.deduplication = 'READY'; report.modules.screenshots = 'READY'; report.modules.export = typeof Blob !== 'undefined' ? 'OK' : 'FAILED'; report.modules.events = eventBus ? 'OK' : 'FAILED';
    const diagnosis = await BackupManager.diagnoseStorage(); report.storage = diagnosis; showDiagnostics(report); return report;
  }
  createBackupBtn?.addEventListener('click', async () => { const result = await BackupManager.createIncrementalBackup('manual'); showDiagnostics({ backup: result }); });
  exportBackupBtn?.addEventListener('click', async () => { const payload = await BackupManager.exportBackup(); downloadBlob(new Blob([payload], { type: 'application/json' }), `m2y-backup-${new Date().toISOString().slice(0, 10)}.json`); showDiagnostics({ exported: true, bytes: payload.length }); });
  restoreBackupInput?.addEventListener('change', async () => { const file = restoreBackupInput.files?.[0]; if (!file) return; try { const payload = JSON.parse(await file.text()); const validation = BackupManager.validateBackup(payload); if (!validation.valid) { showDiagnostics({ restored: false, validation }); return; } if (!window.confirm('O estado atual será salvo para rollback antes da restauração. Continuar?')) return; const result = await BackupManager.restoreBackup(payload); showDiagnostics({ restored: true, result: { restored: result.restored } }); await loadData(); } catch (error) { showDiagnostics({ restored: false, error: error.message, action: 'Selecione um backup JSON válido.' }); } });
  runHealthCheckBtn?.addEventListener('click', runSystemHealthCheck);
  copyDiagnosticsBtn?.addEventListener('click', async () => { await navigator.clipboard?.writeText(diagnosticsOutput?.textContent || ''); });

  function showView(viewId, title) {
    navItems.forEach(i => {
      i.classList.toggle('active', i.getAttribute('data-view') === viewId);
    });
    views.forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`${viewId}View`);
    if (targetView) targetView.classList.remove('hidden');
    viewTitle.textContent = title;
    if (viewId === 'json') updateJsonPanel();
  }

  viewJsonBtn?.addEventListener('click', () => showView('json', 'Painel JSON'));

  async function updateJsonPanel() {
    const data = await chrome.storage.local.get(null);
    const exportData = {
      system: { os: navigator.platform, userAgent: navigator.userAgent, timestamp: new Date().toISOString() },
      leads: currentLeads,
      logs: [],
      metrics: []
    };
    Object.keys(data).forEach(key => {
      if (key.startsWith('logs_'))    exportData.logs.push(...data[key]);
      if (key.startsWith('metrics_')) exportData.metrics.push(data[key]);
    });
    jsonContent.textContent = JSON.stringify(exportData, null, 2);
  }

  copyJsonBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(jsonContent.textContent).then(() => {
      copyJsonBtn.textContent = '✅ Copiado!';
      setTimeout(() => { copyJsonBtn.textContent = 'Copiar JSON'; }, 2000);
    });
  });

  // ============================================================
  // ORDENAÇÃO
  // ============================================================
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.getAttribute('data-sort');
      const direction = (sortConfig.key === key && sortConfig.direction === 'asc') ? 'desc' : 'asc';
      sortConfig = { key, direction };
      document.querySelectorAll('th.sortable').forEach(el => el.classList.remove('active-sort'));
      th.classList.add('active-sort');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = direction === 'asc' ? '↑' : '↓';
      filterSortAndRender();
    });
  });

  // ============================================================
  // FILTROS
  // ============================================================
  document.querySelectorAll('.col-filter').forEach(input => {
    input.addEventListener('input', (e) => {
      const col = e.target.getAttribute('data-col');
      if (col === 'rating_value') {
        if (e.target.classList.contains('rating-min')) {
          filters.ratingMin = e.target.value ? parseFloat(e.target.value) : null;
        } else if (e.target.classList.contains('rating-max')) {
          filters.ratingMax = e.target.value ? parseFloat(e.target.value) : null;
        }
      } else if (col) {
        filters[col] = e.target.value.toLowerCase();
      }
      filterSortAndRender();
    });
  });

  globalLeadSearch?.addEventListener('input', () => {
    globalFilter = globalLeadSearch.value.trim().toLowerCase();
    filterSortAndRender();
  });

  document.getElementById('resetFilters')?.addEventListener('click', () => {
    filters = { name: '', phone: '', category_macro: '', city: '', digital_presence: '', status: '', ratingMin: null, ratingMax: null };
    globalFilter = '';
    if (globalLeadSearch) globalLeadSearch.value = '';
    document.querySelectorAll('.col-filter').forEach(input => input.value = '');
    filterSortAndRender();
  });

  toggleFilterPanel?.addEventListener('click', () => {
    const collapsed = tableFilterBody?.classList.toggle('is-collapsed');
    toggleFilterPanel.textContent = collapsed ? 'Mostrar' : 'Ocultar';
    localStorage.setItem('m2y_filter_panel_collapsed', collapsed ? '1' : '0');
  });
  if (localStorage.getItem('m2y_filter_panel_collapsed') === '1') {
    tableFilterBody?.classList.add('is-collapsed');
    if (toggleFilterPanel) toggleFilterPanel.textContent = 'Mostrar';
  }

  function filterSortAndRender() {
    let filtered = currentLeads.filter(lead => {
      const textFilters = ['name', 'phone', 'category_macro', 'city', 'digital_presence', 'status'];
      const passesText = textFilters.every(key => {
        if (!filters[key]) return true;
        return (lead[key] || '').toString().toLowerCase().includes(filters[key]);
      });
      const passesGlobal = !globalFilter || Object.values(lead).some(value => String(value ?? '').toLowerCase().includes(globalFilter));

      let passesRating = true;
      if (filters.ratingMin !== null || filters.ratingMax !== null) {
        const rating = parseFloat(lead.rating_value) || 0;
        if (filters.ratingMin !== null && rating < filters.ratingMin) passesRating = false;
        if (filters.ratingMax !== null && rating > filters.ratingMax) passesRating = false;
      }

      return passesText && passesRating && passesGlobal;
    });

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (sortConfig.key === 'rating_value') {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        } else {
          valA = (valA || '').toString().toLowerCase();
          valB = (valB || '').toString().toLowerCase();
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ?  1 : -1;
        return 0;
      });
    }

    filteredLeads = filtered;
    updateFilterSummary(filtered.length);
    renderLeadsTable(filtered);
  }

  function updateFilterSummary(visibleCount = filteredLeads.length) {
    const active = Object.values(filters).filter(value => value !== '' && value !== null).length + (globalFilter ? 1 : 0);
    if (filterSummary) filterSummary.textContent = active ? `${active} filtro(s) ativo(s) · ${visibleCount} de ${currentLeads.length} lead(s)` : `${currentLeads.length} lead(s) · nenhum filtro aplicado`;
  }

  // ============================================================
  // ANOMALY ALERT SYSTEM
  // ============================================================
  eventBus.on('anomaly:detected', (data) => {
    showAnomalyAlert(data);
  });

  function showAnomalyAlert(data) {
    let alertEl = document.getElementById('anomalyAlert');
    if (!alertEl) {
      alertEl = document.createElement('div');
      alertEl.id = 'anomalyAlert';
      alertEl.className = 'anomaly-alert-toast';
      document.body.appendChild(alertEl);
    }

    const typeLabel = data.type === 'spike' ? 'Pico' : 'Queda';
    alertEl.innerHTML = `
      <div class="alert-content">
        <strong>⚠️ Alerta de Anomalia</strong>
        <p>${typeLabel} detectado em ${data.metricName}: <b>${data.value.toFixed(2)}</b> (Média: ${data.avg.toFixed(2)})</p>
      </div>
      <button class="alert-close">×</button>
    `;

    alertEl.classList.add('visible');
    
    const closeBtn = alertEl.querySelector('.alert-close');
    closeBtn.onclick = () => alertEl.classList.remove('visible');

    // Auto-hide after 10 seconds
    setTimeout(() => alertEl.classList.remove('visible'), 10000);
  }

  // ============================================================
  // CARREGAR DADOS
  // ============================================================
  async function loadData() {
    const data = await chrome.storage.local.get(null);
    const allLeads = [];
    const allLogs  = [];
    let latestMetrics = null;

    Object.keys(data).forEach(key => {
      if (key.startsWith('leads_')) {
        const execId = key.replace('leads_', '');
        allLeads.push(...data[key].map(l => ({ ...l, _executionId: execId })));
      }
      if (key.startsWith('logs_'))    allLogs.push(...data[key]);
      if (key.startsWith('metrics_')) latestMetrics = data[key];
    });

    const dedupedLeads = deduplicateLeads(allLeads);
    currentLeads = dedupedLeads;
    currentLogs  = allLogs;
    if (dedupedLeads.length !== allLeads.length) await persistDeduplicatedLeads(data, dedupedLeads);

    updateProfileSelector(dedupedLeads);
    updateMetrics(dedupedLeads, latestMetrics);
    updateAnalytics(dedupedLeads);
    updateQualityAndDuplicates(dedupedLeads);
    filterSortAndRender();
    updateLogs(allLogs);
    updateSidebar(allLeads);
    updateScreenshotHealth(dedupedLeads);

    // Verificar status atual ao carregar
    const status = await chrome.runtime.sendMessage({ action: 'getStatus' }).catch(() => ({ status: 'idle' }));
    if (status && status.status === 'running') {
      scrapingProgress.classList.remove('hidden');
    } else {
      scrapingProgress.classList.add('hidden');
    }
  }

  function getIdentityKeys(lead) {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const keys = []; const url = normalize(lead.google_maps_url); if (url) keys.push(`url:${url}`);
    const phone = normalize(lead.phone); if (phone && phone !== 'na') keys.push(`phone:${phone}`);
    const name = normalize(lead.name); const address = normalize(lead.address); const city = normalize(lead.city); const state = normalize(lead.state);
    if (name && name !== 'na') { if (address && address !== 'na') keys.push(`profile:${name}|${address}`); if (city && city !== 'na') keys.push(`local:${name}|${city}|${state}`); }
    return keys.length ? keys : [`fallback:${normalize(JSON.stringify(lead))}`];
  }
  function completeness(lead) { return ['name','phone','website','address','hours','rating_value','screenshot'].reduce((n, key) => n + (lead[key] && lead[key] !== 'N/A' ? 1 : 0), 0); }
  function deduplicateLeads(leads) {
    const selected = []; const identities = new Map();
    leads.forEach(lead => { const keys = getIdentityKeys(lead); const matches = keys.map(key => identities.get(key)).filter(Boolean); const current = matches[0];
      if (!current) { selected.push(lead); const index = selected.length - 1; keys.forEach(key => identities.set(key, index)); }
      else if (completeness(lead) > completeness(selected[current])) { selected[current] = lead; keys.forEach(key => identities.set(key, current)); }
    });
    return selected;
  }
  async function persistDeduplicatedLeads(data, leads) {
    const byExecution = new Map();
    leads.forEach(lead => { if (!byExecution.has(lead._executionId)) byExecution.set(lead._executionId, []); const { _executionId, ...clean } = lead; byExecution.get(lead._executionId).push(clean); });
    const updates = {}; Object.keys(data).filter(key => key.startsWith('leads_')).forEach(key => { updates[key] = byExecution.get(key.replace('leads_', '')) || []; });
    await chrome.storage.local.set(updates);
  }

  // ============================================================
  // ESCUTAR MENSAGENS REALTIME
  // ============================================================
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'ui_progress_update') {
      updateRealtimeProgress(message.metrics, message.status);
      progressPersistence.saveState(message.metrics, message.status);
    } else if (message.action === 'ui_log') {
      // Otimizacao: So recarregar se for log de extracao concluida ou lead novo
      if (message.text.includes('✓') || message.text.includes('Finalizada')) {
        loadData();
        progressPersistence.clearState();
      }
    }
  });

  async function loadProgressState() {
    const state = await progressPersistence.loadState();
    if (progressPersistence.isStateValid(state)) {
      updateRealtimeProgress(state.metrics, state.status);
    }
  }

  function updateRealtimeProgress(metrics, status) {
    if (status !== 'running' && status !== 'paused') {
      scrapingProgress.classList.add('hidden');
      return;
    }

    // Analyze for anomalies (leads/min)
    if (metrics && metrics.leadsPerMinute) {
      anomalyDetector.analyze('leads_per_minute', metrics.leadsPerMinute);
    }

    scrapingProgress.classList.remove('hidden');

    // Adicionar skeleton loading na primeira vez
    if (!progressLeadsCount.textContent || progressLeadsCount.textContent === '0 / 0 leads') {
      [progressLeadsCount, progressSpeed, progressEta].forEach(el => el.classList.add('skeleton'));
    }

    // Debounce para evitar re-render excessivo
    if (progressDebounceTimer) clearTimeout(progressDebounceTimer);
    
    progressDebounceTimer = setTimeout(() => {
      const percent = Math.round(metrics.progressPercent || 0);
      const speed = (metrics.speedLpm || 0).toFixed(1);
      
      // Atualizar Textos
      progressStatusText.textContent = status === 'paused' ? '⏸️ Extração Pausada' : '🚀 Extraindo leads...';
      progressPercentText.textContent = `${percent}%`;
      progressBarFill.style.width = `${percent}%`;
      
      progressLeadsCount.textContent = `${metrics.totalLeads} / ${metrics.estimatedTotal || '?'} leads`;
      progressSpeed.textContent = `⚡ ${speed} leads/min`;
      
      // Formatar ETA
      if (metrics.etaSeconds > 0) {
        const mins = Math.floor(metrics.etaSeconds / 60);
        const secs = Math.floor(metrics.etaSeconds % 60);
        progressEta.textContent = `⏳ ETA: ${mins}m ${secs}s`;
      } else {
        progressEta.textContent = `⏳ ETA: --:--`;
      }

      // Remover skeleton se estiver presente
      [progressLeadsCount, progressSpeed, progressEta].forEach(el => el.classList.remove('skeleton'));
    }, 100);
  }

  // ============================================================
  // SIDEBAR STATUS
  // ============================================================
  function updateSidebar(leads) {
    sidebarLeadCount.textContent = `${leads.length} leads armazenados`;
  }

  function updateScreenshotHealth(leads) {
    const total = leads.length;
    const valid = leads.filter(lead => /^data:image\/(jpeg|jpg|png);base64,/.test(String(lead.screenshot || ''))).length;
    const missing = total - valid;
    if (dashboardScreenshotHealth) {
      dashboardScreenshotHealth.textContent = total ? `${valid}/${total} lead(s) com screenshot válido${missing ? ` · ${missing} pendente(s)` : ' · cobertura completa'}` : 'Nenhum lead armazenado para auditar.';
      dashboardScreenshotHealth.className = missing && dashboardSettings.screenshotGuard ? 'health-warning' : 'health-ok';
    }
    if (dashboardExecutionHealth) dashboardExecutionHealth.textContent = missing && dashboardSettings.screenshotGuard ? 'Ação recomendada: revisar a captura antes de exportar.' : 'Execução pronta para revisão e exportação.';
  }

  // ============================================================
  // MÉTRICAS
  // ============================================================
  function updateMetrics(leads, metrics) {
    performanceGuard.measure('dashboard:updateMetrics', () => {
      mTotalLeads.textContent = leads.length;
      if (metrics) {
        mSuccessRate.textContent = `${(metrics.successRate || 0).toFixed(1)}%`;
        mAvgTime.textContent     = `${(metrics.avgTimePerLead || 0).toFixed(2)}s`;
        mDuration.textContent    = `${(metrics.durationSeconds || 0).toFixed(0)}s`;
        const funnel = metrics.funnel || {};
        document.getElementById('fCardsFound').textContent = funnel.cardsFound || 0;
        document.getElementById('fCardsProcessed').textContent = funnel.cardsProcessed || 0;
        document.getElementById('fAccepted').textContent = funnel.accepted || metrics.validLeads || 0;
        document.getElementById('fFiltered').textContent = funnel.filtered || 0;
        document.getElementById('fDuplicates').textContent = funnel.duplicates || 0;
        document.getElementById('fErrors').textContent = funnel.errors || 0;
        document.getElementById('fAcceptanceRate').textContent = `${(metrics.acceptanceRate || 0).toFixed(1)}%`;
        document.getElementById('fCompleteDataRate').textContent = `${(metrics.completeDataRate || 0).toFixed(1)}%`;
      } else {
        mSuccessRate.textContent = '0%';
        mAvgTime.textContent     = '0s';
        mDuration.textContent    = '0s';
        ['fCardsFound','fCardsProcessed','fAccepted','fFiltered','fDuplicates','fErrors'].forEach(id => { document.getElementById(id).textContent = '0'; });
        ['fAcceptanceRate','fCompleteDataRate'].forEach(id => { document.getElementById(id).textContent = '0%'; });
      }
    }, 50); // Threshold de 50ms para atualização de métricas
  }

  function updateAnalytics(leads) {
    const pct = fn => leads.length ? Math.round(leads.filter(fn).length / leads.length * 100) : 0;
    document.getElementById('aWithPhone').textContent = pct(l => l.phone && l.phone !== 'N/A') + '%';
    document.getElementById('aWithWebsite').textContent = pct(l => l.website && l.website !== 'N/A') + '%';
    document.getElementById('aWithScreenshot').textContent = pct(l => l.screenshot) + '%';
    const rated = leads.map(l => Number(l.rating_value)).filter(n => Number.isFinite(n) && n > 0);
    document.getElementById('aAvgRating').textContent = rated.length ? (rated.reduce((a,b)=>a+b,0)/rated.length).toFixed(1) : '0';
    const renderBreakdown = (id, values) => { const counts={}; values.forEach(v => { const key=v||'Não informado'; counts[key]=(counts[key]||0)+1; }); document.getElementById(id).innerHTML=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>'<div class="breakdown-row"><span>'+escapeHtml(k)+'</span><strong>'+v+'</strong></div>').join('') || '<p>Nenhum dado.</p>'; };
    renderBreakdown('cityBreakdown', leads.map(l => l.city)); renderBreakdown('categoryBreakdown', leads.map(l => l.category_macro || l.category_main));
    if (typeof Chart !== 'undefined' && leadsChart) { const counts={}; leads.forEach(l=>{const k=l.city||'N/I';counts[k]=(counts[k]||0)+1;}); if(window.m2yChart) window.m2yChart.destroy(); window.m2yChart=new Chart(leadsChart,{type:'bar',data:{labels:Object.keys(counts).slice(0,10),datasets:[{label:'Leads',data:Object.values(counts).slice(0,10),backgroundColor:'#2563eb'}]},options:{responsive:true,maintainAspectRatio:false}}); }
  }

  function applyTablePreferences() { const hidden=[]; document.querySelectorAll('[data-column-index]').forEach(box=>{const i=Number(box.dataset.columnIndex); if(!box.checked) hidden.push(i);}); document.querySelectorAll('#leadsTable tr').forEach(row=>row.querySelectorAll('th,td').forEach((cell,i)=>cell.style.display=hidden.includes(i)?'none':'')); localStorage.setItem('m2y_table_columns',JSON.stringify(hidden)); if(rowDensity) { document.querySelector('#leadsTable').classList.remove('density-compact','density-normal','density-comfortable'); document.querySelector('#leadsTable').classList.add('density-'+rowDensity.value); localStorage.setItem('m2y_row_density',rowDensity.value); } }
  document.querySelectorAll('[data-column-index]').forEach(box=>box.addEventListener('change',applyTablePreferences)); rowDensity?.addEventListener('change',applyTablePreferences);
  resetTableDimensions?.addEventListener('click',()=>{ document.querySelectorAll('#leadsTable th').forEach(th=>th.style.width=''); document.querySelectorAll('#leadsTable td').forEach(td=>td.style.width=''); localStorage.removeItem('m2y_table_widths'); if(rowDensity) rowDensity.value='normal'; applyTablePreferences(); });
  const savedDensity=localStorage.getItem('m2y_row_density'); if(savedDensity&&rowDensity) rowDensity.value=savedDensity;

  function leadKey(lead, index = 0) { return `${lead._executionId || ''}::${lead.google_maps_url || lead.id_interno || lead.name || index}`; }

  function getSelectedLeads() {
    return currentLeads.filter((lead, index) => selectedLeadKeys.has(leadKey(lead, index)));
  }

  function updateBulkState() {
    const total = selectedLeadKeys.size;
    if (selectedLeadsCount) selectedLeadsCount.textContent = `${total} selecionado${total === 1 ? '' : 's'}`;
    [bulkCopyBtn, bulkExportBtn, bulkReviewBtn].forEach(btn => { if (btn) btn.disabled = total === 0; });
    if (selectAllLeads) selectAllLeads.checked = filteredLeads.length > 0 && filteredLeads.every(lead => selectedLeadKeys.has(leadKey(lead, currentLeads.indexOf(lead))));
  }

  selectAllLeads?.addEventListener('change', () => {
    const visible = filteredLeads;
    visible.forEach(lead => {
      const index = currentLeads.indexOf(lead);
      if (selectAllLeads.checked) selectedLeadKeys.add(leadKey(lead, index));
      else selectedLeadKeys.delete(leadKey(lead, index));
    });
    filterSortAndRender(); updateBulkState();
  });
  bulkCopyBtn?.addEventListener('click', async () => { const text = getSelectedLeads().map(l => `${l.name || 'N/A'} | ${l.phone || 'N/A'} | ${l.website || 'N/A'} | ${l.city || 'N/A'} - ${l.state || ''}`).join('\n'); await navigator.clipboard.writeText(text); bulkCopyBtn.textContent = 'Copiado'; setTimeout(() => bulkCopyBtn.textContent = 'Copiar selecionados', 1600); });
  bulkExportBtn?.addEventListener('click', () => downloadBlob(new Blob([JSON.stringify(getSelectedLeads(), null, 2)], { type: 'application/json' }), 'leads-selecionados.json'));
  bulkReviewBtn?.addEventListener('click', async () => { const now = new Date().toISOString(); const reviewed = getSelectedLeads(); const byKey = new Map(reviewed.map(l => [l.google_maps_url || l.id_interno || l.name, l])); const data = await chrome.storage.local.get(null); for (const [key, rows] of Object.entries(data)) if (key.startsWith('leads_')) data[key] = rows.map(l => byKey.has(l.google_maps_url || l.id_interno || l.name) ? { ...l, reviewed: true, reviewed_at: now, reviewStatus: 'revisado', lastReviewedAt: now } : l); await chrome.storage.local.set(data); await loadData(); });

  function visibleLeadRows() { return filteredLeads; }
  function leadClipboardRow(lead) { return [lead.name, lead.phone, lead.category_macro || lead.category_main, lead.city && `${lead.city} - ${lead.state || ''}`, lead.rating_formatted, lead.digital_presence, lead.status].map(value => String(value || 'N/A').replace(/\s+/g, ' ').trim()).join('\t'); }
  copyVisibleBtn?.addEventListener('click', async () => {
    const rows = visibleLeadRows();
    if (!rows.length) return;
    await navigator.clipboard.writeText(rows.map(leadClipboardRow).join('\n'));
    copyVisibleBtn.textContent = 'Copiado';
    setTimeout(() => { copyVisibleBtn.textContent = 'Copiar visíveis'; }, 1600);
  });
  exportVisibleBtn?.addEventListener('click', () => {
    const rows = visibleLeadRows();
    downloadBlob(new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json' }), 'leads-visiveis.json');
  });
  clearSelectionBtn?.addEventListener('click', () => {
    selectedLeadKeys.clear();
    if (selectAllLeads) selectAllLeads.checked = false;
    filterSortAndRender();
    updateBulkState();
  });
  fullscreenTableBtn?.addEventListener('click', () => {
    const enabled = leadsView?.classList.toggle('table-fullscreen');
    fullscreenTableBtn.textContent = enabled ? 'Sair da tela cheia' : 'Tela cheia';
  });
  fitColumnsBtn?.addEventListener('click', () => {
    document.querySelectorAll('#leadsTable th, #leadsTable td').forEach(cell => { cell.style.width = ''; });
    localStorage.removeItem('m2y_table_widths');
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f' && !document.querySelector('.view:not(.hidden)')?.id?.includes('leads')) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      globalLeadSearch?.focus();
      globalLeadSearch?.select();
    }
    if (event.key === 'Escape' && document.activeElement?.matches('.col-filter, #globalLeadSearch')) {
      document.getElementById('resetFilters')?.click();
    }
  });

  tablePreset?.addEventListener('change', () => applyTablePreset(tablePreset.value));
  function applyTablePreset(name) { const presets = { default: [], prospecting: [1, 2, 3, 4, 8], quality: [5, 6, 7, 8], operation: [1, 3, 7, 8, 9] }; document.querySelectorAll('[data-column-index]').forEach(box => { const index = Number(box.dataset.columnIndex); box.checked = !(presets[name] || []).includes(index); }); applyTablePreferences(); }

  importLeadsBtn?.addEventListener('click', () => importLeadsFile?.click());
  downloadImportTemplateBtn?.addEventListener('click', () => {
    const template = 'name,phone,website,category_macro,address,city,state,rating_value,status,hours,google_maps_url,social_instagram,social_facebook\nExemplo,41999999999,https://exemplo.com,Alimentação,Rua Exemplo 1,Curitiba,PR,4.5,Ativo,"Sábado | Atendimento 24 horas",https://maps.google.com/,,,\n';
    downloadBlob(new Blob(['\uFEFF' + template], { type: 'text/csv;charset=utf-8;' }), 'modelo-importacao-leads.csv');
  });
  importLeadsFile?.addEventListener('change', async () => {
    const file = importLeadsFile.files?.[0];
    if (!file) return;
    importLeadsBtn.disabled = true;
    importLeadsBtn.textContent = 'Importando...';
    try {
      const rows = await readLeadImportFile(file);
      const normalized = rows.map((row, index) => normalizeImportedLead(row, index)).filter(Boolean);
      const ignored = rows.length - normalized.length;
      if (!normalized.length) throw new Error('Nenhum lead válido foi encontrado no arquivo.');
      const existingKeys = new Set(currentLeads.flatMap(getIdentityKeys));
      const duplicates = normalized.filter(lead => getIdentityKeys(lead).some(key => existingKeys.has(key))).length;
      const confirmed = confirm(`O arquivo contém ${normalized.length} lead(s). ${duplicates} possível(is) duplicidade(s) e ${ignored} registro(s) inválido(s). Deseja continuar?`);
      if (!confirmed) return;
      const importKey = `leads_import_${Date.now()}`;
      const cleanRows = normalized.map(({ _executionId, ...lead }) => lead);
      await chrome.storage.local.set({ [importKey]: cleanRows });
      await loadData();
      alert(`Importação concluída. ${normalized.length} lead(s) processado(s), ${duplicates} duplicidade(s) detectada(s) e ${ignored} registro(s) ignorado(s).`);
    } catch (error) {
      console.error('[M2y] Falha na importação:', error);
      alert(`Não foi possível importar o arquivo: ${error.message}`);
    } finally {
      importLeadsBtn.disabled = false;
      importLeadsBtn.textContent = '⬆ Importar';
      importLeadsFile.value = '';
    }
  });

  async function readLeadImportFile(file) {
    const extension = file.name.toLowerCase().split('.').pop();
    if (extension === 'json') {
      const parsed = JSON.parse(await file.text());
      const rows = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.leads) ? parsed.leads : []);
      if (!rows.length) throw new Error('O JSON não contém uma lista de leads.');
      return rows;
    }
    if (extension === 'xlsx') {
      if (typeof XLSX === 'undefined') throw new Error('O módulo XLSX não está disponível.');
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    }
    if (extension === 'csv') return parseLeadCsv(await file.text());
    throw new Error('Formato não suportado. Use JSON, CSV ou XLSX.');
  }

  function parseLeadCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') { field += '"'; i += 1; continue; }
      if (char === '"') { quoted = !quoted; continue; }
      if (!quoted && (char === ',' || char === ';' || char === '\t')) { row.push(field.trim()); field = ''; continue; }
      if (!quoted && (char === '\n' || char === '\r')) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(field.trim()); field = '';
        if (row.some(value => value !== '')) rows.push(row);
        row = [];
        continue;
      }
      field += char;
    }
    row.push(field.trim());
    if (row.some(value => value !== '')) rows.push(row);
    if (rows.length < 2) return [];
    const headers = rows.shift().map(value => normalizeImportHeader(value));
    return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }

  function normalizeImportHeader(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function normalizeImportedLead(raw, index) {
    const row = {};
    Object.entries(raw || {}).forEach(([key, value]) => { row[normalizeImportHeader(key)] = Array.isArray(value) ? value.join(' | ') : String(value ?? '').trim(); });
    const pick = (...keys) => keys.map(key => row[normalizeImportHeader(key)]).find(value => value);
    const lead = {
      name: pick('name', 'nome', 'empresa', 'estabelecimento', 'business_name') || '',
      phone: pick('phone', 'telefone', 'tel', 'whatsapp') || 'N/A',
      website: pick('website', 'site', 'url') || 'N/A',
      category_macro: pick('category_macro', 'categoria_macro', 'categoria', 'category') || 'N/A',
      category_main: pick('category_main', 'categoria_principal') || '',
      address: pick('address', 'endereco', 'logradouro') || 'N/A',
      city: pick('city', 'cidade', 'municipio') || 'N/A',
      state: pick('state', 'uf', 'estado') || 'N/A',
      rating_value: pick('rating_value', 'rating', 'nota', 'avaliacao') || '0',
      rating_formatted: pick('rating_formatted', 'avaliacao_formatada', 'nota_formatada') || pick('rating', 'nota') || 'N/A',
      digital_presence: pick('digital_presence', 'presenca_digital', 'presenca') || 'Não',
      status: pick('status', 'situacao') || 'Ativo',
      hours: pick('hours', 'horarios', 'horario', 'opening_hours') || 'N/A',
      google_maps_url: pick('google_maps_url', 'google_maps', 'maps_url', 'url_google_maps') || `imported:${Date.now()}:${index}`,
      social_instagram: pick('social_instagram', 'instagram') || '',
      social_facebook: pick('social_facebook', 'facebook') || '',
      emails: pick('emails', 'email', 'e_mail') || '',
      extracted_at: pick('extracted_at', 'extraido_em', 'data_extracao') || new Date().toISOString(),
      _executionId: `import_${Date.now()}`
    };
    if (!lead.name && lead.phone === 'N/A' && lead.website === 'N/A' && lead.address === 'N/A') return null;
    return lead;
  }

  function updateQualityAndDuplicates(leads) {
    const score = lead => { let points = 0; [['name',10],['category_main',10],['address',10],['phone',15],['website',15],['hours',10],['rating_value',10],['screenshot',10],['digital_presence',10]].forEach(([key, value]) => { if (lead[key] && lead[key] !== 'N/A') points += value; }); return points; };
    const average = leads.length ? Math.round(leads.reduce((sum, lead) => sum + score(lead), 0) / leads.length) : 0;
    const quality = document.getElementById('qualitySummary'); if (quality) quality.innerHTML = `<div class="quality-score"><strong>${average}/100</strong><span>qualidade média dos perfis</span></div><p>${leads.filter(l => score(l) < 60).length} perfil(is) com qualidade abaixo de 60. Abra a aba de perfil para ver os campos ausentes.</p>`;
    const groups = new Map(); leads.forEach(l => { const key = (l.phone && l.phone !== 'N/A' ? l.phone : `${l.name || ''}|${l.address || ''}`).toLowerCase().replace(/\D/g, ''); if (!key) return; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(l); });
    const duplicates = [...groups.values()].filter(g => g.length > 1); const target = document.getElementById('duplicateGroups'); if (target) target.innerHTML = duplicates.length ? duplicates.map(g => `<div class="duplicate-group"><strong>Possível duplicidade (${g.length})</strong><span>${g.map(l => escapeHtml(l.name || 'Sem nome')).join(' · ')}</span></div>`).join('') : '<p>Nenhuma duplicidade provável encontrada.</p>';
  }

  addCompareProfile?.addEventListener('click', () => { const lead = currentLeads[Number(profileSelect?.value)]; if (!lead || comparedLeads.some(l => (l.id_interno || l.name) === (lead.id_interno || lead.name))) return; comparedLeads.push(lead); renderComparison(); });
  clearCompare?.addEventListener('click', () => { comparedLeads = []; renderComparison(); });
  function renderComparison() { if (!comparePanel || !compareGrid) return; comparePanel.classList.toggle('hidden', comparedLeads.length === 0); compareGrid.innerHTML = comparedLeads.map(l => `<article class="compare-card"><h4>${escapeHtml(l.name || 'N/A')}</h4><p><b>Nota:</b> ${escapeHtml(l.rating_formatted || 'N/A')}</p><p><b>Telefone:</b> ${escapeHtml(l.phone || 'N/A')}</p><p><b>Presença:</b> ${escapeHtml(l.digital_presence || 'N/A')}</p><p><b>Horários:</b><br>${escapeHtml(l.hours || 'N/A')}</p><p><b>Qualidade:</b> ${l.website && l.phone && l.hours ? 'Completo' : 'Revisar dados'}</p></article>`).join(''); }

  function updateProfileSelector(leads) {
    if (!profileSelect) return;
    const selected = profileSelect.value;
    profileSelect.innerHTML = '<option value="">Nenhum perfil selecionado</option>' + leads.map((lead, index) =>
      `<option value="${index}">${escapeHtml(lead.name || 'Perfil sem nome')} — ${escapeHtml(lead.city || 'Cidade não informada')}</option>`
    ).join('');
    if (leads[selected]) profileSelect.value = selected;
    profileSelect.onchange = () => renderProfileDetail(leads[Number(profileSelect.value)]);
    if (profileSelect.value) renderProfileDetail(leads[Number(profileSelect.value)]);
  }

  function renderProfileDetail(lead) {
    if (!profileDetail) return;
    if (!lead) { profileDetail.className = 'profile-detail empty-profile'; profileDetail.textContent = 'Selecione um lead para visualizar todos os dados coletados.'; return; }
    profileDetail.className = 'profile-detail';
    const field = (label, value) => `<div class="profile-field"><span>${label}</span><strong>${escapeHtml(value ?? 'N/A')}</strong></div>`;
    profileDetail.innerHTML = `<div class="profile-detail-header"><div><h2>${escapeHtml(lead.name || 'N/A')}</h2><p>${escapeHtml(lead.category_main || 'Categoria não informada')} · ${escapeHtml(lead.city || 'Cidade não informada')} - ${escapeHtml(lead.state || 'UF')}</p></div>${lead.screenshot ? `<img class="profile-screenshot" src="${escapeHtml(lead.screenshot)}" alt="Screenshot do perfil">` : '<div class="no-screenshot">Screenshot não disponível</div>'}</div><div class="profile-section"><h3>Contato e presença digital</h3><div class="profile-grid">${field('Telefone', lead.phone)}${field('Website', lead.website)}${field('E-mails', lead.emails)}${field('Instagram', lead.social_instagram)}${field('Facebook', lead.social_facebook)}${field('Presença digital', lead.digital_presence)}</div></div><div class="profile-section"><h3>Reputação e operação</h3><div class="profile-grid">${field('Avaliação', lead.rating_formatted)}${field('Total de avaliações', lead.reviews_count)}${field('Status', lead.status)}${field('Horários', lead.hours)}${field('Categoria macro', lead.category_macro)}${field('Extraído em', lead.extracted_at)}${field('Score de qualidade', `${Number(lead.quality_score || 0)}/100`)}${field('Campos ausentes', (lead.missing_fields || []).map(item => item.name || item).join(', ') || 'Nenhum')}${field('Revisão', lead.reviewed ? 'Revisado' : 'Pendente')}</div></div><div class="profile-section"><h3>Localização</h3><div class="profile-grid">${field('Endereço', lead.address)}${field('Cidade/UF', `${lead.city || 'N/A'} - ${lead.state || 'N/A'}`)}${field('Latitude', lead.latitude)}${field('Longitude', lead.longitude)}${field('Plus Code', lead.plus_code)}${field('URL Google Maps', lead.google_maps_url)}</div></div><div class="profile-section"><h3>Descrição</h3><p class="profile-description">${escapeHtml(lead.description || 'N/A')}</p></div>`;
  }

  // ============================================================
  // RENDER REDES SOCIAIS
  // ============================================================
  function renderSocialLinks(lead) {
    const links = [];
    if (lead.website && lead.website !== 'N/A') {
      links.push(`<a href="${lead.website}" target="_blank" class="social-icon" title="${escapeHtml(lead.website)}">${SocialIcons.website}</a>`);
    }
    if (lead.social_facebook) {
      links.push(`<a href="${lead.social_facebook}" target="_blank" class="social-icon" title="${escapeHtml(lead.social_facebook)}">${SocialIcons.facebook}</a>`);
    }
    if (lead.social_instagram) {
      links.push(`<a href="${lead.social_instagram}" target="_blank" class="social-icon" title="${escapeHtml(lead.social_instagram)}">${SocialIcons.instagram}</a>`);
    }
    if (lead.social_others && Array.isArray(lead.social_others)) {
      lead.social_others.forEach(url => {
        if (url.includes('linkedin.com')) {
          links.push(`<a href="${url}" target="_blank" class="social-icon" title="${escapeHtml(url)}">${SocialIcons.linkedin}</a>`);
        }
      });
    }
    return links.length > 0 ? links.join(' ') : '<span class="not-found">—</span>';
  }

  // ============================================================
  // RENDER TABELA DE LEADS
  // ============================================================
  function renderLeadsTable(leads) {
    leadsTableBody.innerHTML = '';
    leads.forEach((lead, index) => {
      const tr = document.createElement('tr');
      const socialLinks = renderSocialLinks(lead);

      // Coloração de avaliação
      const ratingVal = parseFloat(lead.rating_value) || 0;
      const ratingClass = ratingVal >= 4.5 ? 'rating-high' : ratingVal >= 3.5 ? 'rating-mid' : ratingVal > 0 ? 'rating-low' : '';
      const presenceClass = lead.digital_presence === 'Sim' ? 'presence-yes' : 'presence-no';
      const statusClass   = lead.status === 'Ativo' ? 'status-active' : 'status-closed';
      const leadKey = `${lead._executionId || ''}::${lead.google_maps_url || lead.id_interno || lead.name || index}`;
      const nameValue = lead.name || '';
      const phoneValue = lead.phone || 'N/A';
      const categoryValue = lead.category_macro || lead.category_main || 'N/A';
      const cityValue = `${lead.city || 'N/A'} - ${lead.state || 'N/A'}`;
      const ratingValue = lead.rating_formatted || 'N/A';
      const presenceValue = lead.digital_presence || 'Não';
      const statusValue = lead.status || 'Ativo';
      const hoursValue = lead.hours || 'N/A';
      const hoursDisplay = formatHoursForDisplay(hoursValue);

      tr.innerHTML = `
        <td class="select-col"><input type="checkbox" class="lead-select" data-key="${escapeHtml(leadKey)}" ${selectedLeadKeys.has(leadKey) ? 'checked' : ''} aria-label="Selecionar ${escapeHtml(nameValue || 'lead')}"></td>
        <td contenteditable="true" data-field="name" title="${escapeHtml(nameValue || 'N/A')}">${escapeHtml(nameValue)}</td>
        <td class="phone-cell" title="${escapeHtml(phoneValue)}"><div class="cell-content phone-content">
          <span contenteditable="true" data-field="phone" title="${escapeHtml(phoneValue)}">${escapeHtml(phoneValue)}</span>
          ${lead.phone && lead.phone !== 'N/A' ? `<button class="copy-btn" data-text="${escapeHtml(lead.phone)}" title="Copiar telefone">Copiar</button>` : ''}
        </div></td>
        <td contenteditable="true" data-field="category_macro" title="${escapeHtml(categoryValue)}">${escapeHtml(categoryValue)}</td>
        <td contenteditable="true" data-field="city" title="${escapeHtml(cityValue)}">${escapeHtml(cityValue)}</td>
        <td contenteditable="true" data-field="rating_formatted" class="${ratingClass}" title="${escapeHtml(ratingValue)}">${escapeHtml(ratingValue)}</td>
        <td contenteditable="true" data-field="digital_presence" class="${presenceClass}" title="${escapeHtml(presenceValue)}">${escapeHtml(presenceValue)}</td>
        <td class="social-cell"><div class="cell-content social-content">${socialLinks}</div></td>
        <td contenteditable="true" data-field="status" class="${statusClass}" title="${escapeHtml(statusValue)}">${escapeHtml(statusValue)}</td>
        <td contenteditable="true" data-field="hours" class="hours-cell" title="${escapeHtml(hoursValue)}">${escapeHtml(hoursDisplay)}</td>
        <td class="action-cell"><div class="cell-content action-content">
          <button class="copy-row-btn" data-index="${index}" title="Copiar linha">Copiar</button>
          <button class="view-ss-btn${lead.screenshot ? '' : ' is-unavailable'}" data-ss="${lead.screenshot || ''}" title="${lead.screenshot ? 'Ver Screenshot' : 'Screenshot indisponível'}" ${lead.screenshot ? '' : 'disabled'}>Screenshot</button>
          <button class="delete-row-btn" data-url="${escapeHtml(lead.google_maps_url)}" data-exec="${lead._executionId}" title="Excluir lead">Excluir</button>
        </div></td>
      `;
      leadsTableBody.appendChild(tr);
    });

    document.querySelectorAll('#leadsTable tbody td[title]').forEach(cell => cell.addEventListener('click', async (event) => {
      if (!event.altKey || cell.classList.contains('action-cell') || cell.classList.contains('select-col')) return;
      const fullValue = cell.getAttribute('title');
      if (!fullValue || fullValue === 'N/A') return;
      await navigator.clipboard.writeText(fullValue);
      const previousTitle = cell.getAttribute('title');
      cell.setAttribute('title', 'Copiado');
      setTimeout(() => cell.setAttribute('title', previousTitle), 1000);
    }));

    document.querySelectorAll('.lead-select').forEach(box => box.addEventListener('change', () => {
      if (box.checked) selectedLeadKeys.add(box.dataset.key); else selectedLeadKeys.delete(box.dataset.key);
      updateBulkState();
    }));

    // Salvar edições inline
    document.querySelectorAll('td[contenteditable="true"], span[contenteditable="true"]').forEach(cell => {
      cell.addEventListener('blur', async () => {
        const row    = cell.closest('tr');
        const delBtn = row.querySelector('.delete-row-btn');
        if (!delBtn) return;
        const url    = delBtn.getAttribute('data-url');
        const execId = delBtn.getAttribute('data-exec');
        const field  = cell.getAttribute('data-field');
        const newVal = cell.textContent.trim();
        cell.setAttribute('title', newVal || 'N/A');
        const key    = `leads_${execId}`;
        const data   = await chrome.storage.local.get(key);
        if (data[key]) {
          const previous = data[key].find(l => l.google_maps_url === url);
          const updated = data[key].map(l => l.google_maps_url === url ? { ...l, [field]: newVal, updated_at: new Date().toISOString() } : l);
          await chrome.storage.local.set({ [key]: updated });
          if (previous && previous[field] !== newVal) {
            const historyKey = `history_${execId}`;
            const savedHistory = await chrome.storage.local.get(historyKey);
            const history = savedHistory[historyKey] || [];
            history.push({ url, field, before: previous[field], after: newVal, changed_at: new Date().toISOString() });
            await chrome.storage.local.set({ [historyKey]: history.slice(-500) });
          }
        }
      });
    });

    // Copiar telefone
    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(btn.getAttribute('data-text')).then(() => {
          btn.textContent = '✅';
          setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
        });
      });
    });

    // Copiar linha completa
    document.querySelectorAll('.copy-row-btn').forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const lead = leads[idx];
        const text = `Nome: ${lead.name}\nTel: ${lead.phone || 'N/A'}\nCat: ${lead.category_main || 'N/A'}\nNota: ${lead.rating_formatted || 'N/A'}\nEnd: ${lead.address || 'N/A'}\nHorários: ${lead.hours || 'N/A'}\nURL: ${lead.google_maps_url}`;
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = '✅';
          setTimeout(() => { btn.textContent = 'Copiar'; }, 2000);
        });
      });
    });

    // Ver screenshot
    document.querySelectorAll('.view-ss-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ss = btn.getAttribute('data-ss');
        if (!ss || !/^data:image\/(png|jpeg|jpg);base64,/i.test(ss)) return alert('Screenshot indisponível ou inválido.');
        const win = window.open('', '_blank', 'noopener,noreferrer');
        if (!win) return downloadBlob(dataUrlToBlob(ss), `screenshot-${Date.now()}.jpg`);
        win.document.title = 'Screenshot do lead';
        win.document.body.style.margin = '0';
        const image = win.document.createElement('img'); image.src = ss; image.alt = 'Screenshot do lead'; image.style.cssText = 'display:block;max-width:100%;height:auto;margin:auto;';
        win.document.body.appendChild(image);
      });
    });

    // Excluir lead
    document.querySelectorAll('.delete-row-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url    = btn.getAttribute('data-url');
        const execId = btn.getAttribute('data-exec');
        if (confirm('Deseja excluir este lead permanentemente?')) {
          const key  = `leads_${execId}`;
          const data = await chrome.storage.local.get(key);
          if (data[key]) {
            const updated = data[key].filter(l => l.google_maps_url !== url);
            if (updated.length === 0) {
              await chrome.storage.local.remove([key, `logs_${execId}`, `metrics_${execId}`]);
            } else {
              await chrome.storage.local.set({ [key]: updated });
            }
            loadData();
          }
        }
      });
    });
  }

  // ============================================================
  // LOGS
  // ============================================================
  function updateLogs(logs) {
    const wasAtBottom = logList.scrollHeight - logList.scrollTop <= logList.clientHeight + 50;

    // Contadores
    let infoCount = 0, warnCount = 0, errCount = 0;
    logs.forEach(l => {
      if (l.level === 'INFO')    infoCount++;
      if (l.level === 'WARNING') warnCount++;
      if (l.level === 'ERROR')   errCount++;
    });
    if (logTotal) logTotal.textContent = logs.length;
    if (logInfo)  logInfo.textContent  = infoCount;
    if (logWarn)  logWarn.textContent  = warnCount;
    if (logError) logError.textContent = errCount;

    logList.innerHTML = '';
    [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 500)
        .forEach(log => {
          const div = document.createElement('div');
          div.className = 'log-item';

          let detailsText = '';
          if (log.event === 'delay_started') {
            detailsText = `Aguardando ${log.details?.duration_seconds || '?'}s...`;
          } else if (log.event === 'delay_finished') {
            detailsText = `Próxima: #${log.details?.next_extraction || '?'}`;
          } else if (log.event === 'data_collected') {
            detailsText = `${log.details?.name || '?'} | Tel: ${log.details?.phone || 'N/A'} | Nota: ${log.details?.rating || 'N/A'}`;
          } else if (log.event === 'screenshot_captured') {
            detailsText = log.details?.filename || '';
          } else if (log.event === 'blocking_detected') {
            detailsText = `⚠ Bloqueio detectado! Score: ${log.details?.score || '?'}`;
          } else {
            detailsText = JSON.stringify(log.details || {}).slice(0, 100);
          }

          div.innerHTML = `
            <span class="log-time">[${formatTimestamp(new Date(log.timestamp))}]</span>
            <span class="log-level ${log.level}">${log.level}</span>
            <span class="log-event">${log.event}</span>
            <span class="log-details">${escapeHtml(detailsText)}</span>
          `;
          logList.appendChild(div);
        });

    if (wasAtBottom) logList.scrollTop = logList.scrollHeight;
  }

  // Salvar log como arquivo
  saveLogBtn?.addEventListener('click', () => {
    if (currentLogs.length === 0) return alert('Nenhum log disponível.');
    let txt = `M2y v2.10.2 - LOG DO SISTEMA\n${'='.repeat(50)}\n`;
    txt += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
    currentLogs.forEach(l => {
      txt += `[${l.timestamp}] [${l.level}] ${l.event}: ${JSON.stringify(l.details || {})}\n`;
    });
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `m2y_log_${Date.now()}.txt`);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // ============================================================
  // NOME INTELIGENTE DE ARQUIVO
  // ============================================================
  async function buildSmartFilename(ext) {
    const { lastSearch } = await chrome.storage.local.get('lastSearch');
    const cat   = (lastSearch?.category || 'leads').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 20);
    const city  = (lastSearch?.city     || 'cidade').replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 15);
    const state = lastSearch?.state || 'UF';
    const count = currentLeads.length;
    const date  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `${cat}_${city}_${state}_${count}leads_${date}.${ext}`;
  }

  // ============================================================
  // EXPORTAÇÃO CSV
  // ============================================================
  exportCsvBtn.addEventListener('click', async () => {
    if (currentLeads.length === 0) return alert('Nenhum dado para exportar.');
    const headers = ['ID Interno', 'Nome', 'Telefone', 'Website', 'E-mails', 'Instagram', 'Facebook', 'Presença Digital', 'Cidade', 'Estado', 'Endereço', 'Categoria Principal', 'Macro Categoria', 'Avaliação', 'Nota', 'Avaliações', 'Horários', 'Status', 'Latitude', 'Longitude', 'URL Maps', 'Data'];
    const rows = [headers.join(',')];
    currentLeads.forEach(l => {
      const row = [
        `"${l.id_interno || ''}"`,
        `"${l.name || ''}"`,
        `"${l.phone || ''}"`,
        `"${l.website || ''}"`,
        `"${l.emails || ''}"`,
        `"${l.social_instagram || ''}"`,
        `"${l.social_facebook || ''}"`,
        `"${l.digital_presence || ''}"`,
        `"${l.city || ''}"`,
        `"${l.state || ''}"`,
        `"${(l.address || '').replace(/"/g, '""')}"`,
        `"${l.category_main || ''}"`,
        `"${l.category_macro || ''}"`,
        `"${l.rating_formatted || ''}"`,
        `"${l.rating_value || ''}"`,
        `"${l.reviews_count || ''}"`,
        `"${(l.hours || '').replace(/"/g, '""')}"`,
        `"${l.status || ''}"`,
        `"${l.latitude || ''}"`,
        `"${l.longitude || ''}"`,
        `"${l.google_maps_url || ''}"`,
        `"${l.extracted_at || ''}"`
      ];
      rows.push(row.join(','));
    });
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, await buildSmartFilename('csv'));
  });

  // ============================================================
  // EXPORTAÇÃO XLSX
  // ============================================================
  exportXlsxBtn.addEventListener('click', async () => {
    if (currentLeads.length === 0) return alert('Nenhum dado para exportar.');
    if (typeof XLSX === 'undefined') return alert('Biblioteca XLSX não carregada.');

    const headers = ['ID', 'Nome', 'Telefone', 'Website', 'E-mails', 'Instagram', 'Facebook', 'Presença Digital', 'Cidade', 'Estado', 'Endereço', 'Categoria', 'Macro Cat.', 'Avaliação', 'Nota', 'Avaliações', 'Horários', 'Status', 'Lat', 'Lng', 'URL Maps', 'Data'];
    const wsData = [
      headers,
      ...currentLeads.map(l => [
        l.id_interno || '',
        l.name || '',
        l.phone || '',
        l.website || '',
        l.emails || '',
        l.social_instagram || '',
        l.social_facebook || '',
        l.digital_presence || '',
        l.city || '',
        l.state || '',
        l.address || '',
        l.category_main || '',
        l.category_macro || '',
        l.rating_formatted || '',
        l.rating_value || '',
        l.reviews_count || '',
        l.hours || '',
        l.status || '',
        l.latitude || '',
        l.longitude || '',
        l.google_maps_url || '',
        l.extracted_at || ''
      ])
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Larguras de coluna
    ws['!cols'] = [
      {wch:12},{wch:30},{wch:16},{wch:30},{wch:25},{wch:30},{wch:30},
      {wch:14},{wch:18},{wch:6},{wch:40},{wch:20},{wch:15},{wch:25},
      {wch:6},{wch:10},{wch:40},{wch:10},{wch:10},{wch:10},{wch:50},{wch:22}
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads M2y');
    XLSX.writeFile(wb, await buildSmartFilename('xlsx'));
  });

  // ============================================================
  // EXPORTAÇÃO JSON
  // ============================================================
  exportJsonBtn?.addEventListener('click', async () => {
    const data = await chrome.storage.local.get(null);
    const exportData = { leads: currentLeads, logs: [], metrics: [] };
    Object.keys(data).forEach(key => {
      if (key.startsWith('logs_'))    exportData.logs.push(...data[key]);
      if (key.startsWith('metrics_')) exportData.metrics.push(data[key]);
    });
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, await buildSmartFilename('json'));
  });

  // ============================================================
  // EXPORTAÇÃO TXT
  // ============================================================
  exportTxtBtn?.addEventListener('click', async () => {
    if (currentLeads.length === 0) return alert('Nenhum dado para exportar.');
    let txt = `M2y v2.10.2 - RELATÓRIO DE LEADS\n${'='.repeat(50)}\n`;
    txt += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    txt += `Total de leads: ${currentLeads.length}\n\n`;

    currentLeads.forEach((l, i) => {
      txt += `LEAD #${i + 1}\n${'-'.repeat(30)}\n`;
      txt += `Nome: ${l.name}\n`;
      txt += `Categoria: ${l.category_main || 'N/A'} (${l.category_macro || 'N/A'})\n`;
      txt += `Telefone: ${l.phone || 'N/A'}\n`;
      txt += `E-mails: ${l.emails || 'N/A'}\n`;
      txt += `Website: ${l.website || 'N/A'}\n`;
      txt += `Instagram: ${l.social_instagram || 'N/A'}\n`;
      txt += `Facebook: ${l.social_facebook || 'N/A'}\n`;
      txt += `Endereço: ${l.address || 'N/A'}\n`;
      txt += `Cidade/UF: ${l.city || 'N/A'} - ${l.state || 'N/A'}\n`;
      txt += `Avaliação: ${l.rating_formatted || 'N/A'}\n`;
      txt += `Horários: ${l.hours || 'N/A'}\n`;
      txt += `Status: ${l.status || 'N/A'}\n`;
      txt += `Coordenadas: ${l.latitude || 'N/A'}, ${l.longitude || 'N/A'}\n`;
      txt += `URL Maps: ${l.google_maps_url}\n`;
      txt += `Extraído em: ${l.extracted_at}\n\n`;
    });

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    downloadBlob(blob, await buildSmartFilename('txt'));
  });

  // ============================================================
  // LIMPAR DADOS
  // ============================================================
  clearDataBtn?.addEventListener('click', async () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os leads, logs e estatísticas permanentemente. Deseja continuar?')) {
      await chrome.storage.local.clear();
      await chrome.storage.local.set({
        config: {
          max_leads: 15,
          delay_between_requests_ms: 2000,
          delay_min_s: 2,
          delay_max_s: 5,
          timeout_ms: 30000,
          max_scroll_attempts: 50
        }
      });
      document.querySelectorAll('.col-filter').forEach(input => input.value = '');
      filters = { name: '', phone: '', category_macro: '', city: '', digital_presence: '', status: '', ratingMin: null, ratingMax: null };
      globalFilter = '';
      if (globalLeadSearch) globalLeadSearch.value = '';
      loadData();
    }
  });

  // ============================================================
  // FECHAR RELATÓRIO
  // ============================================================
  document.getElementById('closeReport')?.addEventListener('click', () => {
    document.getElementById('completionReport').classList.add('hidden');
  });

  // ============================================================
  // REDIMENSIONAMENTO DE COLUNAS (ESTILO EXCEL)
  // ============================================================
  initColumnResizing();

  function initColumnResizing() {
    const table = document.getElementById('leadsTable');
    const headerCells = table.querySelectorAll('thead tr:first-child th');

    headerCells.forEach((th, index) => {
      const resizer = document.createElement('div');
      resizer.className = 'resizer';
      th.appendChild(resizer);

      let startX, startWidth;

      resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startX = e.pageX;
        startWidth = th.offsetWidth;
        th.classList.add('resizing');

        const onMouseMove = (e) => {
          const diff = e.pageX - startX;
          const newWidth = Math.max(50, startWidth + diff);
          th.style.width = newWidth + 'px';
          const rows = table.querySelectorAll('tbody tr');
          rows.forEach(row => {
            const cell = row.cells[index];
            if (cell) cell.style.width = newWidth + 'px';
          });
        };

        const onMouseUp = () => {
          th.classList.remove('resizing');
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  // ============================================================
  // RELATÓRIO DE CONCLUSÃO
  // ============================================================
  async function showCompletionReport(executionId) {
    const data = await chrome.storage.local.get(null);
    const leads   = data[`leads_${executionId}`]   || [];
    const metrics = data[`metrics_${executionId}`] || {};
    const ssCount = leads.filter(l => l.screenshot).length;

    document.getElementById('reportTotalLeads').textContent      = leads.length;
    document.getElementById('reportTotalTime').textContent       = `${(metrics.durationSeconds || 0).toFixed(0)}s`;
    document.getElementById('reportTotalScreenshots').textContent = ssCount;
    document.getElementById('completionReport').classList.remove('hidden');
  }

  // ============================================================
  // LISTENERS EM TEMPO REAL
  // ============================================================
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'ui_update') {
      loadData();
      sidebarStatus.textContent = `Extraindo... (${message.count} leads)`;
      sidebarDot.style.background = '#2563eb';
    } else if (message.action === 'ui_finished') {
      setTimeout(() => {
        loadData();
        showCompletionReport(message.executionId);
        sidebarStatus.textContent = 'Extração concluída';
        sidebarDot.style.background = '#22c55e';
      }, 1000);
    } else if (message.action === 'ui_blocked') {
      sidebarStatus.textContent = '⚠ Bloqueio detectado!';
      sidebarDot.style.background = '#ef4444';
    }
  });

  loadDashboardSettings();
  // ============================================================
  // UTILITÁRIOS
  // ============================================================
  function downloadBlob(blob, filename) {
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function dataUrlToBlob(dataUrl) {
    const [meta, raw] = dataUrl.split(',');
    const bytes = atob(raw); const buffer = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) buffer[i] = bytes.charCodeAt(i);
    return new Blob([buffer], { type: meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg' });
  }

  function formatHoursForDisplay(value) {
    if (!value || /^n\/a$/i.test(String(value).trim())) return 'N/A';
    let text = String(value).replace(/[\uE000-\uF8FF�]/g, ' ').replace(/\r/g, '').trim();
    text = text.replace(/\s*\n+\s*/g, '\n').replace(/\s*\|\s*/g, ' | ');
    text = text.replace(/(domingo|segunda|terça|quarta|quinta|sexta|sábado)\s*[–—-]\s*feira/gi, '$1-feira');
    const days = ['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
    const dayPattern = new RegExp(`(${days.join('|')})`, 'gi');
    const matches = [...text.matchAll(dayPattern)];
    if (!matches.length) return text.replace(/\s+/g, ' ').trim();
    return matches.map((match, index) => {
      const day = match[1].toLowerCase().replace(/(^|[- ])([a-záéíóúãõç])/g, (_, prefix, letter) => prefix + letter.toUpperCase());
      const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
      let suffix = text.slice(match.index + match[0].length, end).replace(/^[\s,:;|–-]+/, '').replace(/\s+/g, ' ').trim();
      const holiday = suffix.match(/\(([^)]+)\)/)?.[1];
      const ranges = suffix.match(/\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})*/);
      if (ranges) suffix = ranges[0].replace(/\s*[–-]\s*/g, '–');
      if (/24\s*horas|24h/i.test(suffix)) suffix = 'Atendimento 24 horas';
      if (/fechado|closed/i.test(suffix)) suffix = 'Fechado';
      return `${day}${holiday ? ` (${holiday})` : ''} | ${suffix || 'Atendimento não informado'}`;
    }).join('\n');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(str, max) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  // ============================================================
  // INICIALIZAÇÃO
  // ============================================================
    const urlParams       = new URLSearchParams(window.location.search);
  const autoShowReport  = urlParams.get('showReport');
  const executionId     = urlParams.get('executionId');
  loadData();
  loadProgressState();
  if (autoShowReport === 'true' && executionId) {
    setTimeout(() => showCompletionReport(executionId), 1500);
  }
  setInterval(loadData, 3000);;
});
